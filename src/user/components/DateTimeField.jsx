import { useEffect, useMemo, useRef, useState } from "react";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import "./dateTimeField.scss";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTH_LABEL = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" });
const DATE_LABEL = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});
const DATE_ONLY_LABEL = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const toDateValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const buildTimeOptions = () => {
  const options = [];

  for (let hour = 6; hour <= 22; hour += 1) {
    for (let minute = 0; minute < 60; minute += 30) {
      const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      const label = new Date(`2000-01-01T${value}:00`).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      });
      options.push({ value, label });
    }
  }

  return options;
};

const TIME_OPTIONS = buildTimeOptions();

const getMonthStart = (dateValue) => {
  if (!dateValue) {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  }

  const selected = new Date(`${dateValue}T00:00:00`);
  return new Date(selected.getFullYear(), selected.getMonth(), 1);
};

const formatDisplayValue = (date, time, placeholder, dateOnly) => {
  if (!date && !time) {
    return placeholder;
  }

  if (dateOnly && date) {
    return DATE_ONLY_LABEL.format(new Date(`${date}T00:00:00`));
  }

  if (date && time) {
    return DATE_LABEL.format(new Date(`${date}T${time}:00`));
  }

  if (date) {
    return DATE_ONLY_LABEL.format(new Date(`${date}T00:00:00`));
  }

  const selectedTime = TIME_OPTIONS.find((option) => option.value === time);
  return selectedTime?.label || time;
};

const buildCalendarDays = (monthDate, minDate) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const firstWeekDay = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const days = [];

  for (let index = firstWeekDay - 1; index >= 0; index -= 1) {
    days.push({
      key: `prev-${index}`,
      label: daysInPrevMonth - index,
      inMonth: false,
      value: null,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const value = toDateValue(new Date(year, month, day));
    days.push({
      key: value,
      label: day,
      inMonth: true,
      isUnavailable: Boolean(minDate && value < minDate),
      value,
    });
  }

  while (days.length % 7 !== 0) {
    days.push({
      key: `next-${days.length}`,
      label: days.length % 7,
      inMonth: false,
      value: null,
    });
  }

  return days;
};

const DateTimeField = ({
  date,
  time,
  onDateChange,
  onTimeChange,
  placeholder = "Select date & time",
  timeLabel = "Select Time",
  disabled = false,
  dateOnly = false,
  minDate = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(date);
  const [draftTime, setDraftTime] = useState(time);
  const [monthDate, setMonthDate] = useState(getMonthStart(date));
  const fieldRef = useRef(null);

  useEffect(() => {
    setDraftDate(date);
    setDraftTime(time);
    setMonthDate(getMonthStart(date));
  }, [date, time]);

  useEffect(() => {
    if (disabled) {
      setIsOpen(false);
    }
  }, [disabled]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (fieldRef.current && !fieldRef.current.contains(event.target)) {
        setIsOpen(false);
        setDraftDate(date);
        setDraftTime(time);
        setMonthDate(getMonthStart(date));
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [date, time]);

  const calendarDays = useMemo(() => buildCalendarDays(monthDate, minDate), [monthDate, minDate]);
  const displayValue = useMemo(
    () => formatDisplayValue(date, time, placeholder, dateOnly),
    [date, time, placeholder, dateOnly]
  );

  const openDropdown = () => {
    if (disabled) {
      return;
    }

    setDraftDate(date);
    setDraftTime(time);
    setMonthDate(getMonthStart(date));
    setIsOpen(true);
  };

  const commitSelection = (nextDate, nextTime = draftTime) => {
    const resolvedTime = dateOnly ? "" : nextTime;

    setDraftDate(nextDate);
    setDraftTime(resolvedTime);
    onDateChange(nextDate);

    if (onTimeChange) {
      onTimeChange(resolvedTime);
    }

    setIsOpen(false);
  };

  const handleDaySelect = (nextDate) => {
    if (!nextDate) {
      return;
    }

    if (dateOnly) {
      commitSelection(nextDate, "");
      return;
    }

    setDraftDate(nextDate);
  };

  const handleTimeSelect = (nextTime) => {
    const nextDate = draftDate || date;

    setDraftTime(nextTime);

    if (!nextDate) {
      return;
    }

    commitSelection(nextDate, nextTime);
  };

  return (
    <div className="date-time-field" ref={fieldRef}>
      <button
        type="button"
        className={`date-time-field__trigger ${isOpen ? "date-time-field__trigger--open" : ""} ${disabled ? "date-time-field__trigger--disabled" : ""}`}
        onClick={openDropdown}
        disabled={disabled}
      >
        <CalendarMonthOutlinedIcon fontSize="small" />
        <span className="date-time-field__value">{displayValue}</span>
      </button>

      {isOpen ? (
        <div className={`date-time-field__dropdown ${dateOnly ? "date-time-field__dropdown--date-only" : ""}`}>
          <div className={`date-time-field__panel ${dateOnly ? "date-time-field__panel--date-only" : ""}`}>
            <div className="date-time-field__calendar">
              <div className="date-time-field__header">
                <h3>{MONTH_LABEL.format(monthDate)}</h3>
                <div className="date-time-field__nav">
                  <button
                    type="button"
                    onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1))}
                  >
                    <ChevronLeftRoundedIcon fontSize="small" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1))}
                  >
                    <ChevronRightRoundedIcon fontSize="small" />
                  </button>
                </div>
              </div>

              <div className="date-time-field__weekdays">
                {WEEKDAYS.map((weekday) => (
                  <span key={weekday}>{weekday}</span>
                ))}
              </div>

              <div className="date-time-field__days">
                {calendarDays.map((day) => (
                  <button
                    type="button"
                    key={day.key}
                    className={`date-time-field__day ${!day.inMonth ? "date-time-field__day--muted" : ""} ${day.isUnavailable ? "date-time-field__day--unavailable" : ""} ${draftDate === day.value ? "date-time-field__day--selected" : ""}`}
                    disabled={!day.value || day.isUnavailable}
                    onClick={() => handleDaySelect(day.value)}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            {dateOnly ? null : (
              <>
                <div className="date-time-field__divider" />

                <div className="date-time-field__times">
                  <h3>{timeLabel}</h3>
                  <div className="date-time-field__time-list">
                    {TIME_OPTIONS.map((option) => (
                      <button
                        type="button"
                        key={option.value}
                        className={`date-time-field__time ${draftTime === option.value ? "date-time-field__time--selected" : ""}`}
                        onClick={() => handleTimeSelect(option.value)}
                      >
                        <span>{option.label}</span>
                        {draftTime === option.value ? <CheckRoundedIcon fontSize="small" /> : null}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

        </div>
      ) : null}
    </div>
  );
};

export default DateTimeField;
