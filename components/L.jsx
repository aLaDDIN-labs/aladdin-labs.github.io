// Bilingual text. Both languages are rendered; CSS shows the active one (html[data-lang]).
export function L({ en, ko }) {
  if (!ko) return <>{en}</>;
  return (
    <>
      <span className="en-only">{en}</span>
      <span className="ko-only">{ko}</span>
    </>
  );
}

// Convenience for { en, ko } objects from YAML
export function T({ v }) {
  if (!v) return null;
  if (typeof v === "string") return <>{v}</>;
  return <L en={v.en} ko={v.ko} />;
}
