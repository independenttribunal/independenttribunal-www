import type { Metadata } from "next";
import { DM_Sans, Instrument_Serif } from "next/font/google";
import "./globals.css";

const sans = DM_Sans({ variable: "--font-sans", subsets: ["latin"] });
const serif = Instrument_Serif({ variable: "--font-serif", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: "Independent Tribunal — The law, shown openly",
  description: "Legal quirks, people's tribunals and the public record, explained. Every claim links to its primary source. Open data, built for people and for AI.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><head><link rel="stylesheet" href="/site-shell.css" /></head><body className={`${sans.variable} ${serif.variable}`}>{children}</body></html>;
}
