/**
 * The country list behind the admin Users table's **Country** column and the
 * Country select on Add new user.
 *
 * `User.country` stores an ISO-3166 alpha-2 code, never a display name — the
 * schema's own note says why: two surfaces that each spell the country out
 * would eventually spell it differently. So this module owns the codes and
 * the English names are **computed**, not written down, the same call
 * `lib/config/locale.ts` makes for the `(GMT±HH:MM)` half of a time-zone
 * label: a country's name in English is not a fact about Lumen, and a
 * hand-kept table of 57 of them is 57 chances to be out of date.
 *
 * The names come from `Intl.DisplayNames`, which reads the runtime's own ICU
 * data — so Node's answer and a browser's can differ by a word. Every caller
 * therefore resolves them on the **server** and passes strings down, the same
 * arrangement the account page's time-zone labels use, and no name is ever
 * derived on both sides of the boundary where a mismatch could show up as a
 * hydration error.
 */

/**
 * A curated list rather than every code ISO defines. It covers the countries
 * the seed actually draws from plus the ones a real learner base would come
 * from; a picker is for choosing from, and 249 rows including uninhabited
 * territories is not that. Add codes here as they are needed.
 */
export const countryCodes: string[] = [
  "AE",
  "AR",
  "AT",
  "AU",
  "BD",
  "BE",
  "BR",
  "CA",
  "CH",
  "CL",
  "CN",
  "CO",
  "CZ",
  "DE",
  "DK",
  "EG",
  "ES",
  "FI",
  "FR",
  "GB",
  "GH",
  "GR",
  "HU",
  "ID",
  "IE",
  "IL",
  "IN",
  "IT",
  "JP",
  "KE",
  "KR",
  "MA",
  "MX",
  "MY",
  "NG",
  "NL",
  "NO",
  "NZ",
  "PE",
  "PH",
  "PK",
  "PL",
  "PT",
  "RO",
  "RS",
  "SA",
  "SE",
  "SG",
  "TH",
  "TR",
  "TW",
  "UA",
  "US",
  "VN",
  "ZA",
]

const displayNames = new Intl.DisplayNames(["en"], { type: "region" })

/**
 * "GB" → "United Kingdom". Falls back to the code itself for anything ICU
 * doesn't recognise, which is the honest answer — an account carrying a code
 * this list has never heard of should still render as *something* rather than
 * quietly reading as no country at all.
 */
export function countryName(code: string | null | undefined): string | null {
  if (!code) return null
  try {
    return displayNames.of(code.toUpperCase()) ?? code
  } catch {
    return code
  }
}

export type CountryOption = { code: string; name: string }

/**
 * The select's options, sorted by the *name* rather than the code — nobody
 * looks for Germany under D-E. Sorted with `localeCompare` so accented names
 * land where a reader expects them.
 */
export function countryOptions(): CountryOption[] {
  return countryCodes
    .map((code) => ({ code, name: countryName(code) ?? code }))
    .sort((a, b) => a.name.localeCompare(b.name, "en"))
}
