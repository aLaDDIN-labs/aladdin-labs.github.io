import Link from "next/link";
import { L } from "./L";
import LangToggle from "./LangToggle";

const nav = [
  { href: "/research/", en: "Research", ko: "연구" },
  { href: "/publications/", en: "Publications", ko: "논문" },
  { href: "/team/", en: "Team", ko: "구성원" },
  { href: "/join/", en: "Join", ko: "합류" },
];

export default function Header({ name }) {
  return (
    <header className="site-header">
      <a className="skip" href="#main">Skip to content</a>
      <div className="container header-row">
        <Link href="/" className="brand" aria-label={name}>
          <span className="brand-mark" aria-hidden="true" />
          <span>{name.toUpperCase()}</span>
        </Link>
        <nav className="nav" aria-label="Primary">
          {nav.map((n) => (
            <Link key={n.href} href={n.href}><L en={n.en} ko={n.ko} /></Link>
          ))}
        </nav>
        <div className="header-side">
          <LangToggle />
          <Link className="btn btn-ghost btn-sm" href="/contact/"><L en="Contact" ko="연락처" /></Link>
        </div>
      </div>
    </header>
  );
}
