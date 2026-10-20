import Link from "next/link";
import { SitePage } from "@/components/SitePage";

export default function NotFound() {
  return (
    <SitePage>
      <h1>Page not found</h1>
      <Link href="/">Back to library</Link>
    </SitePage>
  );
}
