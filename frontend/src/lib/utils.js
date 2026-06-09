import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function parseToISTDate(dateInput) {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return dateInput;

  let str = String(dateInput).trim();
  if (!str) return null;

  // Check if it's a number (timestamp)
  if (!isNaN(str) && /^\d+$/.test(str)) {
    return new Date(Number(str));
  }

  // Date-only string (e.g. YYYY-MM-DD) -> treat as midnight in Asia/Kolkata
  const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (dateOnlyRegex.test(str)) {
    str = `${str}T00:00:00+05:30`;
  } else {
    // If it has time but lacks timezone offset / indicator, treat as Asia/Kolkata
    const hasTimezone = /Z|([+-]\d{2}:?\d{2})$/i.test(str);
    if (!hasTimezone) {
      str = str.replace(' ', 'T');
      str = `${str}+05:30`;
    }
  }

  const date = new Date(str);
  if (isNaN(date.getTime())) {
    return new Date(dateInput);
  }
  return date;
}

export function formatDate(dateInput) {
  if (!dateInput) return "-";
  const date = parseToISTDate(dateInput);
  if (!date || isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

export function formatTime(dateInput) {
  if (!dateInput) return "-";
  const date = parseToISTDate(dateInput);
  if (!date || isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  }).replace(/(am|pm|a\.m\.|p\.m\.)/i, (match) => match.toUpperCase());
}

export function formatDateTime(dateInput) {
  if (!dateInput) return "-";
  const date = parseToISTDate(dateInput);
  if (!date || isNaN(date.getTime())) return "-";
  const formatted = date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  return formatted.replace(/\s+/g, ' ').replace(/(am|pm|a\.m\.|p\.m\.)/i, (match) => match.toUpperCase());
}

export function getISTDateString(dateInput) {
  const date = parseToISTDate(dateInput);
  if (!date || isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const y = parts.find(p => p.type === 'year').value;
  const m = parts.find(p => p.type === 'month').value;
  const d = parts.find(p => p.type === 'day').value;
  return `${y}-${m}-${d}`;
}
