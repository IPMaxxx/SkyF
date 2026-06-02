import type { Locale } from "@/i18n/routing";
import { BRAND } from "@/lib/brand";

const BASE = BRAND.url;

export function getSiteJsonLd(locale: Locale) {
  const isEn = locale === "en";
  const areaServed = isEn ? BRAND.seo.areaServedEn : BRAND.seo.areaServedRu;

  const webAppDesc = isEn
    ? "Mushroom location discovery service in Belarus. Weather analysis, precipitation maps, and pattern comparison for the best picking time."
    : "Сервис поиска грибных локаций в Беларуси. Анализ погоды, карта осадков, сравнение погодных паттернов для определения лучшего времени сбора грибов.";

  const offerDesc = isEn
    ? "Free registration, extended features with tokens"
    : "Бесплатная регистрация, расширенные функции за токены";

  const websiteDesc = isEn
    ? "Mushroom location discovery service in Belarus"
    : "Сервис поиска грибных локаций в Беларуси";

  const breadcrumbHome = isEn ? "Home" : "Главная";

  const featureList = isEn
    ? [
        "14-day weather archive for mushroom locations",
        "Save your best mushroom picking day",
        "Compare weather patterns with your reference day",
        "Precipitation heat map to find mushroom spots",
      ]
    : [
        "Архив погоды за 14 дней для грибных локаций",
        "Сохранение лучшего дня сбора грибов",
        "Сравнение погодных паттернов с эталонным днём",
        "Тепловая карта осадков для поиска грибных мест",
      ];

  const faq: Array<{ q: string; a: string }> = isEn
    ? [
        {
          q: "When is the best time to pick mushrooms?",
          a: "The best window is typically 7–14 days after heavy rain, with temperatures around 10–20°C and humidity 70–90%. Skyforest tracks these conditions for your locations and tells you when the weather matches your best mushroom day.",
        },
        {
          q: "How do I know it’s time to go mushroom picking?",
          a: "Save your most successful picking date in Skyforest — the system remembers the 14-day weather pattern. Then compare current weather to your reference: the higher the match score, the better the odds. Also use the precipitation map — mushrooms grow where it recently rained.",
        },
        {
          q: "Which mushrooms grow in Belarus?",
          a: "Belarusian forests host porcini, birch boletes, aspen boletes, chanterelles, honey fungus, slippery jacks, russulas, milk-caps, and many other edible species. The season runs roughly May–November, peaking in August–September.",
        },
        {
          q: "How does weather affect mushroom growth?",
          a: "Growth depends on four factors: temperature (10–20°C), rainfall in the 7–14 days before picking, humidity (70–90%), and moderate wind. Skyforest analyzes these parameters, builds patterns, and helps you pick the best time to go.",
        },
        {
          q: "Where should I look for mushrooms?",
          a: "Try mixed and coniferous forests, near tree bases, edges, and mossy spots. Moisture is key — mushrooms grow where it recently rained. Skyforest’s precipitation map shows where rain fell in recent days — those are prime spots.",
        },
        {
          q: "Is Skyforest free?",
          a: "Registration is free. Core features are available immediately. Advanced tools (pattern comparison, precipitation map) use tokens — the service’s internal currency. Skyforest runs in your browser; nothing to install.",
        },
      ]
    : [
        {
          q: "Когда лучше всего собирать грибы?",
          a: "Оптимальное время для сбора грибов — через 7-14 дней после обильных дождей при температуре 10-20°C и влажности воздуха 70-90%. Skyforest автоматически отслеживает эти условия для ваших локаций и подсказывает, когда погода совпадает с вашим лучшим грибным днём.",
        },
        {
          q: "Как понять, что пора идти за грибами?",
          a: "Сохраните в Skyforest дату вашего самого удачного сбора — система запомнит погодный паттерн за 14 дней. Затем сравнивайте текущую погоду с эталоном: чем выше процент совпадения, тем больше шансов на хороший урожай. Также используйте карту осадков — грибы активно растут там, где недавно шёл дождь.",
        },
        {
          q: "Какие грибы растут в Беларуси?",
          a: "В белорусских лесах растут: белый гриб (боровик), подберёзовик, подосиновик, лисичка, опёнок осенний и летний, маслёнок, сыроежки, грузди, рыжики, моховики и многие другие съедобные виды. Грибной сезон в Беларуси длится с мая по ноябрь, пик — август-сентябрь.",
        },
        {
          q: "Как погода влияет на рост грибов?",
          a: "Рост грибов зависит от четырёх факторов: температура (10-20°C), осадки за 7-14 дней до сбора, влажность воздуха (70-90%) и умеренный ветер. Skyforest анализирует все эти параметры, строит погодные паттерны и помогает определить оптимальное время для похода за грибами.",
        },
        {
          q: "Где лучше искать грибы?",
          a: "Ищите грибы в смешанных и хвойных лесах, у основания деревьев, на опушках, возле мха. Ключевой фактор — влажность: грибы растут там, где недавно шёл дождь. Карта осадков в Skyforest показывает, где были дожди за последние дни — это лучшие места для поиска.",
        },
        {
          q: "Skyforest — это бесплатно?",
          a: "Регистрация в Skyforest бесплатна. Базовые функции доступны сразу. Расширенные возможности (сравнение паттернов, карта осадков) оплачиваются токенами — внутренней валютой сервиса. Skyforest работает в браузере, скачивать ничего не нужно.",
        },
      ];

  const tariffs = isEn
    ? [
        {
          name: "Start",
          description: "Free tier: free welcome tokens, add mushroom locations, weather checks, save best days.",
          price: "0",
        },
        {
          name: "Standard",
          description: "30 tokens for regular forays: weather check, pattern comparison, precipitation map, forest search.",
          price: "12",
        },
        {
          name: "Pro Forager",
          description: "300 tokens for a whole season, best per-token price, unlimited locations, priority support.",
          price: "90",
        },
      ]
    : [
        {
          name: "Старт",
          description: "Бесплатно: приветственные токены, добавление локаций, проверка погоды, сохранение грибных дней.",
          price: "0",
        },
        {
          name: "Стандарт",
          description: "30 токенов для регулярных походов: проверка погоды, сравнение паттернов, карта осадков, поиск леса.",
          price: "12",
        },
        {
          name: "Грибник Про",
          description: "300 токенов на весь сезон, лучшая цена за токен, неограниченные локации, приоритетная поддержка.",
          price: "90",
        },
      ];

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${BASE}/#organization`,
        name: "Skyforest",
        url: BASE,
        logo: {
          "@type": "ImageObject",
          url: `${BASE}/images/logo-square.png`,
        },
        contactPoint: {
          "@type": "ContactPoint",
          ...(BRAND.contacts.phone
            ? { telephone: BRAND.contacts.phone.replace(/\s/g, "") }
            : { email: BRAND.contacts.email }),
          contactType: "customer support",
          availableLanguage: isEn
            ? ["Russian", "Belarusian", "English"]
            : ["Russian", "Belarusian"],
        },
        ...(BRAND.social.length > 0
          ? { sameAs: BRAND.social.map((s) => s.href) }
          : {}),
      },
      {
        "@type": "WebApplication",
        "@id": `${BASE}/#webapp`,
        name: "Skyforest",
        url: BASE,
        applicationCategory: "LifestyleApplication",
        operatingSystem: "All",
        description: webAppDesc,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: BRAND.currency,
          description: offerDesc,
        },
        provider: {
          "@id": `${BASE}/#organization`,
        },
        browserRequirements: "Requires JavaScript. Works in all modern browsers.",
        softwareVersion: "2.0",
        screenshot: `${BASE}/images/og-cover.png`,
        inLanguage: locale,
        availableLanguage: ["ru", "en"],
        featureList,
      },
      {
        "@type": "WebSite",
        "@id": `${BASE}/#website`,
        url: BASE,
        name: "Skyforest",
        description: websiteDesc,
        publisher: {
          "@id": `${BASE}/#organization`,
        },
        inLanguage: locale,
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${BASE}/blog?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${BASE}/#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: breadcrumbHome,
            item: BASE,
          },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${BASE}/#faq`,
        mainEntity: faq.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.a,
          },
        })),
      },
      {
        "@type": "ItemList",
        "@id": `${BASE}/#pricing`,
        name: isEn ? "SkyForest pricing plans" : "Тарифы SkyForest",
        itemListElement: tariffs.map((tariff, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "Service",
            name: `SkyForest — ${tariff.name}`,
            description: tariff.description,
            serviceType: isEn
              ? "Mushroom location discovery subscription plan"
              : "Тарифный план сервиса поиска грибных локаций",
            provider: {
              "@id": `${BASE}/#organization`,
            },
            areaServed,
            offers: {
              "@type": "Offer",
              price: tariff.price,
              priceCurrency: BRAND.currency,
              availability: "https://schema.org/InStock",
              url: `${BASE}${isEn ? "/en" : ""}/#tariffs`,
            },
          },
        })),
      },
    ],
  };
}
