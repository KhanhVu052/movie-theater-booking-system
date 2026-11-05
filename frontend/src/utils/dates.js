/**
 * Date helpers that work in the browser's LOCAL calendar.
 *
 * Do not use `date.toISOString().split('T')[0]` to get "today": toISOString() converts to UTC,
 * so in Vietnam (UTC+7) between 00:00 and 07:00 it returns YESTERDAY's date and late-night
 * showtimes disappear from the date tabs.
 */

const pad2 = (n) => String(n).padStart(2, '0');

/** Returns YYYY-MM-DD for the given Date in local time (defaults to now). */
export const toLocalDateStr = (date = new Date()) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

/** Returns YYYY-MM-DD for local "today + offsetDays" (offset may be negative). */
export const localDateStrFromToday = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return toLocalDateStr(d);
};
