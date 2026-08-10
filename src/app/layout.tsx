import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Research Proposal Fabricator",
  description: "An aesthetic environment for research proposals",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}