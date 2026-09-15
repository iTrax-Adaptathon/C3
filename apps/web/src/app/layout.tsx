import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Autonomous Airport Operations Platform | iTrax C3",
  description: "Dynamic reassignment of gates, crews, and baggage routing with zero double-booking guarantee."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
