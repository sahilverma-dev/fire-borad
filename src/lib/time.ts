const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

export function timeAgo(value: Date | null | undefined): string {
  if (!value) return "just now";
  const diff = Date.now() - value.getTime();

  if (diff < MINUTE) return "just now";
  if (diff < HOUR) {
    const mins = Math.floor(diff / MINUTE);
    return `${mins} min ago`;
  }
  if (diff < DAY) {
    const hours = Math.floor(diff / HOUR);
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }
  if (diff < WEEK) {
    const days = Math.floor(diff / DAY);
    return `${days} ${days === 1 ? "day" : "days"} ago`;
  }

  return value.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: value.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

export function pluralize(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}
