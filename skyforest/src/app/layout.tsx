import { routing } from "@/i18n/routing";
import { Roboto } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500", "700"],
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
      </head>
      <body className={`${roboto.variable} antialiased`}>{children}</body>
    </html>
  );
}
