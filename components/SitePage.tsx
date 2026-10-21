import { SiteHeader } from "@/components/SiteHeader";

export function SitePage({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <>
      <SiteHeader />
      <main className={wide ? "site-main wide" : "site-main"}>{children}</main>
    </>
  );
}
