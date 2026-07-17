"use client";

import { useState } from "react";
import { Clock, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  customDateAtNoon,
  endOfMonthNoon,
  inOneHour,
  nextWeekNoon,
  thisFridayAtNine,
  tomorrowNoon,
} from "@/lib/remind-at";

type RemindLaterMenuProps = {
  disabled?: boolean;
  onRemind: (remindAt: Date) => void;
  size?: "default" | "sm";
};

export function RemindLaterMenu({
  disabled,
  onRemind,
  size = "sm",
}: RemindLaterMenuProps) {
  const [customOpen, setCustomOpen] = useState(false);
  const [selected, setSelected] = useState<Date | undefined>();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              size={size}
              variant="outline"
              className="gap-1"
              disabled={disabled}
            />
          }
        >
          <Clock className="size-3.5" />
          Remind me later
          <ChevronDown className="size-3.5 opacity-60" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-48">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Relative</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onRemind(inOneHour())}>
              In 1 hour
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRemind(tomorrowNoon())}>
              Tomorrow
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRemind(nextWeekNoon())}>
              Next week
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>Absolute</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onRemind(thisFridayAtNine())}>
              This Friday 9:00
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRemind(endOfMonthNoon())}>
              End of month
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setSelected(undefined);
              setCustomOpen(true);
            }}
          >
            Custom date…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={customOpen} onOpenChange={setCustomOpen}>
        <DialogContent className="sm:max-w-fit">
          <DialogHeader>
            <DialogTitle>Remind me later</DialogTitle>
            <DialogDescription>
              Pick a date. We&apos;ll surface this approval again at noon that
              day.
            </DialogDescription>
          </DialogHeader>
          <Calendar
            mode="single"
            selected={selected}
            onSelect={setSelected}
            disabled={{ before: new Date() }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!selected}
              onClick={() => {
                if (!selected) return;
                onRemind(customDateAtNoon(selected));
                setCustomOpen(false);
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
