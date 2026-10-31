// Text helpers. The site is English-only; any "ko" fields in the data files are ignored.
export function L({ en }) {
  return <>{en}</>;
}

// Convenience for { en, ko } objects from YAML
export function T({ v }) {
  if (!v) return null;
  if (typeof v === "string") return <>{v}</>;
  return <>{v.en}</>;
}
