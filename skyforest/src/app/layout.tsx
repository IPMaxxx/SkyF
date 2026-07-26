import { routing } from "@/i18n/routing";
import { flavorFromHost, flavorConfig } from "@/lib/appFlavor";
import { Bricolage_Grotesque, Manrope } from "next/font/google";
import { cookies, headers } from "next/headers";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["500", "700", "800"],
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  const lang =
    cookieLocale === "en" || cookieLocale === "ru"
      ? cookieLocale
      : routing.defaultLocale;

  // Флейвор по хосту: на checker./wayback. — свой манифест, иконки и имя PWA.
  const headerStore = await headers();
  const flavor = flavorConfig(flavorFromHost(headerStore.get("host")));

  return (
    <html lang={lang === "en" ? "en" : "ru"} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('sf-theme');if(t==='hc'){document.documentElement.dataset.theme='hc';}}catch(e){}})();`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,'script','https://mc.yandex.ru/metrika/tag.js?id=107257919','ym');ym(107257919,'init',{ssr:true,webvisor:true,clickmap:true,ecommerce:"dataLayer",referrer:document.referrer,url:location.href,accurateTrackBounce:true,trackLinks:true});`,
          }}
        />
        <noscript>
          <div>
            <img
              src="https://mc.yandex.ru/watch/107257919"
              style={{ position: "absolute", left: "-9999px" }}
              alt=""
            />
          </div>
        </noscript>
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-TDWX0SFE2M"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-TDWX0SFE2M');`,
          }}
        />
        <link rel="author" href="https://www.skyforest.by/llms.txt" />
        <link
          rel="alternate"
          type="application/rss+xml"
          title="Skyforest.by — Блог для грибников"
          href="https://www.skyforest.by/feed.xml"
        />
        <meta
          name="ai-content-declaration"
          content="This site provides structured information for AI assistants via /llms.txt and /llms-full.txt. RSS feed available at /feed.xml"
        />
        <link rel="manifest" href={flavor.manifestPath} />
        <meta name="theme-color" content="#0b120d" />
        <meta name="application-name" content={flavor.name} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content={flavor.name} />
        <link rel="apple-touch-icon" href={flavor.faviconPath} />
        <link rel="apple-touch-icon" sizes="192x192" href={flavor.faviconPath} />
        <link rel="apple-touch-icon" sizes="256x256" href={flavor.faviconPath} />
      </head>
      <body className={`${manrope.variable} ${bricolage.variable} antialiased`}>{children}</body>
    </html>
  );
}
