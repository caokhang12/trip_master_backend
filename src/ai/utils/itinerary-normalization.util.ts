import { GeneratedItinerary } from '../dto/generated-itinerary.dto';
import { normalizeIsoCurrency } from '../../shared/utils/normalization.util';

export function applyCurrencyFallback(
  itinerary: GeneratedItinerary,
  currencyHint?: string,
): GeneratedItinerary {
  const hint = normalizeIsoCurrency(currencyHint);
  const current = normalizeIsoCurrency(itinerary.currency);
  const resolved = current ?? hint;
  if (!resolved) return itinerary;

  const out: GeneratedItinerary = {
    ...itinerary,
    currency: resolved,
    days: (itinerary.days ?? []).map((d) => ({
      ...d,
      activities: (d.activities ?? []).map((a) => ({
        ...a,
        currency: normalizeIsoCurrency(a.currency) ?? resolved,
      })),
    })),
  };

  return out;
}
