import FlightTakeoffOutlinedIcon from "@mui/icons-material/FlightTakeoffOutlined";
import FlightLandOutlinedIcon from "@mui/icons-material/FlightLandOutlined";
import SyncAltRoundedIcon from "@mui/icons-material/SyncAltRounded";
import DateTimeField from "./DateTimeField";
import StyledSelectField from "./StyledSelectField";
import TravelersField from "./TravelersField";
import {
  cabinOptions,
  canUnlockCabinClasses,
  getTodayDateValue,
  tripOptions,
} from "../search/searchUtils";

const FlightSearchPanel = ({
  value,
  onChange,
  onSubmit,
  submitLabel = "Search Flights",
  message = "",
  fieldErrors = {},
  className = "",
  id,
}) => {
  const todayDateValue = getTodayDateValue();
  const returnMinDate = value.departureDate || todayDateValue;
  const allowCabinSelection = canUnlockCabinClasses(value);
  const panelClassName = ["search-panel", className].filter(Boolean).join(" ");

  const updateSearchState = (updates) => {
    onChange({
      ...value,
      ...updates,
    });
  };

  return (
    <form className={panelClassName} id={id} onSubmit={onSubmit}>
      <div className="search-panel__row search-panel__row--top">
        <label className="search-panel__field">
          <span>Trip Preference</span>
          <div className="search-panel__control search-panel__control--select">
            <SyncAltRoundedIcon fontSize="small" />
            <StyledSelectField
              className="styled-select--trip"
              value={value.tripType}
              options={tripOptions}
              onChange={(nextValue) =>
                updateSearchState({
                  tripType: nextValue,
                  returnDate: nextValue === "one-way" ? "" : value.returnDate,
                })
              }
            />
          </div>
        </label>

        <label className={`search-panel__field ${fieldErrors.source ? "search-panel__field--error" : ""}`}>
          <span>Departure</span>
          <div className="search-panel__control">
            <FlightTakeoffOutlinedIcon fontSize="small" />
            <input
              name="source"
              type="text"
              placeholder="From where?"
              value={value.source}
              onChange={(event) => updateSearchState({ source: event.target.value })}
            />
          </div>
          {fieldErrors.source ? <small className="search-panel__error">{fieldErrors.source}</small> : null}
        </label>

        <label
          className={`search-panel__field ${fieldErrors.destination ? "search-panel__field--error" : ""}`}
        >
          <span>Arrival</span>
          <div className="search-panel__control">
            <FlightLandOutlinedIcon fontSize="small" />
            <input
              name="destination"
              type="text"
              placeholder="To where?"
              value={value.destination}
              onChange={(event) => updateSearchState({ destination: event.target.value })}
            />
          </div>
          {fieldErrors.destination ? (
            <small className="search-panel__error">{fieldErrors.destination}</small>
          ) : null}
        </label>
      </div>

      <div className="search-panel__row search-panel__row--bottom">
        <div className={`search-panel__field ${fieldErrors.departureDate ? "search-panel__field--error" : ""}`}>
          <span>Departure Date</span>
          <div className="search-panel__control search-panel__control--picker">
            <DateTimeField
              date={value.departureDate}
              placeholder="Select departure"
              dateOnly
              minDate={todayDateValue}
              onDateChange={(nextValue) => updateSearchState({ departureDate: nextValue })}
            />
          </div>
          {fieldErrors.departureDate ? (
            <small className="search-panel__error">{fieldErrors.departureDate}</small>
          ) : null}
        </div>

        <div
          className={`search-panel__field ${value.tripType === "one-way" ? "search-panel__field--disabled" : ""} ${fieldErrors.returnDate ? "search-panel__field--error" : ""}`}
        >
          <span>Return Date</span>
          <div className="search-panel__control search-panel__control--picker">
            <DateTimeField
              date={value.returnDate}
              placeholder={value.tripType === "one-way" ? "One way trip" : "Select return"}
              dateOnly
              disabled={value.tripType === "one-way"}
              minDate={returnMinDate}
              onDateChange={(nextValue) => updateSearchState({ returnDate: nextValue })}
            />
          </div>
          {fieldErrors.returnDate ? (
            <small className="search-panel__error">{fieldErrors.returnDate}</small>
          ) : null}
        </div>

        <div className="search-panel__field">
          <span>Travelers</span>
          <div className="search-panel__control search-panel__control--picker">
            <TravelersField
              value={value.travelers}
              cabinOptions={cabinOptions}
              canSelectCabin={allowCabinSelection}
              onChange={(nextValue) => updateSearchState({ travelers: nextValue })}
            />
          </div>
        </div>

        <div className="search-panel__cta">
          <button type="submit" className="button button--primary">
            {submitLabel}
          </button>
        </div>
      </div>

      {message ? (
        <div className="search-panel__message" role="alert">
          {message}
        </div>
      ) : null}
    </form>
  );
};

export default FlightSearchPanel;
