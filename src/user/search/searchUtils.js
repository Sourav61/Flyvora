export const cabinOptions = [
  { value: "Economy", label: "Economy" },
  { value: "Premium Economy", label: "Premium Economy" },
  { value: "Business", label: "Business" },
  { value: "First Class", label: "First Class" },
];

export const tripOptions = [
  { value: "round-trip", label: "Round Trip" },
  { value: "one-way", label: "One Way" },
];

export const resultsSortOptions = [
  { value: "recommended", label: "Recommended" },
  { value: "price_asc", label: "Cheapest" },
  { value: "price_desc", label: "Highest Price" },
  { value: "departure_asc", label: "Earliest Departure" },
  { value: "departure_desc", label: "Latest Departure" },
];

export const getTodayDateValue = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const normalizeTripType = (value) =>
  tripOptions.some((option) => option.value === value) ? value : "round-trip";

const normalizeCabinClass = (value) =>
  cabinOptions.some((option) => option.value === value) ? value : "Economy";

const parseCount = (value, fallback, minimum) => {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(parsed, minimum);
};

export const createDefaultSearchState = () => ({
  tripType: "round-trip",
  source: "",
  destination: "",
  departureDate: "",
  returnDate: "",
  sortBy: "recommended",
  travelers: {
    adults: 1,
    children: 0,
    cabinClass: "Economy",
  },
});

export const canUnlockCabinClasses = (searchState) =>
  Boolean(
    searchState.destination.trim() &&
      searchState.departureDate &&
      (searchState.tripType === "one-way" || searchState.returnDate)
  );

export const validateSearchState = (searchState) => {
  const errors = {};
  const source = searchState.source.trim();
  const destination = searchState.destination.trim();

  if (!source) {
    errors.source = "Enter a departure city.";
  }

  if (!destination) {
    errors.destination = "Enter an arrival city.";
  }

  if (source && destination && source.toLowerCase() === destination.toLowerCase()) {
    errors.source = "Departure and arrival cities need to be different.";
    errors.destination = "Departure and arrival cities need to be different.";
  }

  if (!searchState.departureDate) {
    errors.departureDate = "Choose a departure date.";
  }

  if (searchState.tripType === "round-trip" && !searchState.returnDate) {
    errors.returnDate = "Choose a return date for a round trip.";
  }

  if (
    searchState.departureDate &&
    searchState.returnDate &&
    searchState.returnDate < searchState.departureDate
  ) {
    errors.returnDate = "Return date needs to be after departure.";
  }

  return errors;
};

export const buildSearchParams = (searchState) => {
  const params = new URLSearchParams();

  params.set("tripType", normalizeTripType(searchState.tripType));
  params.set("source", searchState.source.trim());
  params.set("destination", searchState.destination.trim());
  params.set("departureDate", searchState.departureDate);
  params.set(
    "returnDate",
    searchState.tripType === "one-way" ? "" : searchState.returnDate
  );
  params.set("sortBy", searchState.sortBy || "recommended");
  params.set("adults", String(searchState.travelers.adults));
  params.set("children", String(searchState.travelers.children));
  params.set("cabinClass", searchState.travelers.cabinClass);

  return params;
};

export const buildSearchPath = (searchState) => {
  const params = buildSearchParams(searchState).toString();
  return `/flights?${params}`;
};

export const parseSearchStateFromParams = (search) => {
  const params = new URLSearchParams(search);
  const defaultState = createDefaultSearchState();

  return {
    tripType: normalizeTripType(params.get("tripType")),
    source: params.get("source")?.trim() || defaultState.source,
    destination: params.get("destination")?.trim() || defaultState.destination,
    departureDate: params.get("departureDate")?.trim() || defaultState.departureDate,
    returnDate: params.get("returnDate")?.trim() || defaultState.returnDate,
    sortBy:
      resultsSortOptions.find((option) => option.value === params.get("sortBy"))?.value ||
      defaultState.sortBy,
    travelers: {
      adults: parseCount(params.get("adults"), 1, 1),
      children: parseCount(params.get("children"), 0, 0),
      cabinClass: normalizeCabinClass(params.get("cabinClass")),
    },
  };
};

export const getTravelerCount = (travelers) => travelers.adults + travelers.children;

export const formatTravelerSummary = (travelers) => {
  const totalTravelers = getTravelerCount(travelers);
  return `${totalTravelers} Passenger${totalTravelers === 1 ? "" : "s"}`;
};
