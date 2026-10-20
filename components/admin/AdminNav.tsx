"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Library", match: (path: string) => path === "/admin" || path.startsWith("/admin/edit") },
  { href: "/admin/prepare", label: "Add reading", match: (path: string) => path.startsWith("/admin/prepare") },
  { href: "/admin/newsletter", label: "Newsletter", match: (path: string) => path.startsWith("/admin/newsletter") },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="admin-nav" aria-label="Admin">
      {links.map((link) => {
        const active = link.match(pathname);
        return (
          <Link key={link.href} href={link.href} className={active ? "active" : undefined} aria-current={active ? "page" : undefined}>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
