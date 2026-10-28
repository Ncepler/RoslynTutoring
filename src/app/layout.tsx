import type { Metadata, Viewport } from "next";
import { Archivo, Inter } from "next/font/google";
import { site } from "@/config/site";
import "./globals.css";

// Headings: Archivo (grotesk). Body: Inter. See design-system/roslyn-tutoring/MASTER.md.
const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], display: "swap" });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name}: ${site.school} tutoring for grades 8 to 10`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  keywords: [
    `${site.school} tutoring`,
    `${site.school} tutor`,
    `${site.area} tutoring`,
    "Regents review",
    "Algebra 1 tutoring",
    "Geometry tutoring",
    "Algebra 2 tutoring",
    "Chemistry tutoring",
    "Living Environment tutoring",
    "Spanish tutoring",
    "test prep",
    "Zoom tutoring",
  ],
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: "en_US",
    url: "/",
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

// Applies a saved light/dark choice before the first paint, so there's no flash.
const themeScript = `(function(){try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t);var m=document.querySelectorAll('meta[name="theme-color"]');for(var i=0;i<m.length;i++)m[i].setAttribute("content",t==="dark"?"#020617":"#ffffff")}}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
