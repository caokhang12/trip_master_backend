export function normalizeIsoCurrency(input: unknown): string | undefined {
  if (typeof input !== 'string') return undefined;
  const v = input.trim();
  if (!v) return undefined;
  const upper = v.toUpperCase();
  if (upper.length !== 3) return undefined;
  return upper;
}

export function normalizeLanguageCode(input: unknown): string | undefined {
  if (typeof input !== 'string') return undefined;
  const v = input.trim();
  if (!v) return undefined;

  const lower = v.toLowerCase();
  if (!/^[a-z]{2}(-[a-z]{2})?$/.test(lower)) return undefined;
  return lower;
}

export function normalizeTimeHHmm(input: unknown): string | undefined {
  if (typeof input !== 'string') return undefined;
  const v = input.trim();
  if (!v) return undefined;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) return undefined;
  return v;
}
