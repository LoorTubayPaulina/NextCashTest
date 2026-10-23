// Pure search param helpers: no database or server-only imports, so they can be
// shared by server components and client components alike.

export type SearchParamValue = string | string[] | undefined;

// True when the param is absent, or present exactly once and equal to the canonical value.
// Repeated params (arrays) are never canonical.
export function isCanonicalSearchParam(value: SearchParamValue, canonical: string): boolean {
  if (value === undefined) {
    return true;
  }

  if (Array.isArray(value)) {
    return false;
  }

  return value === canonical;
}
