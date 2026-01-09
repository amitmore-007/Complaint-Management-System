import React, { useMemo } from "react";
import dayjs from "dayjs";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { MenuItem, TextField } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

const DateRangePicker = ({
  value,
  onChange,
  onApply,
  disabled,
  timezone,
  isDarkMode,
}) => {
  const muiTheme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: isDarkMode ? "dark" : "light",
        },
      }),
    [isDarkMode]
  );

  const interval = value?.interval || "day";

  const update = (patch) => {
    onChange?.({
      ...value,
      ...patch,
    });
  };

  const updateNested = (key, patch) => {
    onChange?.({
      ...value,
      [key]: {
        ...(value?.[key] || {}),
        ...patch,
      },
    });
  };

  return (
    <ThemeProvider theme={muiTheme}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <div
          className={`grid grid-cols-1 md:grid-cols-3 gap-4 rounded-2xl p-3 sm:p-4 border ${
            isDarkMode
              ? "border-gray-800 bg-black/30"
              : "border-gray-200 bg-gray-50"
          }`}
        >
          <div>
            <TextField
              select
              label="Interval"
              value={interval}
              onChange={(e) => update({ interval: e.target.value })}
              size="small"
              fullWidth
              SelectProps={{
                MenuProps: {
                  disableScrollLock: true,
                },
              }}
            >
              <MenuItem value="day">Day</MenuItem>
              <MenuItem value="month">Month</MenuItem>
              <MenuItem value="year">Year</MenuItem>
            </TextField>
          </div>

          {interval === "day" && (
            <>
              <div>
                <DatePicker
                  label="From"
                  value={value?.day?.from ? dayjs(value.day.from) : null}
                  onChange={(v) =>
                    updateNested("day", {
                      from: v ? v.format("YYYY-MM-DD") : "",
                    })
                  }
                  slotProps={{
                    textField: { size: "small", fullWidth: true },
                  }}
                />
              </div>
              <div>
                <DatePicker
                  label="To"
                  value={value?.day?.to ? dayjs(value.day.to) : null}
                  onChange={(v) =>
                    updateNested("day", {
                      to: v ? v.format("YYYY-MM-DD") : "",
                    })
                  }
                  slotProps={{
                    textField: { size: "small", fullWidth: true },
                  }}
                />
              </div>
            </>
          )}

          {interval === "month" && (
            <>
              <div>
                <DatePicker
                  label="From month"
                  views={["year", "month"]}
                  openTo="month"
                  format="YYYY-MM"
                  value={
                    value?.month?.from ? dayjs(`${value.month.from}-01`) : null
                  }
                  onChange={(v) =>
                    updateNested("month", {
                      from: v ? v.format("YYYY-MM") : "",
                    })
                  }
                  slotProps={{
                    textField: { size: "small", fullWidth: true },
                  }}
                />
              </div>
              <div>
                <DatePicker
                  label="To month"
                  views={["year", "month"]}
                  openTo="month"
                  format="YYYY-MM"
                  value={
                    value?.month?.to ? dayjs(`${value.month.to}-01`) : null
                  }
                  onChange={(v) =>
                    updateNested("month", {
                      to: v ? v.format("YYYY-MM") : "",
                    })
                  }
                  slotProps={{
                    textField: { size: "small", fullWidth: true },
                  }}
                />
              </div>
            </>
          )}

          {interval === "year" && (
            <>
              <div>
                <DatePicker
                  label="From year"
                  views={["year"]}
                  openTo="year"
                  format="YYYY"
                  value={
                    value?.year?.from ? dayjs(`${value.year.from}-01-01`) : null
                  }
                  onChange={(v) =>
                    updateNested("year", {
                      from: v ? v.format("YYYY") : "",
                    })
                  }
                  slotProps={{
                    textField: { size: "small", fullWidth: true },
                  }}
                />
              </div>
              <div>
                <DatePicker
                  label="To year"
                  views={["year"]}
                  openTo="year"
                  format="YYYY"
                  value={
                    value?.year?.to ? dayjs(`${value.year.to}-01-01`) : null
                  }
                  onChange={(v) =>
                    updateNested("year", {
                      to: v ? v.format("YYYY") : "",
                    })
                  }
                  slotProps={{
                    textField: { size: "small", fullWidth: true },
                  }}
                />
              </div>
            </>
          )}

          <div className="md:col-span-3 flex items-center justify-between gap-3 flex-wrap">
            <p
              className={`${
                isDarkMode ? "text-gray-500" : "text-gray-600"
              } text-sm`}
            >
              Timezone:{" "}
              <span
                className={`${
                  isDarkMode ? "text-gray-300" : "text-gray-800"
                } font-semibold`}
              >
                {timezone}
              </span>
            </p>

            <button
              onClick={onApply}
              disabled={disabled}
              className={`px-5 py-2.5 rounded-xl font-bold transition-all ${
                isDarkMode
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500"
                  : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500"
              } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              Apply
            </button>
          </div>
        </div>
      </LocalizationProvider>
    </ThemeProvider>
  );
};

export default DateRangePicker;
