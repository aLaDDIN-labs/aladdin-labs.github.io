// Illustration banner with the page title laid over it (same look as Members).
export default function PageBanner({ src, alt = "", eyebrow, light, bold, wordmark = false, focus = "-50%" }) {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  return (
    <header className="team-banner" style={{ "--mx": focus }}>
      <img src={`${base}${src}`} alt={alt} />
      <div className="team-overlay">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="team-title">
          <span className="light">{light}</span>{" "}
          {wordmark ? <span className="aw"><i>a</i>L<i>a</i>DDIN</span> : <span>{bold}</span>}
        </h1>
      </div>
    </header>
  );
}
