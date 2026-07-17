import {
  addDays,
  addHours,
  addWeeks,
  endOfMonth,
  setHours,
  setMilliseconds,
  setMinutes,
  setSeconds,
} from "date-fns";

export function atNoon(date: Date): Date {
  return setMilliseconds(setSeconds(setMinutes(setHours(date, 12), 0), 0), 0);
}

export function inOneHour(): Date {
  return addHours(new Date(), 1);
}

export function tomorrowNoon(): Date {
  return atNoon(addDays(new Date(), 1));
}

export function nextWeekNoon(): Date {
  return atNoon(addWeeks(new Date(), 1));
}

/** Upcoming Friday at 9:00 local; if today is Friday after 9:00, next Friday. */
export function thisFridayAtNine(): Date {
  const now = new Date();
  const day = now.getDay();
  let daysUntil = (5 - day + 7) % 7;
  if (daysUntil === 0) {
    const nine = setMilliseconds(
      setSeconds(setMinutes(setHours(new Date(now), 9), 0), 0),
      0,
    );
    if (now.getTime() < nine.getTime()) return nine;
    daysUntil = 7;
  }
  const result = new Date(now);
  result.setDate(now.getDate() + daysUntil);
  return setMilliseconds(
    setSeconds(setMinutes(setHours(result, 9), 0), 0),
    0,
  );
}

export function endOfMonthNoon(): Date {
  return atNoon(endOfMonth(new Date()));
}

export function customDateAtNoon(date: Date): Date {
  return atNoon(date);
}
