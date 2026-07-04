const { pool } = require("../config/db");
const {
  getSeatPosition,
  getSeatType,
} = require("../utils/checkoutPricing");
const {
  HOLD_WINDOW_MINUTES,
  cleanupExpiredReservations,
  releaseSeatIfNeeded,
} = require("../services/seatHoldService");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DODO_PROVIDER = "dodo_payments";
const DODO_TEST_BASE_URL = "https://test.dodopayments.com";
const DODO_LIVE_BASE_URL = "https://live.dodopayments.com";
const DODO_SUCCESS_STATUSES = new Set(["succeeded"]);
const DODO_FAILURE_STATUSES = new Set(["failed", "cancelled"]);
const DODO_PRODUCT_CACHE_TTL_MS = 5 * 60 * 1000;

let dodoProductCache = null;

const normalizeEmail = (value = "") => value.trim().toLowerCase();
const normalizeText = (value = "") => value.trim();
const normalizePaymentStatus = (value = "") => normalizeText(value).toLowerCase();
const sleep = (durationMs) => new Promise((resolve) => setTimeout(resolve, durationMs));

const normalizePhone = (value = "") => {
  const trimmedValue = normalizeText(value);
  const digitsOnly = trimmedValue.replace(/\D/g, "");

  if (!digitsOnly) {
    return "";
  }

  if (trimmedValue.startsWith("+")) {
    return `+${digitsOnly}`;
  }

  if (digitsOnly.length === 10) {
    return `+91${digitsOnly}`;
  }

  return `+${digitsOnly}`;
};

const getDodoBaseUrl = () => {
  const configuredEnvironment = normalizeText(process.env.DODO_PAYMENTS_ENV || "test_mode").toLowerCase();
  return configuredEnvironment === "live_mode" ? DODO_LIVE_BASE_URL : DODO_TEST_BASE_URL;
};

const getDodoConfig = () => {
  const apiKey = normalizeText(process.env.DODO_PAYMENTS_API_KEY || "");
  const productId = normalizeText(process.env.DODO_PAYMENTS_PRODUCT_ID || "");

  if (!apiKey || !productId) {
    const error = new Error(
      "Dodo Payments is not configured. Set DODO_PAYMENTS_API_KEY and DODO_PAYMENTS_PRODUCT_ID before checkout."
    );
    error.statusCode = 500;
    throw error;
  }

  return {
    apiKey,
    productId,
  };
};

const getFrontendBaseUrl = () => {
  const explicitCheckoutOrigin = normalizeText(process.env.CHECKOUT_RETURN_ORIGIN || "");

  if (explicitCheckoutOrigin) {
    return explicitCheckoutOrigin.replace(/\/$/, "");
  }

  const configuredOrigins = (process.env.FRONTEND_ORIGIN || "http://localhost:5001")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return (configuredOrigins[0] || "http://localhost:5001").replace(/\/$/, "");
};

const buildBookingReference = () => {
  const randomSuffix = Math.floor(Math.random() * 900 + 100);
  return `FV${Date.now().toString(36)}${randomSuffix}`.toUpperCase();
};

const buildReceipt = (bookingReference) => `fv_${bookingReference.toLowerCase()}`.slice(0, 40);

const buildCheckoutReturnUrl = ({ flightId, bookingId }) => {
  const query = new URLSearchParams({ bookingId: String(bookingId) });
  return `${getFrontendBaseUrl()}/checkout/${flightId}?${query.toString()}`;
};

const resolveFlightSnapshot = (booking) => {
  if (booking.flight_snapshot && Object.keys(booking.flight_snapshot).length > 0) {
    return booking.flight_snapshot;
  }

  return {
    id: booking.flight_id,
    source: booking.source,
    destination: booking.destination,
    departure_time: booking.departure_time,
    arrival_time: booking.arrival_time,
    price: booking.flight_price,
  };
};

const resolveHoldExpiresAt = (booking) => {
  if (booking.hold_expires_at) {
    return new Date(booking.hold_expires_at);
  }

  return new Date(new Date(booking.created_at).getTime() + HOLD_WINDOW_MINUTES * 60 * 1000);
};

const updatePaymentState = async ({
  client,
  bookingId,
  status,
  paymentId = null,
  paymentMethod = null,
  markVerified = false,
  notes = null,
}) => {
  await client.query(
    `
      UPDATE payments
      SET status = $1,
          provider_payment_id = COALESCE($2, provider_payment_id),
          provider_method = COALESCE($3, provider_method),
          notes = CASE
            WHEN $4::jsonb IS NULL THEN notes
            ELSE COALESCE(notes, '{}'::jsonb) || $4::jsonb
          END,
          verified_at = CASE
            WHEN $5 THEN CURRENT_TIMESTAMP
            ELSE verified_at
          END,
          updated_at = CURRENT_TIMESTAMP
      WHERE booking_id = $6
    `,
    [status, paymentId, paymentMethod, notes ? JSON.stringify(notes) : null, markVerified, bookingId]
  );
};

const markBookingFailed = async ({
  client,
  bookingId,
  seatId,
  paymentId = null,
  paymentMethod = null,
  paymentStatus = "failed",
  notes = null,
  keepReservationActive = false,
}) => {
  await updatePaymentState({
    client,
    bookingId,
    status: paymentStatus,
    paymentId,
    paymentMethod,
    notes,
  });

  if (keepReservationActive) {
    await client.query(
      `
        UPDATE bookings
        SET status = 'reserved',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
      [bookingId]
    );

    return;
  }

  const nextBookingStatus = paymentStatus === "cancelled" ? "cancelled" : "payment_failed";

  await client.query(
    `
      UPDATE bookings
      SET status = $2,
          hold_expires_at = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `,
    [bookingId, nextBookingStatus]
  );

  await releaseSeatIfNeeded({ client, seatId });
};

const parseCheckoutBookingIds = (body = {}) => {
  const candidateIds = Array.isArray(body.bookingIds) && body.bookingIds.length > 0
    ? body.bookingIds
    : [body.bookingId];

  return Array.from(
    new Set(
      candidateIds
        .map((value) => Number.parseInt(value, 10))
        .filter((value) => Number.isInteger(value) && value > 0)
    )
  );
};

const normalizePaymentNotes = (notes) => {
  if (!notes) {
    return {};
  }

  if (typeof notes === "object") {
    return notes;
  }

  try {
    return JSON.parse(notes);
  } catch (error) {
    return {};
  }
};

const buildBookingIdsFromNotes = ({ primaryBookingId, notes }) => {
  const linkedIds = Array.isArray(notes?.bookingIds) ? notes.bookingIds : [];
  const parsedIds = linkedIds
    .concat(primaryBookingId)
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isInteger(value) && value > 0);

  return Array.from(new Set(parsedIds));
};

const buildBookingResponse = (booking, totalAmount = null) => ({
  id: booking.id,
  bookingReference: booking.booking_reference,
  email: booking.traveler_email,
  travelerName: booking.traveler_name,
  totalAmount: Number(totalAmount ?? booking.total_amount),
  currency: booking.currency,
});

const buildAggregateBookingResponse = (bookings) => {
  const primaryBooking = bookings[0];
  const totalAmount = bookings.reduce((total, booking) => total + Number(booking.total_amount || 0), 0);

  return {
    primary: buildBookingResponse(primaryBooking, totalAmount),
    bookings: bookings.map((booking) => buildBookingResponse(booking)),
  };
};

const buildAggregatePricing = (bookings) => {
  const currency = bookings[0]?.currency || "INR";

  return bookings.reduce(
    (pricing, booking) => ({
      travelerCount: pricing.travelerCount + Number(booking.travelers_count || 1),
      baseFareTotal: pricing.baseFareTotal + Number(booking.base_fare || 0),
      taxesAndFees: pricing.taxesAndFees + Number(booking.taxes_and_fees || 0),
      serviceFee: pricing.serviceFee + Number(booking.service_fee || 0),
      seatFee: pricing.seatFee + Number(booking.seat_fee || 0),
      totalAmount: pricing.totalAmount + Number(booking.total_amount || 0),
      currency,
    }),
    {
      travelerCount: 0,
      baseFareTotal: 0,
      taxesAndFees: 0,
      serviceFee: 0,
      seatFee: 0,
      totalAmount: 0,
      currency,
    }
  );
};

const fetchCheckoutBooking = async ({ client, bookingId }) => {
  const bookingResult = await client.query(
    `
      SELECT
        bookings.id,
        bookings.flight_id,
        bookings.seat_id,
        bookings.status,
        bookings.booking_reference,
        bookings.traveler_name,
        bookings.traveler_email,
        bookings.provider_user_id,
        bookings.cabin_class,
        bookings.travelers_count,
        bookings.seat_number,
        bookings.base_fare,
        bookings.taxes_and_fees,
        bookings.service_fee,
        bookings.seat_fee,
        bookings.total_amount,
        bookings.currency,
        bookings.search_snapshot,
        bookings.flight_snapshot,
        bookings.hold_expires_at,
        bookings.created_at,
        bookings.updated_at
      FROM bookings
      WHERE bookings.id = $1
      LIMIT 1
      FOR UPDATE
    `,
    [bookingId]
  );

  const bookingRow = bookingResult.rows[0];

  if (!bookingRow) {
    return null;
  }

  const latestPaymentResult = await client.query(
    `
      SELECT id, provider_order_id, provider_payment_id, status, notes
      FROM payments
      WHERE booking_id = $1
      ORDER BY updated_at DESC NULLS LAST, id DESC
      LIMIT 1
      FOR UPDATE
    `,
    [bookingId]
  );

  const flightResult = await client.query(
    `
      SELECT source, destination, departure_time, arrival_time, price AS flight_price
      FROM flights
      WHERE id = $1
      LIMIT 1
    `,
    [bookingRow.flight_id]
  );

  const seatResult = await client.query(
    `
      SELECT id, status, reserved_until
      FROM seats
      WHERE id = $1
      LIMIT 1
      FOR UPDATE
    `,
    [bookingRow.seat_id]
  );

  const latestPayment = latestPaymentResult.rows[0] || {};
  const flight = flightResult.rows[0] || {};
  const seat = seatResult.rows[0] || {};

  return {
    ...bookingRow,
    payment_row_id: latestPayment.id || null,
    provider_order_id: latestPayment.provider_order_id || null,
    provider_payment_id: latestPayment.provider_payment_id || null,
    payment_status: latestPayment.status || null,
    payment_notes: normalizePaymentNotes(latestPayment.notes),
    source: flight.source || null,
    destination: flight.destination || null,
    departure_time: flight.departure_time || null,
    arrival_time: flight.arrival_time || null,
    flight_price: flight.flight_price || null,
    seat_status: seat.status || null,
    seat_reserved_until: seat.reserved_until || null,
  };
};

const findCompanionRoundTripBookingIds = async ({ client, booking }) => {
  const searchSnapshot = booking.search_snapshot || {};

  if (searchSnapshot.tripType !== "round-trip") {
    return [];
  }

  const result = await client.query(
    `
      SELECT bookings.id
      FROM bookings
      WHERE bookings.id <> $1
        AND bookings.flight_id <> $8
        AND (($2 <> '' AND bookings.provider_user_id = $2) OR ($3 <> '' AND bookings.traveler_email = $3))
        AND bookings.status IN ('reserved', 'payment_pending')
        AND COALESCE(
          bookings.hold_expires_at,
          bookings.created_at + INTERVAL '5 minutes'
        ) > CURRENT_TIMESTAMP
        AND COALESCE(bookings.search_snapshot->>'tripType', '') = 'round-trip'
        AND COALESCE(bookings.search_snapshot->>'source', '') = $4
        AND COALESCE(bookings.search_snapshot->>'destination', '') = $5
        AND COALESCE(bookings.search_snapshot->>'departureDate', '') = $6
        AND COALESCE(bookings.search_snapshot->>'returnDate', '') = $7
      ORDER BY bookings.updated_at DESC NULLS LAST, bookings.id DESC
      LIMIT 1
    `,
    [
      booking.id,
      booking.provider_user_id || "",
      normalizeEmail(booking.traveler_email || ""),
      normalizeText(searchSnapshot.source || ""),
      normalizeText(searchSnapshot.destination || ""),
      normalizeText(searchSnapshot.departureDate || ""),
      normalizeText(searchSnapshot.returnDate || ""),
      booking.flight_id,
    ]
  );

  return result.rows.map((row) => row.id);
};

const callDodoApi = async (path, { method = "GET", body } = {}) => {
  const { apiKey } = getDodoConfig();
  const response = await fetch(`${getDodoBaseUrl()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.error?.message ||
      payload?.error ||
      `Dodo Payments request failed with status ${response.status}.`;
    const error = new Error(message);
    error.statusCode = response.status >= 400 && response.status < 600 ? response.status : 502;
    error.details = payload;
    throw error;
  }

  return payload;
};

const getDodoProductDetails = async () => {
  const { productId } = getDodoConfig();
  const now = Date.now();

  if (
    dodoProductCache?.productId === productId &&
    now - dodoProductCache.fetchedAt < DODO_PRODUCT_CACHE_TTL_MS
  ) {
    return dodoProductCache.payload;
  }

  const payload = await callDodoApi(`/products/${encodeURIComponent(productId)}`);
  dodoProductCache = {
    productId,
    payload,
    fetchedAt: now,
  };
  return payload;
};

const validateDodoProductForFlightCheckout = async (pricing) => {
  const product = await getDodoProductDetails();
  const productCurrency = normalizeText(product?.price?.currency || "").toUpperCase();
  const checkoutCurrency = normalizeText(pricing.currency || "INR").toUpperCase();
  const isPayWhatYouWant = Boolean(product?.price?.pay_what_you_want);
  const isTaxInclusive = Boolean(product?.price?.tax_inclusive);

  if (!isPayWhatYouWant) {
    const error = new Error(
      "The configured Dodo product must be a Pay What You Want product so Flyvora can send the exact fare total."
    );
    error.statusCode = 500;
    throw error;
  }

  if (productCurrency && productCurrency !== checkoutCurrency) {
    const error = new Error(
      `The configured Dodo product currency is ${productCurrency}, but this checkout is sending ${checkoutCurrency}. Use a ${checkoutCurrency} product to avoid the wrong amount being shown.`
    );
    error.statusCode = 500;
    throw error;
  }

  if (!isTaxInclusive) {
    const error = new Error(
      "The configured Dodo product is tax-exclusive, so Dodo will add GST on top of the fare. Make the product tax-inclusive because Flyvora already sends the final fare total."
    );
    error.statusCode = 500;
    throw error;
  }
};

const createHostedCheckoutSession = async ({
  bookingId,
  bookingIds = [bookingId],
  bookingReference,
  flight,
  pricing,
  seatCode,
  route,
  metadata = {},
  customer,
}) => {
  const { productId } = getDodoConfig();
  await validateDodoProductForFlightCheckout(pricing);
  const requestBody = {
    product_cart: [
      {
        product_id: productId,
        quantity: 1,
        amount: Math.round(Number(pricing.totalAmount || 0) * 100),
      },
    ],
    customer: {
      email: customer.email,
      name: customer.name,
      phone_number: customer.phone,
    },
    billing_currency: pricing.currency,
    return_url: buildCheckoutReturnUrl({ flightId: flight.id, bookingId }),
    show_saved_payment_methods: true,
    minimal_address: true,
    metadata: {
      ...metadata,
      bookingId: String(bookingId),
      bookingIds: bookingIds.map((id) => String(id)).join(","),
      bookingReference,
      flightId: String(flight.id),
      seatCode,
      route: route || `${flight.source}-${flight.destination}`,
    },
    customization: {
      theme: "light",
      show_order_details: true,
    },
    feature_flags: {
      redirect_immediately: true,
      allow_currency_selection: false,
      allow_phone_number_collection: true,
      allow_customer_editing_email: true,
      allow_customer_editing_name: true,
      allow_discount_code: false,
    },
  };

  const session = await callDodoApi("/checkouts", {
    method: "POST",
    body: requestBody,
  });

  if (!session?.session_id || !session?.checkout_url) {
    const error = new Error("Dodo Payments did not return a valid checkout session.");
    error.statusCode = 502;
    throw error;
  }

  return session;
};

const fetchHostedCheckoutSession = async (sessionId, returnedStatus = "") => {
  let checkoutSession = null;
  const normalizedReturnedStatus = normalizePaymentStatus(returnedStatus);

  for (let attempt = 0; attempt < 4; attempt += 1) {
    checkoutSession = await callDodoApi(`/checkouts/${encodeURIComponent(sessionId)}`);
    const paymentStatus = normalizePaymentStatus(checkoutSession?.payment_status);

    if (DODO_SUCCESS_STATUSES.has(paymentStatus) || DODO_FAILURE_STATUSES.has(paymentStatus)) {
      return checkoutSession;
    }

    if (
      attempt < 3 &&
      (!paymentStatus || normalizedReturnedStatus === "succeeded" || normalizedReturnedStatus === "processing")
    ) {
      await sleep(900 * (attempt + 1));
    }
  }

  return checkoutSession;
};

const createDodoPaymentSession = async (req, res, next) => {
  const dbClient = await pool.connect();

  try {
    const { customer = {} } = req.body || {};
    let bookingIds = parseCheckoutBookingIds(req.body || {});
    const normalizedName = normalizeText(customer.name || "");
    const normalizedEmail = normalizeEmail(customer.email || "");
    const normalizedPhone = normalizePhone(customer.phone || "");
    const providerUserId = normalizeText(customer.providerUserId || "");

    getDodoConfig();

    if (bookingIds.length === 0) {
      return res.status(400).json({ message: "Reservation id is required before payment." });
    }

    if (!normalizedName) {
      return res.status(400).json({ message: "Traveler name is required before payment." });
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ message: "Enter a valid traveler email before payment." });
    }

    if (normalizedPhone.replace(/\D/g, "").length < 10) {
      return res.status(400).json({ message: "Enter a valid mobile number before payment." });
    }

    await dbClient.query("BEGIN");
    await cleanupExpiredReservations({ client: dbClient });

    const bookings = [];

    for (const bookingId of bookingIds) {
      const booking = await fetchCheckoutBooking({ client: dbClient, bookingId });

      if (!booking) {
        await dbClient.query("ROLLBACK");
        return res.status(404).json({ message: "That seat reservation no longer exists. Please pick a seat again." });
      }

      bookings.push(booking);
    }

    if (bookings.length === 1) {
      const companionBookingIds = await findCompanionRoundTripBookingIds({
        client: dbClient,
        booking: bookings[0],
      });

      for (const companionBookingId of companionBookingIds) {
        if (bookingIds.includes(companionBookingId)) {
          continue;
        }

        const companionBooking = await fetchCheckoutBooking({ client: dbClient, bookingId: companionBookingId });

        if (companionBooking) {
          bookingIds = [...bookingIds, companionBookingId];
          bookings.push(companionBooking);
        }
      }
    }

    if (bookings[0]?.search_snapshot?.tripType === "round-trip" && bookings.length < 2) {
      await dbClient.query("ROLLBACK");
      return res.status(409).json({ message: "Both outbound and return seat reservations are required before round-trip payment." });
    }

    const currencies = new Set(bookings.map((booking) => normalizeText(booking.currency || "INR").toUpperCase()));

    if (currencies.size > 1) {
      await dbClient.query("ROLLBACK");
      return res.status(409).json({ message: "All legs in one checkout must use the same currency." });
    }

    const now = Date.now();
    const holdExpiresAtByBookingId = new Map();
    const bookingReferenceById = new Map();

    for (const booking of bookings) {
      if (booking.provider_user_id && providerUserId && booking.provider_user_id !== providerUserId) {
        await dbClient.query("ROLLBACK");
        return res.status(403).json({ message: "This seat reservation belongs to another user." });
      }

      const isActiveCheckoutReservation = ["reserved", "payment_pending"].includes(booking.status);
      const isRetryableFailedReservation =
        booking.status === "payment_failed" && DODO_FAILURE_STATUSES.has(booking.payment_status || "");

      if (!isActiveCheckoutReservation && !isRetryableFailedReservation) {
        await dbClient.query("ROLLBACK");
        return res.status(409).json({ message: "This reservation can no longer be used for checkout." });
      }

      const holdExpiresAt = resolveHoldExpiresAt(booking);

      if (holdExpiresAt.getTime() <= now) {
        await dbClient.query("ROLLBACK");
        return res.status(409).json({ message: "Your 5-minute seat hold expired. Please choose a seat again." });
      }

      const seatReservedUntil = booking.seat_reserved_until ? new Date(booking.seat_reserved_until) : null;

      if (isRetryableFailedReservation) {
        const seatIsHeldByAnotherReservation = Boolean(
          booking.seat_status === "reserved" &&
          seatReservedUntil &&
          seatReservedUntil.getTime() > now
        );

        if (booking.seat_status === "booked" || seatIsHeldByAnotherReservation) {
          await dbClient.query("ROLLBACK");
          return res.status(409).json({ message: "That seat is no longer available. Please choose another seat." });
        }

        await dbClient.query(
          `
            UPDATE seats
            SET status = 'reserved',
                reserved_until = $2
            WHERE id = $1
          `,
          [booking.seat_id, holdExpiresAt]
        );
      } else if (
        booking.seat_status !== "reserved" ||
        !seatReservedUntil ||
        seatReservedUntil.getTime() <= now
      ) {
        await dbClient.query("ROLLBACK");
        return res.status(409).json({ message: "That seat is no longer reserved for you. Please choose a seat again." });
      }

      holdExpiresAtByBookingId.set(booking.id, holdExpiresAt);
      bookingReferenceById.set(booking.id, booking.booking_reference || buildBookingReference());
    }

    const pricing = buildAggregatePricing(bookings);
    const primaryBooking = bookings[0];
    const primaryBookingReference = bookingReferenceById.get(primaryBooking.id);
    const primaryFlightSnapshot = resolveFlightSnapshot(primaryBooking);
    const segments = bookings.map((booking, index) => {
      const flightSnapshot = resolveFlightSnapshot(booking);

      return {
        legIndex: index,
        bookingId: booking.id,
        bookingReference: bookingReferenceById.get(booking.id),
        flightId: booking.flight_id,
        seatCode: booking.seat_number,
        route: `${flightSnapshot.source}-${flightSnapshot.destination}`,
      };
    });
    const seatCodeLabel = segments.map((segment) => segment.seatCode).join(", ");
    const routeLabel = segments.map((segment) => segment.route).join(" | ");
    const session = await createHostedCheckoutSession({
      bookingId: primaryBooking.id,
      bookingIds,
      bookingReference: primaryBookingReference,
      flight: {
        ...primaryFlightSnapshot,
        id: primaryBooking.flight_id,
      },
      pricing,
      seatCode: seatCodeLabel,
      route: routeLabel,
      metadata: {
        primaryBookingId: String(primaryBooking.id),
        legCount: String(bookings.length),
      },
      customer: {
        name: normalizedName,
        email: normalizedEmail,
        phone: normalizedPhone,
      },
    });

    for (const booking of bookings) {
      const bookingReference = bookingReferenceById.get(booking.id);
      const holdExpiresAt = holdExpiresAtByBookingId.get(booking.id);

      await dbClient.query(
        `
          UPDATE bookings
          SET status = 'payment_pending',
              booking_reference = $2,
              traveler_name = $3,
              traveler_email = $4,
              traveler_phone = $5,
              provider_user_id = COALESCE($6, provider_user_id),
              hold_expires_at = COALESCE(hold_expires_at, $7),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `,
        [
          booking.id,
          bookingReference,
          normalizedName,
          normalizedEmail,
          normalizedPhone,
          providerUserId || null,
          holdExpiresAt,
        ]
      );

      const isPrimaryBooking = booking.id === primaryBooking.id;
      const receipt = buildReceipt(bookingReference);
      const paymentNotes = {
        checkoutUrl: session.checkout_url,
        dodoCheckoutId: session.session_id,
        bookingIds,
        primaryBookingId: primaryBooking.id,
        bookingReference,
        aggregateCheckout: isPrimaryBooking,
        seatCode: booking.seat_number,
        route: segments.find((segment) => segment.bookingId === booking.id)?.route || null,
        segments,
      };

      if (booking.payment_row_id) {
        await dbClient.query(
          `
            UPDATE payments
            SET amount = $2,
                status = 'created',
                provider = $3,
                currency = $4,
                receipt = $5,
                provider_order_id = $6,
                provider_payment_id = NULL,
                provider_signature = NULL,
                provider_method = NULL,
                notes = $7::jsonb,
                verified_at = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `,
          [
            booking.payment_row_id,
            isPrimaryBooking ? pricing.totalAmount : Number(booking.total_amount || 0),
            DODO_PROVIDER,
            pricing.currency,
            receipt,
            isPrimaryBooking ? session.session_id : null,
            JSON.stringify(paymentNotes),
          ]
        );
      } else {
        await dbClient.query(
          `
            INSERT INTO payments (
              booking_id,
              amount,
              status,
              provider,
              currency,
              receipt,
              provider_order_id,
              notes,
              updated_at
            )
            VALUES ($1, $2, 'created', $3, $4, $5, $6, $7::jsonb, CURRENT_TIMESTAMP)
          `,
          [
            booking.id,
            isPrimaryBooking ? pricing.totalAmount : Number(booking.total_amount || 0),
            DODO_PROVIDER,
            pricing.currency,
            receipt,
            isPrimaryBooking ? session.session_id : null,
            JSON.stringify(paymentNotes),
          ]
        );
      }
    }

    await dbClient.query("COMMIT");

    return res.status(200).json({
      message: "Dodo checkout session created successfully.",
      booking: {
        id: primaryBooking.id,
        bookingReference: primaryBookingReference,
        holdExpiresAt: holdExpiresAtByBookingId.get(primaryBooking.id),
        status: "payment_pending",
      },
      bookings: bookings.map((booking) => ({
        id: booking.id,
        bookingReference: bookingReferenceById.get(booking.id),
        holdExpiresAt: holdExpiresAtByBookingId.get(booking.id),
        status: "payment_pending",
        seatCode: booking.seat_number,
      })),
      checkout: {
        sessionId: session.session_id,
        checkoutUrl: session.checkout_url,
      },
      pricing: {
        ...pricing,
        seatProfile: segments.map((segment) => `${getSeatType(segment.seatCode)} | ${getSeatPosition(segment.seatCode)}`).join(", "),
      },
    });
  } catch (error) {
    try {
      await dbClient.query("ROLLBACK");
    } catch (rollbackError) {
      // no-op
    }

    return next(error);
  } finally {
    dbClient.release();
  }
};

const verifyDodoPayment = async (req, res, next) => {
  const dbClient = await pool.connect();

  try {
    const {
      bookingId,
      paymentId,
      status: returnedStatus,
      email: returnedEmail,
    } = req.body || {};
    const parsedBookingId = Number.parseInt(bookingId, 10);

    if (!Number.isInteger(parsedBookingId) || parsedBookingId <= 0) {
      return res.status(400).json({ message: "Booking id is required to verify the Dodo payment." });
    }

    getDodoConfig();

    await dbClient.query("BEGIN");
    await cleanupExpiredReservations({ client: dbClient });

    let primaryBooking = await fetchCheckoutBooking({ client: dbClient, bookingId: parsedBookingId });

    if (!primaryBooking) {
      await dbClient.query("ROLLBACK");
      return res.status(404).json({ message: "We could not find that pending booking." });
    }

    const linkedPrimaryBookingId = Number.parseInt(primaryBooking.payment_notes?.primaryBookingId, 10);

    if (
      !primaryBooking.provider_order_id &&
      Number.isInteger(linkedPrimaryBookingId) &&
      linkedPrimaryBookingId > 0 &&
      linkedPrimaryBookingId !== primaryBooking.id
    ) {
      const linkedPrimaryBooking = await fetchCheckoutBooking({ client: dbClient, bookingId: linkedPrimaryBookingId });

      if (linkedPrimaryBooking) {
        primaryBooking = linkedPrimaryBooking;
      }
    }

    if (!primaryBooking.provider_order_id) {
      await dbClient.query("ROLLBACK");
      return res.status(409).json({ message: "Checkout session is missing for this booking." });
    }

    const relatedBookingIds = buildBookingIdsFromNotes({
      primaryBookingId: primaryBooking.id,
      notes: primaryBooking.payment_notes,
    });
    const bookings = [];

    for (const relatedBookingId of relatedBookingIds) {
      const booking = await fetchCheckoutBooking({ client: dbClient, bookingId: relatedBookingId });

      if (!booking) {
        await dbClient.query("ROLLBACK");
        return res.status(404).json({ message: "We could not find one of the pending bookings for this checkout." });
      }

      bookings.push(booking);
    }

    const aggregateResponse = buildAggregateBookingResponse(bookings);

    if (bookings.every((booking) => booking.status === "confirmed")) {
      await dbClient.query("COMMIT");
      return res.status(200).json({
        message: "Booking already confirmed.",
        booking: aggregateResponse.primary,
        bookings: aggregateResponse.bookings,
        payment: {
          id: primaryBooking.provider_payment_id || paymentId || null,
          orderId: primaryBooking.provider_order_id,
          status: primaryBooking.payment_status || "succeeded",
          method: null,
        },
      });
    }

    const checkoutSession = await fetchHostedCheckoutSession(primaryBooking.provider_order_id, returnedStatus);
    const dodoPaymentStatus = normalizePaymentStatus(checkoutSession?.payment_status);
    const fallbackReturnedStatus = normalizePaymentStatus(returnedStatus);
    const paymentStatus = dodoPaymentStatus || (DODO_FAILURE_STATUSES.has(fallbackReturnedStatus) ? fallbackReturnedStatus : "processing");
    const resolvedPaymentId = normalizeText(checkoutSession?.payment_id || paymentId || primaryBooking.provider_payment_id || "") || null;
    const resolvedEmail = normalizeEmail(checkoutSession?.customer_email || returnedEmail || primaryBooking.traveler_email || "");
    const verificationNotes = {
      dodoCheckoutId: primaryBooking.provider_order_id,
      dodoReturnedStatus: fallbackReturnedStatus || null,
      verifiedEmail: resolvedEmail || null,
      bookingIds: relatedBookingIds,
      primaryBookingId: primaryBooking.id,
    };

    if (DODO_SUCCESS_STATUSES.has(dodoPaymentStatus)) {
      const now = Date.now();
      const staleBooking = bookings.find((booking) => {
        if (booking.status === "confirmed") {
          return false;
        }

        const holdExpiresAt = resolveHoldExpiresAt(booking);
        const seatReservedUntil = booking.seat_reserved_until ? new Date(booking.seat_reserved_until) : null;
        const holdHasExpired = holdExpiresAt.getTime() <= now;
        const seatIsStillReserved = booking.seat_status === "reserved" && seatReservedUntil && seatReservedUntil.getTime() > now;

        return holdHasExpired || !seatIsStillReserved;
      });

      if (staleBooking) {
        for (const booking of bookings) {
          await updatePaymentState({
            client: dbClient,
            bookingId: booking.id,
            status: dodoPaymentStatus,
            paymentId: resolvedPaymentId,
            markVerified: true,
            notes: {
              ...verificationNotes,
              seatConfirmationError: "Seat hold expired before booking confirmation.",
            },
          });
        }

        await dbClient.query("COMMIT");
        return res.status(409).json({
          message: "Your 5-minute seat hold expired before payment could be confirmed. Please choose a seat again.",
        });
      }

      for (const booking of bookings) {
        await updatePaymentState({
          client: dbClient,
          bookingId: booking.id,
          status: dodoPaymentStatus,
          paymentId: resolvedPaymentId,
          markVerified: true,
          notes: verificationNotes,
        });
      }

      await dbClient.query(
        `
          UPDATE bookings
          SET status = 'confirmed',
              hold_expires_at = NULL,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ANY($1::int[])
        `,
        [bookings.map((booking) => booking.id)]
      );

      await dbClient.query(
        `
          UPDATE seats
          SET status = 'booked',
              reserved_until = NULL
          WHERE id = ANY($1::int[])
        `,
        [bookings.map((booking) => booking.seat_id)]
      );

      await dbClient.query("COMMIT");

      return res.status(200).json({
        message: "Payment verified successfully.",
        booking: {
          ...aggregateResponse.primary,
          email: resolvedEmail || aggregateResponse.primary.email,
        },
        bookings: aggregateResponse.bookings.map((booking) => ({
          ...booking,
          email: resolvedEmail || booking.email,
        })),
        payment: {
          id: resolvedPaymentId,
          orderId: primaryBooking.provider_order_id,
          status: dodoPaymentStatus,
          method: null,
        },
      });
    }

    if (DODO_FAILURE_STATUSES.has(paymentStatus)) {
      const now = Date.now();
      const retryableBookings = [];

      for (const booking of bookings) {
        const holdExpiresAt = resolveHoldExpiresAt(booking);
        const seatReservedUntil = booking.seat_reserved_until ? new Date(booking.seat_reserved_until) : null;
        const canRetryWithinHold = Boolean(
          holdExpiresAt.getTime() > now &&
          booking.seat_status === "reserved" &&
          seatReservedUntil &&
          seatReservedUntil.getTime() > now
        );

        await markBookingFailed({
          client: dbClient,
          bookingId: booking.id,
          seatId: booking.seat_id,
          paymentId: resolvedPaymentId,
          paymentStatus,
          notes: verificationNotes,
          keepReservationActive: canRetryWithinHold,
        });

        if (canRetryWithinHold) {
          retryableBookings.push({
            id: booking.id,
            bookingReference: booking.booking_reference,
            holdExpiresAt,
            status: "reserved",
          });
        }
      }

      await dbClient.query("COMMIT");
      return res.status(400).json({
        message:
          paymentStatus === "cancelled"
            ? "Payment was cancelled before completion."
            : "Payment did not complete successfully. Please try again.",
        booking: retryableBookings[0] || null,
        bookings: retryableBookings,
      });
    }

    for (const booking of bookings) {
      await updatePaymentState({
        client: dbClient,
        bookingId: booking.id,
        status: paymentStatus,
        paymentId: resolvedPaymentId,
        notes: verificationNotes,
      });
    }

    await dbClient.query("COMMIT");

    return res.status(202).json({
      message: "Payment is still processing. Please wait a moment and refresh if needed.",
      booking: {
        ...aggregateResponse.primary,
        email: resolvedEmail || aggregateResponse.primary.email,
      },
      bookings: aggregateResponse.bookings.map((booking) => ({
        ...booking,
        email: resolvedEmail || booking.email,
      })),
      payment: {
        id: resolvedPaymentId,
        orderId: primaryBooking.provider_order_id,
        status: paymentStatus,
        method: null,
      },
    });
  } catch (error) {
    try {
      await dbClient.query("ROLLBACK");
    } catch (rollbackError) {
      // no-op
    }

    return next(error);
  } finally {
    dbClient.release();
  }
};

const releaseCheckoutHold = async (req, res, next) => {
  const dbClient = await pool.connect();

  try {
    const bookingIds = parseCheckoutBookingIds(req.body || {});

    if (bookingIds.length === 0) {
      return res.status(400).json({ message: "Booking id is required to release the hold." });
    }

    await dbClient.query("BEGIN");

    const bookingResult = await dbClient.query(
      `
        SELECT id, seat_id, status
        FROM bookings
        WHERE id = ANY($1::int[])
        FOR UPDATE
      `,
      [bookingIds]
    );

    const bookings = bookingResult.rows;

    if (bookings.length === 0) {
      await dbClient.query("ROLLBACK");
      return res.status(404).json({ message: "Pending booking not found." });
    }

    const releasableBookings = bookings.filter((booking) => booking.status !== "confirmed");

    if (releasableBookings.length === 0) {
      await dbClient.query("COMMIT");
      return res.status(200).json({ message: "Booking already confirmed." });
    }

    const releasableBookingIds = releasableBookings.map((booking) => booking.id);

    await dbClient.query(
      `
        UPDATE payments
        SET status = 'cancelled',
            updated_at = CURRENT_TIMESTAMP
        WHERE booking_id = ANY($1::int[]) AND status <> 'succeeded'
      `,
      [releasableBookingIds]
    );

    await dbClient.query(
      `
        UPDATE bookings
        SET status = 'cancelled',
            hold_expires_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ANY($1::int[])
      `,
      [releasableBookingIds]
    );

    for (const booking of releasableBookings) {
      await releaseSeatIfNeeded({ client: dbClient, seatId: booking.seat_id });
    }

    await dbClient.query("COMMIT");

    return res.status(200).json({ message: releasableBookings.length > 1 ? "Seat holds released." : "Seat hold released." });
  } catch (error) {
    try {
      await dbClient.query("ROLLBACK");
    } catch (rollbackError) {
      // no-op
    }

    return next(error);
  } finally {
    dbClient.release();
  }
};

module.exports = {
  createDodoPaymentSession,
  releaseCheckoutHold,
  verifyDodoPayment,
};


