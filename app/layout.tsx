import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "Beervana — база пива от Ивана",
  description: "Каталог крафтового и не только пива. Фильтруй, оценивай, делись.",
  icons: {
    icon: [{ url: "/icons/beer-mug.svg", type: "image/svg+xml" }],
    shortcut: [{ url: "/icons/beer-mug.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/beer-mug.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-[family-name:var(--font-geist)]">
        {children}
      </body>
    </html>
  );
}
