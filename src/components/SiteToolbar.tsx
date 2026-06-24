"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/rankings", label: "Bảng xếp hạng" },
  { href: "/news", label: "Tin mới" },
  { href: "/blog", label: "Blog" },
  { href: "/movie", label: "Movie" },
  { href: "/about", label: "Giới thiệu" }
];

export function SiteToolbar() {
  const pathname = usePathname();

  return (
    <nav className="toolbar" aria-label="Thanh công cụ JISOO Fanclub">
      <Link className="homeLink" href="/">
        JISOO
      </Link>
      {links.map((link) => (
        <Link className={pathname === link.href ? "active" : undefined} href={link.href} key={link.href}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
