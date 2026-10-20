import Link from "next/link";

export function SitePage({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <>
      <header className="site-header">
        <Link className="brand" href="/">
          QUANTUM LIFE UNIVERSITY
        </Link>
        <nav>
          <Link href="/">Library</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/highlights">Highlights</Link>
          <Link href="/admin">Admin</Link>
          <Link href="/account">Account</Link>
          <Link href="/login">Sign in</Link>
        </nav>
      </header>
      <main className={wide ? "site-main wide" : "site-main"}>{children}</main>
    </>
  );
}
