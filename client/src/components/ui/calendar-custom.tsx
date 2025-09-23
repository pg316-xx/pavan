import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarCustomProps {
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
}

export default function CalendarCustom({ selectedDate, onDateSelect }: CalendarCustomProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDateString = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  const parseSelectedDate = () => {
    if (!selectedDate) return null;
    return new Date(selectedDate);
  };

  const isSelectedDate = (day: number) => {
    const parsed = parseSelectedDate();
    if (!parsed) return false;
    
    return (
      parsed.getFullYear() === currentMonth.getFullYear() &&
      parsed.getMonth() === currentMonth.getMonth() &&
      parsed.getDate() === day
    );
  };

  const handleDateClick = (day: number) => {
    const dateString = formatDateString(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    onDateSelect(dateString);
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={previousMonth}
          className="p-2 hover:bg-secondary rounded-lg transition-colors"
          data-testid="button-previous-month"
        >
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        </Button>
        <h4 className="text-lg font-semibold text-card-foreground" data-testid="text-current-month">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={nextMonth}
          className="p-2 hover:bg-secondary rounded-lg transition-colors"
          data-testid="button-next-month"
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>

      <div className="calendar-grid border border-border rounded-lg overflow-hidden">
        {/* Day headers */}
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="bg-secondary text-center py-2 text-sm font-medium text-secondary-foreground">
            {day}
          </div>
        ))}
        
        {/* Empty cells for days before month starts */}
        {emptyDays.map((empty) => (
          <div key={`empty-${empty}`} className="calendar-day bg-muted/30"></div>
        ))}
        
        {/* Days of the month */}
        {days.map((day) => (
          <div
            key={day}
            className={`calendar-day text-sm cursor-pointer border border-border transition-all ${
              isSelectedDate(day)
                ? "bg-primary text-primary-foreground selected"
                : "bg-white hover:bg-accent/20"
            }`}
            onClick={() => handleDateClick(day)}
            data-testid={`calendar-day-${day}`}
          >
            {day}
          </div>
        ))}
      </div>
    </div>
  );
}
