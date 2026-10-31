import Link from "next/link";
import { L, T } from "./L";

export default function Footer({ site }) {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <img
            className="footer-logo"
            src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/images/brand/logo-full.png`}
            alt={site.name}
            width="132"
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
            <li><Link href="/publications/"><L en="Publications" ko="논문" /></Link></li>
            <li><Link href="/team/"><L en="Team" ko="구성원" /></Link></li>
            <li><Link href="/join/"><L en="Join the lab" ko="합류하기" /></Link></li>
          </ul>
        </div>
        <div>
          <h3 className="eyebrow"><L en="Contact" ko="연락처" /></h3>
          <ul className="plain">
            <li>{site.contact.email}</li>
            <li><T v={site.contact.address} /></li>
            {site.contact.orcid && (
              <li><a href={`https://orcid.org/${site.contact.orcid}`} target="_blank" rel="noreferrer">ORCID</a></li>
            )}
            {site.contact.github && (
              <li><a href={site.contact.github} target="_blank" rel="noreferrer">GitHub</a></li>
            )}
          </ul>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} {site.name}</span>
      </div>
    </footer>
  );
}
