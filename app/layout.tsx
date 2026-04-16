import type { Metadata } from "next";
import Script from "next/script";
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
        <Script id="yandex-metrika" strategy="afterInteractive">
          {`
            (function(m,e,t,r,i,k,a){
              m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
              m[i].l=1*new Date();
              for (var j = 0; j < document.scripts.length; j++) {
                if (document.scripts[j].src === r) { return; }
              }
              k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
            })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js?id=108574338', 'ym');

            ym(108574338, 'init', {
              ssr: true,
              webvisor: true,
              clickmap: true,
              ecommerce: 'dataLayer',
              referrer: document.referrer,
              url: location.href,
              accurateTrackBounce: true,
              trackLinks: true
            });
          `}
        </Script>

        <noscript>
          <div>
            <img src="https://mc.yandex.ru/watch/108574338" style={{ position: "absolute", left: "-9999px" }} alt="" />
          </div>
        </noscript>

        {children}
      </body>
    </html>
  );
}
