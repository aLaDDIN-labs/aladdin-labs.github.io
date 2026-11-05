import Link from "next/link";
import { L } from "./L";
import MobileMenu from "./MobileMenu";

const nav = [
  { href: "/research/", en: "Research", ko: "연구" },
  { href: "/philosophy/", en: "Philosophy", ko: "철학" },
  { href: "/team/", en: "Members", ko: "구성원" },
  { href: "/publications/", en: "Publications", ko: "논문" },
  { href: "/news/", en: "News", ko: "소식" },
  { href: "/outreach/", en: "Outreach", ko: "아웃리치" },
  { href: "/join/", en: "Join", ko: "합류" },
];

export default function Header({ name }) {
  return (
    <header className="site-header">
      <a className="skip" href="#main">Skip to content</a>
      <div className="container header-row">
        <Link href="/" className="brand" aria-label={name}>
          <img
            className="brand-logo"
            src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/images/brand/logo.png`}
            alt={name}
            height="64"
          />
        </Link>
        <nav className="nav" aria-label="Primary">
          {nav.map((n) => (
            <Link key={n.href} href={n.href}><L en={n.en} ko={n.ko} /></Link>
          ))}
        </nav>
        <div className="header-side">
          <Link className="btn btn-soft btn-sm btn-contact" href="/contact/"><L en="Contact" ko="연락처" /></Link>
          <MobileMenu items={nav.map(({ href, en }) => ({ href, label: en }))} />
        </div>
      </div>
    </header>
  );
}
