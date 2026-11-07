import Link from "next/link";
import { L, T } from "./L";
import { getContact } from "../lib/data";

export default function Footer({ site }) {
  const c = getContact();
  const tel = (c.phone || "").replace(/[^+\d]/g, "");
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <img
            className="footer-logo"
            src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/images/brand/logo.png`}
            alt={site.name}
            width="112"
          />
          <p className="footer-tag"><T v={site.full_name} /></p>
          {site.affiliations.map((a, i) => (
            <p key={i} className="muted small"><T v={a} /></p>
          ))}
        </div>
        <div>
          <h3 className="eyebrow"><L en="Lab" ko="연구실" /></h3>
          <ul className="plain">
            <li><Link href="/research/"><L en="Research" ko="연구" /></Link></li>
            <li><Link href="/philosophy/"><L en="Philosophy" ko="철학" /></Link></li>
            <li><Link href="/team/"><L en="Members" ko="구성원" /></Link></li>
            <li><Link href="/publications/"><L en="Publications" ko="논문" /></Link></li>
            <li><Link href="/tools/"><L en="Tools" ko="도구" /></Link></li>
            <li><Link href="/news/"><L en="News" ko="소식" /></Link></li>
            <li><Link href="/outreach/"><L en="Outreach" ko="아웃리치" /></Link></li>
            <li><Link href="/join/"><L en="Join the lab" ko="합류하기" /></Link></li>
          </ul>
        </div>
        <div>
          <h3 className="eyebrow"><L en="Contact" ko="연락처" /></h3>
          <address className="footer-addr">
            <p>{(c.address || []).map((l, i) => (<span key={i}>{l}<br /></span>))}</p>
            {c.office && <p>{c.office}</p>}
            {c.phone && <p><a href={`tel:${tel}`}>{c.phone}</a></p>}
            <p>
              {(c.emails || [site.contact.email]).map((e) => (<span key={e}><a href={`mailto:${e}`}>{e}</a><br /></span>))}
            </p>
            <p className="footer-links">
              <Link href="/contact/"><L en="Map & directions" ko="오시는 길" /></Link>
              {site.contact.orcid && (<a href={`https://orcid.org/${site.contact.orcid}`} target="_blank" rel="noreferrer">ORCID</a>)}
              {site.contact.github && (<a href={site.contact.github} target="_blank" rel="noreferrer">GitHub</a>)}
            </p>
          </address>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} {site.name}</span>
      </div>
    </footer>
  );
}
