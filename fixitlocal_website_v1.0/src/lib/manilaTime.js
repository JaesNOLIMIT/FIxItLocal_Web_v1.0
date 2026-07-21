export const MANILA_TIME_ZONE = 'Asia/Manila';
const MANILA_UTC_OFFSET_MINUTES = 8 * 60;

const MANILA_DATE_TIME_PARTS_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: MANILA_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

const MANILA_DATE_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  timeZone: MANILA_TIME_ZONE,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

const MANILA_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  timeZone: MANILA_TIME_ZONE,
  hour: 'numeric',
  minute: '2-digit',
});

const MANILA_MONTH_YEAR_FORMATTER = new Intl.DateTimeFormat(undefined, {
  timeZone: MANILA_TIME_ZONE,
  month: 'long',
  year: 'numeric',
});

const MANILA_WEEKDAY_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: MANILA_TIME_ZONE,
  weekday: 'short',
});

function pad2(value) {
  return String(value).padStart(2, '0');
}

function pad4(value) {
  return String(value).padStart(4, '0');
}

function ensureDate(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getPartMap(parts) {
  const map = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = part.value;
    }
  }
  return map;
}

export function getManilaDateTimeParts(value) {
  const date = ensureDate(value);
  if (!date) {
    return null;
  }
  const map = getPartMap(MANILA_DATE_TIME_PARTS_FORMATTER.formatToParts(date));
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

export function getDateKeyInManila(value) {
  const parts = getManilaDateTimeParts(value);
  if (!parts) {
    return '';
  }
  return `${pad4(parts.year)}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

export function getTodayDateKeyInManila() {
  return getDateKeyInManila(new Date());
}

export function getMinutesFromMidnightInManila(value) {
  const parts = getManilaDateTimeParts(value);
  if (!parts) {
    return null;
  }
  return parts.hour * 60 + parts.minute;
}

export function formatDateTimeInManila(value, fallback = 'N/A') {
  const date = ensureDate(value);
  if (!date) {
    return fallback;
  }
  return MANILA_DATE_TIME_FORMATTER.format(date);
}

export function formatTimeInManila(value, fallback = '-') {
  const date = ensureDate(value);
  if (!date) {
    return fallback;
  }
  return MANILA_TIME_FORMATTER.format(date);
}

export function formatMonthYearInManila(value, fallback = '') {
  const date = ensureDate(value);
  if (!date) {
    return fallback;
  }
  return MANILA_MONTH_YEAR_FORMATTER.format(date);
}

export function getWeekdayIndexInManila(value) {
  const date = ensureDate(value);
  if (!date) {
    return null;
  }
  const weekday = MANILA_WEEKDAY_FORMATTER.format(date);
  const map = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[weekday] ?? null;
}

export function parseManilaDateTimeLocal(value) {
  if (!value) {
    return null;
  }
  const trimmed = String(value).trim();
  const match = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/
  );
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] || 0);

  if (
    !Number.isInteger(year) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    return null;
  }

  const check = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() + 1 !== month ||
    check.getUTCDate() !== day ||
    check.getUTCHours() !== hour ||
    check.getUTCMinutes() !== minute ||
    check.getUTCSeconds() !== second
  ) {
    return null;
  }

  return { year, month, day, hour, minute, second };
}

export function fromManilaDateTimeLocal(value) {
  const parsed = parseManilaDateTimeLocal(value);
  if (!parsed) {
    return null;
  }

  const utcMillis =
    Date.UTC(
      parsed.year,
      parsed.month - 1,
      parsed.day,
      parsed.hour,
      parsed.minute,
      parsed.second
    ) -
    MANILA_UTC_OFFSET_MINUTES * 60_000;

  return new Date(utcMillis).toISOString();
}

export function toManilaDateTimeLocal(value) {
  const parts = getManilaDateTimeParts(value);
  if (!parts) {
    return '';
  }
  return `${pad4(parts.year)}-${pad2(parts.month)}-${pad2(parts.day)}T${pad2(parts.hour)}:${pad2(
    parts.minute
  )}`;
}

export function isSameDateInManila(firstValue, secondValue) {
  const first = getDateKeyInManila(firstValue);
  const second = getDateKeyInManila(secondValue);
  return Boolean(first && second && first === second);
}

export function addDaysToDateKey(dateKey, days) {
  const match = String(dateKey || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return '';
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const base = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(base.getTime())) {
    return '';
  }
  base.setUTCDate(base.getUTCDate() + Number(days || 0));
  return `${pad4(base.getUTCFullYear())}-${pad2(base.getUTCMonth() + 1)}-${pad2(base.getUTCDate())}`;
}
