const dayFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });
const timeFormatter = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });
const numberFormatter = new Intl.NumberFormat('ru-RU');

let regionNames: Intl.DisplayNames | null = null;
try {
  regionNames = new Intl.DisplayNames(['ru'], { type: 'region' });
} catch {
  regionNames = null;
}

/** «13 окт · 14:32» */
export const formatDateTime = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return `${dayFormatter.format(date).replace('.', '')} · ${timeFormatter.format(date)}`;
};

/** «13 окт» */
export const formatDay = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return dayFormatter.format(date).replace('.', '');
};

/** 1248 → «1 248» */
export const formatNumber = (value: number): string => {
  return numberFormatter.format(value).replace(/\s/g, ' ');
};

/** «ru» → «Россия» */
export const formatCountry = (code: string | null): string | null => {
  if (!code) {
    return null;
  }
  try {
    return regionNames?.of(code.toUpperCase()) ?? code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
};
