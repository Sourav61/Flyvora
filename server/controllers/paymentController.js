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
  bookingReference,
  flight,
  pricing,
  seatCode,
  customer,
}) => {
  const { productId } = getDodoConfig();
  await validateDodoProductForFlightCheckout(pricing);
  const requestBody = {
    product_cart: [
      {
        product_id: productId,
        quantity: 1,
        amount: Math.round(pricing.totalAmount * 100),
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
      bookingId: String(bookingId),
      bookingReference,
      flightId: String(flight.id),
      seatCode,
      route: `${flight.source}-${flight.destination}`,
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
    const { bookingId, customer = {} } = req.body || {};
    const parsedBookingId = Number.parseInt(bookingId, 10);
    const normalizedName = normalizeText(customer.name || "");
    const normalizedEmail = normalizeEmail(customer.email || "");
    const normalizedPhone = normalizePhone(customer.phone || "");
    const providerUserId = normalizeText(customer.providerUserId || "");

    getDodoConfig();

    if (!Number.isInteger(parsedBookingId) || parsedBookingId <= 0) {
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

    const bookingResult = await dbClient.query(
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
      [parsedBookingId]
    );

    const latestPaymentResult = await dbClient.query(
      `
        SELECT id, provider_order_id, status
        FROM payments
        WHERE booking_id = $1
        ORDER BY updated_at DESC NULLS LAST, id DESC
        LIMIT 1
        FOR UPDATE
      `,
      [parsedBookingId]
    );

    const flightResult = await dbClient.query(
      `
        SELECT source, destination, departure_time, arrival_time, price AS flight_price
        FROM flights
        WHERE id = $1
        LIMIT 1
      `,
      [parsedBookingId ? bookingResult.rows[0]?.flight_id : null]
    );

    const booking = bookingResult.rows[0]
      ? {
          ...bookingResult.rows[0],
          payment_row_id: latestPaymentResult.rows[0]?.id || null,
          provider_order_id: latestPaymentResult.rows[0]?.provider_order_id || null,
          payment_status: latestPaymentResult.rows[0]?.status || null,
          source: flightResult.rows[0]?.source || null,
          destination: flightResult.rows[0]?.destination || null,
          departure_time: flightResult.rows[0]?.departure_time || null,
          arrival_time: flightResult.rows[0]?.arrival_time || null,
          flight_price: flightResult.rows[0]?.flight_price || null,
        }
      : null;

    if (!booking) {
      await dbClient.query("ROLLBACK");
      return res.status(404).json({ message: "That seat reservation no longer exists. Please pick a seat again." });
    }

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
    const now = Date.now();

    if (holdExpiresAt.getTime() <= now) {
      await dbClient.query("ROLLBACK");
      return res.status(409).json({ message: "Your 5-minute seat hold expired. Please choose a seat again." });
    }

    const seatResult = await dbClient.query(
      `
        SELECT id, status, reserved_until
        FROM seats
        WHERE id = $1
        LIMIT 1
        FOR UPDATE
      `,
      [booking.seat_id]
    );

    const seatRecord = seatResult.rows[0];

    if (!seatRecord) {
      await dbClient.query("ROLLBACK");
      return res.status(404).json({ message: "That seat is no longer available." });
    }

    const seatReservedUntil = seatRecord.reserved_until ? new Date(seatRecord.reserved_until) : null;

    if (isRetryableFailedReservation) {
      const seatIsHeldByAnotherReservation = Boolean(
        seatRecord.status === "reserved" &&
        seatReservedUntil &&
        seatReservedUntil.getTime() > now
      );

      if (seatRecord.status === "booked" || seatIsHeldByAnotherReservation) {
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
      seatRecord.status !== "reserved" ||
      !seatReservedUntil ||
      seatReservedUntil.getTime() <= now
    ) {
      await dbClient.query("ROLLBACK");
      return res.status(409).json({ message: "That seat is no longer reserved for you. Please choose a seat again." });
    }

    const bookingReference = booking.booking_reference || buildBookingReference();
    const flightSnapshot = resolveFlightSnapshot(booking);
    const pricing = {
      travelerCount: Number(booking.travelers_count || 1),
      baseFareTotal: Number(booking.base_fare || 0),
      taxesAndFees: Number(booking.taxes_and_fees || 0),
      serviceFee: Number(booking.service_fee || 0),
      seatFee: Number(booking.seat_fee || 0),
      totalAmount: Number(booking.total_amount || 0),
      currency: booking.currency || "INR",
    };
    const receipt = buildReceipt(bookingReference);
    const session = await createHostedCheckoutSession({
      bookingId: booking.id,
      bookingReference,
      flight: {
        ...flightSnapshot,
        id: booking.flight_id,
      },
      pricing,
      seatCode: booking.seat_number,
      customer: {
        name: normalizedName,
        email: normalizedEmail,
        phone: normalizedPhone,
      },
    });

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
          pricing.totalAmount,
          DODO_PROVIDER,
          pricing.currency,
          receipt,
          session.session_id,
          JSON.stringify({
            checkoutUrl: session.checkout_url,
            bookingReference,
            seatCode: booking.seat_number,
            route: `${flightSnapshot.source}-${flightSnapshot.destination}`,
          }),
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
          pricing.totalAmount,
          DODO_PROVIDER,
          pricing.currency,
          receipt,
          session.session_id,
          JSON.stringify({
            checkoutUrl: session.checkout_url,
            bookingReference,
            seatCode: booking.seat_number,
            route: `${flightSnapshot.source}-${flightSnapshot.destination}`,
          }),
        ]
      );
    }

    await dbClient.query("COMMIT");

    return res.status(200).json({
      message: "Dodo checkout session created successfully.",
      booking: {
        id: booking.id,
        bookingReference,
        holdExpiresAt,
        status: "payment_pending",
      },
      checkout: {
        sessionId: session.session_id,
        checkoutUrl: session.checkout_url,
      },
      pricing: {
        ...pricing,
        seatProfile: `${getSeatType(booking.seat_number)} | ${getSeatPosition(booking.seat_number)}`,
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

    if (!bookingId) {
      return res.status(400).json({ message: "Booking id is required to verify the Dodo payment." });
    }

    getDodoConfig();

    await dbClient.query("BEGIN");
    await cleanupExpiredReservations({ client: dbClient });

    const bookingResult = await dbClient.query(
      `
        SELECT
          bookings.id,
          bookings.booking_reference,
          bookings.status AS booking_status,
          bookings.seat_id,
          bookings.hold_expires_at,
          bookings.created_at,
          bookings.traveler_email,
          bookings.traveler_name,
          bookings.total_amount,
          bookings.currency
        FROM bookings
        WHERE bookings.id = $1
        LIMIT 1
        FOR UPDATE
      `,
      [bookingId]
    );

    const paymentResult = await dbClient.query(
      `
        SELECT provider_order_id, provider_payment_id, status AS payment_status
        FROM payments
        WHERE booking_id = $1
        ORDER BY updated_at DESC NULLS LAST, id DESC
        LIMIT 1
        FOR UPDATE
      `,
      [bookingId]
    );

    const seatResult = await dbClient.query(
      `
        SELECT status AS seat_status, reserved_until AS seat_reserved_until
        FROM seats
        WHERE id = $1
        LIMIT 1
        FOR UPDATE
      `,
      [bookingResult.rows[0]?.seat_id || null]
    );

    const booking = bookingResult.rows[0]
      ? {
          ...bookingResult.rows[0],
          provider_order_id: paymentResult.rows[0]?.provider_order_id || null,
          provider_payment_id: paymentResult.rows[0]?.provider_payment_id || null,
          payment_status: paymentResult.rows[0]?.payment_status || null,
          seat_status: seatResult.rows[0]?.seat_status || null,
          seat_reserved_until: seatResult.rows[0]?.seat_reserved_until || null,
        }
      : null;

    if (!booking) {
      await dbClient.query("ROLLBACK");
      return res.status(404).json({ message: "We could not find that pending booking." });
    }

    if (booking.booking_status === "confirmed") {
      await dbClient.query("COMMIT");
      return res.status(200).json({
        message: "Booking already confirmed.",
        booking: {
          id: booking.id,
          bookingReference: booking.booking_reference,
          email: booking.traveler_email,
          travelerName: booking.traveler_name,
          totalAmount: Number(booking.total_amount),
          currency: booking.currency,
        },
        payment: {
          id: booking.provider_payment_id || paymentId || null,
          orderId: booking.provider_order_id,
          status: booking.payment_status || "succeeded",
          method: null,
        },
      });
    }

    if (!booking.provider_order_id) {
      await dbClient.query("ROLLBACK");
      return res.status(409).json({ message: "Checkout session is missing for this booking." });
    }

    const checkoutSession = await fetchHostedCheckoutSession(booking.provider_order_id, returnedStatus);
    const dodoPaymentStatus = normalizePaymentStatus(checkoutSession?.payment_status);
    const fallbackReturnedStatus = normalizePaymentStatus(returnedStatus);
    const paymentStatus = dodoPaymentStatus || (DODO_FAILURE_STATUSES.has(fallbackReturnedStatus) ? fallbackReturnedStatus : "processing");
    const resolvedPaymentId = normalizeText(checkoutSession?.payment_id || paymentId || booking.provider_payment_id || "") || null;
    const resolvedEmail = normalizeEmail(checkoutSession?.customer_email || returnedEmail || booking.traveler_email || "");
    const verificationNotes = {
      dodoCheckoutId: booking.provider_order_id,
      dodoReturnedStatus: fallbackReturnedStatus || null,
      verifiedEmail: resolvedEmail || null,
    };

    if (DODO_SUCCESS_STATUSES.has(dodoPaymentStatus)) {
      const holdExpiresAt = resolveHoldExpiresAt(booking);
      const seatReservedUntil = booking.seat_reserved_until ? new Date(booking.seat_reserved_until) : null;
      const holdHasExpired = holdExpiresAt.getTime() <= Date.now();
      const seatIsStillReserved = booking.seat_status === "reserved" && seatReservedUntil && seatReservedUntil.getTime() > Date.now();

      if (holdHasExpired || !seatIsStillReserved) {
        await updatePaymentState({
          client: dbClient,
          bookingId,
          status: dodoPaymentStatus,
          paymentId: resolvedPaymentId,
          markVerified: true,
          notes: {
            ...verificationNotes,
            seatConfirmationError: "Seat hold expired before booking confirmation.",
          },
        });
        await dbClient.query("COMMIT");
        return res.status(409).json({
          message: "Your 5-minute seat hold expired before payment could be confirmed. Please choose a seat again.",
        });
      }

      await updatePaymentState({
        client: dbClient,
        bookingId,
        status: dodoPaymentStatus,
        paymentId: resolvedPaymentId,
        markVerified: true,
        notes: verificationNotes,
      });

      await dbClient.query(
        `
          UPDATE bookings
          SET status = 'confirmed',
              hold_expires_at = NULL,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `,
        [bookingId]
      );

      await dbClient.query(
        `
          UPDATE seats
          SET status = 'booked',
              reserved_until = NULL
          WHERE id = $1
        `,
        [booking.seat_id]
      );

      await dbClient.query("COMMIT");

      return res.status(200).json({
        message: "Payment verified successfully.",
        booking: {
          id: booking.id,
          bookingReference: booking.booking_reference,
          email: resolvedEmail || booking.traveler_email,
          travelerName: booking.traveler_name,
          totalAmount: Number(booking.total_amount),
          currency: booking.currency,
        },
        payment: {
          id: resolvedPaymentId,
          orderId: booking.provider_order_id,
          status: dodoPaymentStatus,
          method: null,
        },
      });
    }

    if (DODO_FAILURE_STATUSES.has(paymentStatus)) {
      const holdExpiresAt = resolveHoldExpiresAt(booking);
      const seatReservedUntil = booking.seat_reserved_until ? new Date(booking.seat_reserved_until) : null;
      const canRetryWithinHold = Boolean(
        holdExpiresAt.getTime() > Date.now() &&
        booking.seat_status === "reserved" &&
        seatReservedUntil &&
        seatReservedUntil.getTime() > Date.now()
      );

      await markBookingFailed({
        client: dbClient,
        bookingId,
        seatId: booking.seat_id,
        paymentId: resolvedPaymentId,
        paymentStatus,
        notes: verificationNotes,
        keepReservationActive: canRetryWithinHold,
      });
      await dbClient.query("COMMIT");
      return res.status(400).json({
        message:
          paymentStatus === "cancelled"
            ? "Payment was cancelled before completion."
            : "Payment did not complete successfully. Please try again.",
        booking: canRetryWithinHold
          ? {
              id: booking.id,
              bookingReference: booking.booking_reference,
              holdExpiresAt,
              status: "reserved",
            }
          : null,
      });
    }

    await updatePaymentState({
      client: dbClient,
      bookingId,
      status: paymentStatus,
      paymentId: resolvedPaymentId,
      notes: verificationNotes,
    });
    await dbClient.query("COMMIT");

    return res.status(202).json({
      message: "Payment is still processing. Please wait a moment and refresh if needed.",
      booking: {
        id: booking.id,
        bookingReference: booking.booking_reference,
        email: resolvedEmail || booking.traveler_email,
        travelerName: booking.traveler_name,
        totalAmount: Number(booking.total_amount),
        currency: booking.currency,
      },
      payment: {
        id: resolvedPaymentId,
        orderId: booking.provider_order_id,
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
    const { bookingId } = req.body || {};

    if (!bookingId) {
      return res.status(400).json({ message: "Booking id is required to release the hold." });
    }

    await dbClient.query("BEGIN");

    const bookingResult = await dbClient.query(
      `
        SELECT id, seat_id, status
        FROM bookings
        WHERE id = $1
        LIMIT 1
        FOR UPDATE
      `,
      [bookingId]
    );

    const booking = bookingResult.rows[0];

    if (!booking) {
      await dbClient.query("ROLLBACK");
      return res.status(404).json({ message: "Pending booking not found." });
    }

    if (booking.status === "confirmed") {
      await dbClient.query("COMMIT");
      return res.status(200).json({ message: "Booking already confirmed." });
    }

    await dbClient.query(
      `
        UPDATE payments
        SET status = 'cancelled',
            updated_at = CURRENT_TIMESTAMP
        WHERE booking_id = $1 AND status <> 'succeeded'
      `,
      [bookingId]
    );

    await dbClient.query(
      `
        UPDATE bookings
        SET status = 'cancelled',
            hold_expires_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
      [bookingId]
    );

    await releaseSeatIfNeeded({ client: dbClient, seatId: booking.seat_id });
    await dbClient.query("COMMIT");

    return res.status(200).json({ message: "Seat hold released." });
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


