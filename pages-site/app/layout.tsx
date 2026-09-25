import type { Metadata } from "next";
import localFont from "next/font/local";
import "../../src/app/globals.css";

const onest = localFont({ src: "../../src/app/fonts/onest-latin-variable.woff2", variable: "--font-onest", display: "swap" });
const orbitron = localFont({ src: "../../src/app/fonts/orbitron-latin-variable.woff2", variable: "--font-orbitron", display: "swap" });
export const metadata: Metadata = { title: "StatOz Designer — Studio demo", description: "Explore StatOz templates, motion, brand assets and the sample investor deck, then connect a local companion for the full Studio." };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className={`${onest.variable} ${orbitron.variable}`}><body>{children}</body></html>;
}
