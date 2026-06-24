import { formatDistanceToNowStrict } from 'date-fns';

/** Formats a date as a compact relative time string (e.g. "3m", "2h", "5d"). */
export function timeAgo(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const distance = formatDistanceToNowStrict(d);
  // Compress "3 minutes" -> "3m", "2 hours" -> "2h", etc. for a Twitter-like compact format.
  return distance
    .replace(/ seconds?/, 's')
    .replace(/ minutes?/, 'm')
    .replace(/ hours?/, 'h')
    .replace(/ days?/, 'd')
    .replace(/ months?/, 'mo')
    .replace(/ years?/, 'y');
}
