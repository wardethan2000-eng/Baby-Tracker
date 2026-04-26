import { formatDistanceToNow, format, differenceInWeeks, differenceInMonths, differenceInYears } from "date-fns";

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
  if (diffHours < 12) {
    return formatDistanceToNow(date, { addSuffix: true });
  }
  return format(date, "h:mm a");
}

export function formatTime(date: Date): string {
  return format(date, "h:mm a");
}

export function formatDate(date: Date): string {
  return format(date, "MMM d, yyyy");
}

export function formatChildAge(birthDate: Date): string {
  const now = new Date();
  const weeks = differenceInWeeks(now, birthDate);
  const months = differenceInMonths(now, birthDate);
  const years = differenceInYears(now, birthDate);

  if (years >= 2) return `${years} year${years > 1 ? "s" : ""}`;
  if (months >= 3) return `${months} month${months > 1 ? "s" : ""}`;
  return `${weeks} week${weeks !== 1 ? "s" : ""}`;
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}