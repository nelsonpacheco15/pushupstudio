import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stylescape",
  description: "Build brand stylescapes and collect client feedback.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
