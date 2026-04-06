import { useEffect, useMemo, useRef, useState } from "react";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import "./styledSelectField.scss";

const StyledSelectField = ({ value, options, onChange, disabled = false, className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const fieldRef = useRef(null);
  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) || options[0],
    [options, value]
  );

  useEffect(() => {
    if (disabled) {
      setIsOpen(false);
    }
  }, [disabled]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (fieldRef.current && !fieldRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      className={`styled-select ${className} ${isOpen ? "is-open" : ""} ${disabled ? "is-disabled" : ""}`.trim()}
      ref={fieldRef}
    >
      <button
        type="button"
        className="styled-select__trigger"
        disabled={disabled}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="styled-select__value">{selectedOption?.label}</span>
        <ExpandMoreRoundedIcon className="styled-select__chevron" fontSize="small" />
      </button>

      {isOpen ? (
        <div className="styled-select__menu">
          {options.map((option) => (
            <button
              type="button"
              key={option.value}
              className={`styled-select__option ${option.value === value ? "styled-select__option--selected" : ""}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              <span>{option.label}</span>
              {option.value === value ? <CheckRoundedIcon fontSize="small" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default StyledSelectField;
