import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Indian Wedding Palette Swiper",
  description: "Swipe sherwani looks, build a shared mood board."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
