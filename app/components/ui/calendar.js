import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const Calendar = React.forwardRef(
  (
    {
      mode = "single",
      selected,
      onSelect,
      initialFocus = false,
      className = "",
      ...props
    },
    ref
  ) => {
    const [currentDate, setCurrentDate] = useState(selected || new Date());

    const getDaysInMonth = (date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startingDayOfWeek = firstDay.getDay();

      return { daysInMonth, startingDayOfWeek };
    };

    const goToPreviousMonth = () => {
      setCurrentDate(
        new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
      );
    };

    const goToNextMonth = () => {
      setCurrentDate(
        new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
      );
    };

    const handleDateClick = (day) => {
      const selectedDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        day
      );
      onSelect(selectedDate);
    };

    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const renderCalendarDays = () => {
      const days = [];

      // Add empty cells for days before the first day of the month
      for (let i = 0; i < startingDayOfWeek; i++) {
        days.push(<div key={`empty-${i}`} className="p-2" />);
      }

      // Add days of the month
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          day
        );
        const isSelected =
          selected &&
          date.getDate() === selected.getDate() &&
          date.getMonth() === selected.getMonth() &&
          date.getFullYear() === selected.getFullYear();

        days.push(
          <button
            key={day}
            onClick={() => handleDateClick(day)}
            className={`p-2 rounded-md hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
              isSelected ? "bg-primary text-primary-foreground" : ""
            }`}
          >
            {day}
          </button>
        );
      }

      return days;
    };

    return (
      <div ref={ref} className={`p-3 ${className}`} {...props}>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={goToPreviousMonth}
            className="p-1 hover:bg-accent rounded-md"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="text-sm font-semibold">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button
            onClick={goToNextMonth}
            className="p-1 hover:bg-accent rounded-md"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {daysOfWeek.map((day) => (
            <div
              key={day}
              className="p-2 text-center text-xs font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}
          {renderCalendarDays()}
        </div>
      </div>
    );
  }
);

Calendar.displayName = "Calendar";

export { Calendar };
