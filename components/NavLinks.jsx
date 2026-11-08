"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { L } from "./L";

export default function NavLinks({ items }) {
  const path = usePathname() || "/";
  return (
    <nav className="nav" aria-label="Primary">
      {items.map((n) => {
        const on = path === n.href || path.startsWith(n.href);
        return (
          <Link key={n.href} href={n.href} className={on ? "is-here" : undefined} aria-current={on ? "page" : undefined}>
            <L en={n.en} ko={n.ko} />
          </Link>
        );
      })}
    </nav>
  );
}
