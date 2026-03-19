import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Skyforest.by — сервис поиска грибных локаций",
    template: "%s | Skyforest.by",
  },
  description:
    "Узнайте, когда лучше идти за грибами! Skyforest анализирует погоду — осадки, температуру, влажность — и сравнивает с вашими лучшими грибными днями. Карта осадков, прогноз грибов, помощник грибника в Беларуси.",
  keywords: [
    "грибы",
    "сбор грибов",
    "грибные места",
    "когда идти за грибами",
    "грибной сезон",
    "Беларусь",
    "грибник",
    "прогноз грибов",
    "карта грибных мест",
    "тихая охота",
    "погода для грибов",
    "белый гриб",
    "подберёзовик",
    "лисички",
    "опята",
    "skyforest",
    "грибы после дождя",
    "грибной календарь",
    "карта осадков для грибов",
    "анализ погоды для грибника",
  ],
  openGraph: {
    title: "Skyforest.by — знайте, когда идти за грибами",
    description:
      "Умный помощник для грибников в Беларуси. Анализ погоды, карта осадков, сравнение с лучшими грибными днями. Бесплатная регистрация.",
    url: "https://www.skyforest.by",
    siteName: "Skyforest",
    locale: "ru_BY",
    type: "website",
    images: [
      {
        url: "https://www.skyforest.by/images/og-cover.png",
        width: 1200,
        height: 630,
        alt: "Skyforest — сервис поиска грибных локаций в Беларуси",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Skyforest.by — знайте, когда идти за грибами",
    description:
      "Умный помощник для грибников. Анализ погоды, карта осадков, прогноз лучшего времени для сбора грибов.",
    images: ["https://www.skyforest.by/images/og-cover.png"],
  },
  alternates: {
    canonical: "https://www.skyforest.by",
  },
  metadataBase: new URL("https://www.skyforest.by"),
  icons: { icon: "/favicon.png" },
  other: {
    "geo.region": "BY",
    "geo.placename": "Belarus",
    "content-language": "ru",
  },
  category: "lifestyle",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://www.skyforest.by/#organization",
      name: "Skyforest",
      url: "https://www.skyforest.by",
      logo: {
        "@type": "ImageObject",
        url: "https://www.skyforest.by/images/logo-square.png",
      },
      contactPoint: {
        "@type": "ContactPoint",
        telephone: "+375-29-328-2842",
        contactType: "customer support",
        availableLanguage: ["Russian", "Belarusian"],
      },
      sameAs: [
        "https://www.instagram.com/ip.chaser",
        "https://www.tiktok.com/@skyforest1",
        "https://www.youtube.com/@sky_forest",
        "https://t.me/iPChaser",
      ],
    },
    {
      "@type": "WebApplication",
      "@id": "https://www.skyforest.by/#webapp",
      name: "Skyforest",
      url: "https://www.skyforest.by",
      applicationCategory: "LifestyleApplication",
      operatingSystem: "All",
      description:
        "Сервис поиска грибных локаций в Беларуси. Анализ погоды, карта осадков, сравнение погодных паттернов для определения лучшего времени сбора грибов.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "BYN",
        description: "Бесплатная регистрация, расширенные функции за токены",
      },
      provider: {
        "@id": "https://www.skyforest.by/#organization",
      },
      browserRequirements: "Requires JavaScript. Works in all modern browsers.",
      softwareVersion: "2.0",
      screenshot: "https://www.skyforest.by/images/og-cover.png",
      inLanguage: "ru",
      availableLanguage: ["ru"],
      featureList: [
        "Архив погоды за 14 дней для грибных локаций",
        "Сохранение лучшего дня сбора грибов",
        "Сравнение погодных паттернов с эталонным днём",
        "Тепловая карта осадков для поиска грибных мест",
      ],
    },
    {
      "@type": "WebSite",
      "@id": "https://www.skyforest.by/#website",
      url: "https://www.skyforest.by",
      name: "Skyforest",
      description: "Сервис поиска грибных локаций в Беларуси",
      publisher: {
        "@id": "https://www.skyforest.by/#organization",
      },
      inLanguage: "ru",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: "https://www.skyforest.by/blog?q={search_term_string}",
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "BreadcrumbList",
      "@id": "https://www.skyforest.by/#breadcrumb",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Главная",
          item: "https://www.skyforest.by",
        },
      ],
    },
    {
      "@type": "FAQPage",
      "@id": "https://www.skyforest.by/#faq",
      mainEntity: [
        {
          "@type": "Question",
          name: "Когда лучше всего собирать грибы?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Оптимальное время для сбора грибов — через 7-14 дней после обильных дождей при температуре 10-20°C и влажности воздуха 70-90%. Skyforest автоматически отслеживает эти условия для ваших локаций и подсказывает, когда погода совпадает с вашим лучшим грибным днём.",
          },
        },
        {
          "@type": "Question",
          name: "Как понять, что пора идти за грибами?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Сохраните в Skyforest дату вашего самого удачного сбора — система запомнит погодный паттерн за 14 дней. Затем сравнивайте текущую погоду с эталоном: чем выше процент совпадения, тем больше шансов на хороший урожай. Также используйте карту осадков — грибы активно растут там, где недавно шёл дождь.",
          },
        },
        {
          "@type": "Question",
          name: "Какие грибы растут в Беларуси?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "В белорусских лесах растут: белый гриб (боровик), подберёзовик, подосиновик, лисичка, опёнок осенний и летний, маслёнок, сыроежки, грузди, рыжики, моховики и многие другие съедобные виды. Грибной сезон в Беларуси длится с мая по ноябрь, пик — август-сентябрь.",
          },
        },
        {
          "@type": "Question",
          name: "Как погода влияет на рост грибов?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Рост грибов зависит от четырёх факторов: температура (10-20°C), осадки за 7-14 дней до сбора, влажность воздуха (70-90%) и умеренный ветер. Skyforest анализирует все эти параметры, строит погодные паттерны и помогает определить оптимальное время для похода за грибами.",
          },
        },
        {
          "@type": "Question",
          name: "Где лучше искать грибы?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Ищите грибы в смешанных и хвойных лесах, у основания деревьев, на опушках, возле мха. Ключевой фактор — влажность: грибы растут там, где недавно шёл дождь. Карта осадков в Skyforest показывает, где были дожди за последние дни — это лучшие места для поиска.",
          },
        },
        {
          "@type": "Question",
          name: "Skyforest — это бесплатно?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Регистрация в Skyforest бесплатна. Базовые функции доступны сразу. Расширенные возможности (сравнение паттернов, карта осадков) оплачиваются токенами — внутренней валютой сервиса. Skyforest работает в браузере, скачивать ничего не нужно.",
          },
        },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,'script','https://mc.yandex.ru/metrika/tag.js?id=107257919','ym');ym(107257919,'init',{ssr:true,webvisor:true,clickmap:true,ecommerce:"dataLayer",referrer:document.referrer,url:location.href,accurateTrackBounce:true,trackLinks:true});`,
          }}
        />
        <noscript>
          <div>
            <img src="https://mc.yandex.ru/watch/107257919" style={{ position: "absolute", left: "-9999px" }} alt="" />
          </div>
        </noscript>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-TDWX0SFE2M" />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-TDWX0SFE2M');`,
          }}
        />
        <link rel="author" href="https://www.skyforest.by/llms.txt" />
        <link rel="alternate" type="application/rss+xml" title="Skyforest.by — Блог для грибников" href="https://www.skyforest.by/feed.xml" />
        <meta name="ai-content-declaration" content="This site provides structured information for AI assistants via /llms.txt and /llms-full.txt. RSS feed available at /feed.xml" />
      </head>
      <body className={`${roboto.variable} antialiased`}>
        {children}
        <a
          href="https://t.me/skyforest_support_bot"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Написать в поддержку в Telegram"
          className="fixed bottom-5 right-5 z-[9998] flex h-14 w-14 items-center justify-center rounded-full bg-[#2AABEE] text-white shadow-lg shadow-[#2AABEE]/30 transition-all hover:scale-110 hover:shadow-xl hover:shadow-[#2AABEE]/40 active:scale-95"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
          </svg>
        </a>
      </body>
    </html>
  );
}
