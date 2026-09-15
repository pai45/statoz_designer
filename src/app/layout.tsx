import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
const onest = localFont({ src: "./fonts/onest-latin-variable.woff2", variable: "--font-onest", display: "swap" });
const orbitron = localFont({ src: "./fonts/orbitron-latin-variable.woff2", variable: "--font-orbitron", display: "swap" });
export const metadata: Metadata = { title: "StatOz Designer — Content studio", description: "Your local StatOz image and motion studio." };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className={`${onest.variable} ${orbitron.variable}`}><body>{children}</body></html>;
}
