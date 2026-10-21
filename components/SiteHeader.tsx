import Image from "next/image";
import Link from "next/link";
import { getSessionProfile } from "@/lib/auth/profile";

export async function SiteHeader() {
  const profile = await getSessionProfile();
  const isAdmin = profile?.role === "admin";
  const signedIn = Boolean(profile);

  return (
    <header className="site-header">
      <Link className="brand" href="/">
        <Image
          src="/brand/qlu-logo.png"
          alt="Quantum Life University"
          width={40}
          height={40}
          className="brand-mark"
          priority
        />
        <span className="brand-text">QUANTUM LIFE UNIVERSITY</span>
      </Link>
      <nav>
        <Link href="/">Library</Link>
        <Link href="/dashboard">Dashboard</Link>
        {isAdmin ? <Link href="/admin">Admin</Link> : null}
        <Link href="/account">Account</Link>
        {signedIn ? null : <Link href="/login">Sign in</Link>}
      </nav>
    </header>
  );
}
