import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "ProofOfCarbon — Evidence before assurance",
  description:
    "Screen forest carbon claims with transparent evidence and a tamper-evident prototype registry.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
