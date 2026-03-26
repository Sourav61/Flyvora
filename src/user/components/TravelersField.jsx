import { useEffect, useMemo, useRef, useState } from "react";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import StyledSelectField from "./StyledSelectField";
import "./travelersField.scss";

const formatTravelerSummary = ({ adults, children, cabinClass }) => {
  const parts = [`${adults} Adult${adults === 1 ? "" : "s"}`];

  if (children > 0) {
    parts.push(`${children} Child${children === 1 ? "" : "ren"}`);
  }

  parts.push(cabinClass);

  return parts.join(", ");
};

const TravelersField = ({ value, cabinOptions, canSelectCabin, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [draftValue, setDraftValue] = useState(value);
  const fieldRef = useRef(null);
  const summary = useMemo(() => formatTravelerSummary(value), [value]);

  useEffect(() => {
    setDraftValue(value);
  }, [value]);

  useEffect(() => {
    if (!canSelectCabin) {
      setDraftValue((current) => ({ ...current, cabinClass: "Economy" }));
    }
  }, [canSelectCabin]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (fieldRef.current && !fieldRef.current.contains(event.target)) {
        setDraftValue(value);
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  return (
    <div className="travelers-field" ref={fieldRef}>
      <button
        type="button"
        className={`travelers-field__trigger ${isOpen ? "travelers-field__trigger--open" : ""}`}
        onClick={() => setIsOpen((current) => !current)}
      >
        <GroupOutlinedIcon fontSize="small" />
        <span className="travelers-field__value">{summary}</span>
        <ExpandMoreRoundedIcon fontSize="small" />
      </button>

      {isOpen ? (
        <div className="travelers-field__dropdown">
          <div className="travelers-field__section">
            <div className="travelers-field__section-head">
              <h3>Cabin class</h3>
              {!canSelectCabin ? (
                <p>
                  We can only show Economy prices for this search.
                  <br />
                  To see Business, Premium Economy, and First Class options, please tell us your travel
                  dates and destination.
                </p>
              ) : null}
            </div>
            <div className="travelers-field__select-wrap">
              <StyledSelectField
                className="styled-select--cabin"
                value={canSelectCabin ? draftValue.cabinClass : "Economy"}
                disabled={!canSelectCabin}
                options={canSelectCabin ? cabinOptions : [{ value: "Economy", label: "Economy" }]}
                onChange={(nextValue) =>
                  setDraftValue((current) => ({ ...current, cabinClass: nextValue }))
                }
              />
            </div>
          </div>

          <div className="travelers-field__counter">
            <div className="travelers-field__counter-copy">
              <strong>Adults</strong>
              <span>Aged 18+</span>
            </div>
            <div className="travelers-field__stepper">
              <button
                type="button"
                disabled={draftValue.adults <= 1}
                onClick={() =>
                  setDraftValue((current) => ({ ...current, adults: Math.max(1, current.adults - 1) }))
                }
              >
                <RemoveRoundedIcon fontSize="small" />
              </button>
              <span>{draftValue.adults}</span>
              <button
                type="button"
                onClick={() => setDraftValue((current) => ({ ...current, adults: current.adults + 1 }))}
              >
                <AddRoundedIcon fontSize="small" />
              </button>
            </div>
          </div>

          <div className="travelers-field__counter">
            <div className="travelers-field__counter-copy">
              <strong>Children</strong>
              <span>Aged 0 to 17</span>
            </div>
            <div className="travelers-field__stepper">
              <button
                type="button"
                disabled={draftValue.children <= 0}
                onClick={() =>
                  setDraftValue((current) => ({ ...current, children: Math.max(0, current.children - 1) }))
                }
              >
                <RemoveRoundedIcon fontSize="small" />
              </button>
              <span>{draftValue.children}</span>
              <button
                type="button"
                onClick={() => setDraftValue((current) => ({ ...current, children: current.children + 1 }))}
              >
                <AddRoundedIcon fontSize="small" />
              </button>
            </div>
          </div>

          <p className="travelers-field__note">
            Your age at time of travel must be valid for the age category booked. Airlines have
            restrictions on under 18s travelling alone.
          </p>
          <p className="travelers-field__note">
            Age limits and policies for travelling with children may vary so please check with the
            airline before booking.
          </p>

          <div className="travelers-field__footer">
            <button
              type="button"
              className="travelers-field__apply"
              onClick={() => {
                onChange({
                  ...draftValue,
                  cabinClass: canSelectCabin ? draftValue.cabinClass : "Economy",
                });
                setIsOpen(false);
              }}
            >
              Apply
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default TravelersField;
