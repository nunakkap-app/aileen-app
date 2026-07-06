import { cookies } from "next/headers";
import "server-only";

export type Locale = "th" | "en";

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const val = cookieStore.get("aileen_locale")?.value;
  return val === "en" ? "en" : "th";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Dict = Record<string, any>;

const cache: Partial<Record<Locale, Dict>> = {};

export async function getDictionary(locale: Locale): Promise<Dict> {
  if (cache[locale]) return cache[locale]!;
  const mod = await import(`@/dictionaries/${locale}.json`);
  cache[locale] = mod.default ?? mod;
  return cache[locale]!;
}
