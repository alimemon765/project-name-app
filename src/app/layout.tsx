import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { AppShell } from "@/components/shell/AppShell";
import { ServiceWorker } from "@/components/shell/ServiceWorker";
import "./globals.css";

// Self-hosted at build (no runtime request to Google); swap + size-adjusted fallbacks avoid invisible text.
const sans = Geist({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "700"], variable: "--nf-sans", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], weight: ["400"], variable: "--nf-mono", display: "swap" });
const title = Newsreader({ subsets: ["latin", "latin-ext"], weight: ["400", "500"], variable: "--nf-title", display: "swap" });

export const metadata: Metadata = {
  title: { default: "PROJECT_NAME", template: "%s · PROJECT_NAME" },
  description: "New coastal, flood and hydrology research, tagged by topic and region.",
  applicationName: "PROJECT_NAME",
  appleWebApp: { capable: true, title: "PROJECT_NAME", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",                                   // safe areas on notched phones
  interactiveWidget: "resizes-content",                   // Android keyboard resizes the layout like iOS
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f2f4f7" }, { media: "(prefers-color-scheme: dark)", color: "#0b0c0e" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${sans.variable} ${mono.variable} ${title.variable}`}>
      <body>
        <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
