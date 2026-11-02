import PageBanner from "../../components/PageBanner";
import { getContact } from "../../lib/data";

export const metadata = { title: "Contact", description: "How to reach the ALADDIN Lab at KRICT, Daejeon." };

export default function Contact() {
  const c = getContact();
  const q = encodeURIComponent(c.map_query || "KRICT Daejeon");
  const tel = (c.phone || "").replace(/[^+\d]/g, "");
  return (
    <>
      <PageBanner src="/images/banners/outreach.webp" alt="" eyebrow="Contact" light="Come say hello to" wordmark focus="-50%" />
      <div className="container contact-grid">
        <div className="contact-info">
          <h2>{c.group}</h2>
          <p className="contact-inst">{c.institution}</p>
          <dl>
            <dt>Address</dt>
            <dd>{(c.address || []).map((l, i) => (<span key={i}>{l}<br /></span>))}</dd>
            <dt>Office / Lab</dt>
            <dd>{c.office}</dd>
            <dt>Phone</dt>
            <dd><a href={`tel:${tel}`}>{c.phone}</a></dd>
            <dt>Email</dt>
            <dd>{(c.emails || []).map((e) => (<span key={e}><a href={`mailto:${e}`}>{e}</a><br /></span>))}</dd>
          </dl>
          <p className="contact-links">
            <a className="btn btn-soft btn-sm" href={`https://www.google.com/maps/search/?api=1&query=${q}`} target="_blank" rel="noreferrer">Open in Google Maps</a>
            <a className="btn btn-ghost btn-sm" href={`https://map.naver.com/p/search/${encodeURIComponent("한국화학연구원")}`} target="_blank" rel="noreferrer">Naver Map</a>
          </p>
        </div>
        <div className="contact-map">
          <iframe
            title="Map to the ALADDIN Lab at KRICT"
            src={`https://maps.google.com/maps?q=${q}&hl=en&z=15&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      </div>
    </>
  );
}
