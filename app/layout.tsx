import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shawarma to Sherwani",
  description: "Swipe sherwani looks, build a shared mood board."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
