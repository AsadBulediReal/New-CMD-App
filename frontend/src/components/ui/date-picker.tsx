import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DatePickerProps {
  date: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  accentColor?: string;
}

export function DatePicker({
  date,
  onChange,
  placeholder = "Pick a date",
  className,
  disabled = false,
  accentColor = "violet",
}: DatePickerProps) {
  const ringClass =
    accentColor === "blue"
      ? "focus:ring-blue-500/30 focus:border-blue-500/50 data-[state=open]:border-blue-500/50"
      : accentColor === "sky"
      ? "focus:ring-sky-500/30 focus:border-sky-500/50 data-[state=open]:border-sky-500/50"
      : "focus:ring-violet-500/30 focus:border-violet-500/50 data-[state=open]:border-violet-500/50";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-medium h-10 rounded-xl border border-border bg-background px-4 hover:bg-muted/50 transition-all",
            ringClass,
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-60" />
          <span className="flex-1 truncate text-sm">
            {date ? format(date, "MMM d, yyyy") : placeholder}
          </span>
          {date && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange(undefined);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.stopPropagation();
                  onChange(undefined);
                }
              }}
              className="ml-1 rounded-full p-0.5 hover:bg-muted opacity-50 hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border-border bg-background shadow-2xl rounded-2xl" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onChange}
          captionLayout="dropdown"
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
