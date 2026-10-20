import type { Metadata } from "next";
import { Libre_Baskerville, Noto_Sans_Telugu, Noto_Serif_Telugu, Source_Sans_3 } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const sansEn = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans-en",
  display: "swap",
});

const sansTe = Noto_Sans_Telugu({
  subsets: ["telugu"],
  weight: ["400", "500", "600"],
  variable: "--font-sans-te",
  display: "swap",
});

const serifEn = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-serif-en",
  display: "swap",
});

const serifTe = Noto_Serif_Telugu({
  subsets: ["telugu"],
  weight: ["400", "500", "600"],
  variable: "--font-serif-te",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Self Knowledge Reading",
    template: "%s · Self Knowledge Reading",
  },
  description: "Quantum Life University reader for Dr. Newton’s Devi Navaratri discourses.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sansEn.variable} ${sansTe.variable} ${serifEn.variable} ${serifTe.variable}`}>
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/uikit@3.23.0/dist/css/uikit.min.css" />
      </head>
      <body>
        {children}
        <Script src="https://cdn.jsdelivr.net/npm/uikit@3.23.0/dist/js/uikit.min.js" strategy="afterInteractive" />
        <Script src="https://cdn.jsdelivr.net/npm/uikit@3.23.0/dist/js/uikit-icons.min.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
