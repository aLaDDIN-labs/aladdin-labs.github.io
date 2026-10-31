import "./globals.css";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { getSite } from "../lib/data";

const site = getSite();

export const metadata = {
  title: { default: site.name, template: `%s · ${site.name}` },
  description: site.tagline.en,
  openGraph: { title: site.name, description: site.tagline.en, type: "website" },
  twitter: { card: "summary_large_image" },
};

export const viewport = { themeColor: "#ffffff", width: "device-width", initialScale: 1 };

// Picks the language before first paint: saved choice, otherwise browser language.
const langScript = `(function(){try{var s=localStorage.getItem('lang');var l=s||((navigator.languages&&navigator.languages[0]||navigator.language||'en').toLowerCase().indexOf('ko')===0?'ko':'en');document.documentElement.dataset.lang=l;document.documentElement.lang=l;}catch(e){document.documentElement.dataset.lang='en';}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: langScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@300;400;500;600;700&display=swap"
        />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>
        <Header name={site.name} />
        <main id="main">{children}</main>
        <Footer site={site} />
      </body>
    </html>
  );
}
