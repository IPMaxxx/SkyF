const BLOG_ARTICLES = [
  {
    title: "Ежовик гребенчатый: гриб для мозга — что говорит наука",
    slug: "ezhovik-grebenchatyj",
    description:
      "Ежовик гребенчатый (Lion's Mane) — гриб, улучшающий когнитивные функции, память и настроение. Разбираем клинические исследования: эринацины vs герициноны, мицелий vs плодовое тело.",
    pubDate: "2025-10-01T00:00:00+03:00",
  },
  {
    title: "Где растут грибы в России и Беларуси — полный гид по видам и местам",
    slug: "gde-rastut-griby",
    description:
      "Подробный гид по грибным местам России и Беларуси. Лучшие регионы, какие грибы где растут, карта грибных мест. Советы по поиску и безопасности.",
    pubDate: "2025-09-20T00:00:00+03:00",
  },
  {
    title: "В каком лесу искать грибы: хвойный, лиственный или смешанный",
    slug: "v-kakom-lesu-iskat-griby",
    description:
      "Узнайте, какие грибы растут в хвойном, лиственном и смешанном лесу. Таблица совместимости грибов и деревьев.",
    pubDate: "2025-09-15T00:00:00+03:00",
  },
  {
    title: "Когда пора в лес: 7 признаков, что грибы пошли",
    slug: "kogda-pora-v-les",
    description:
      "Как понять, что пора идти за грибами? 7 проверенных признаков начала грибного сезона.",
    pubDate: "2025-09-10T00:00:00+03:00",
  },
  {
    title: "Через сколько дней после дождя появляются грибы — подробный гид",
    slug: "griby-posle-dozhdya",
    description:
      "Когда идти за грибами после дождя? Таблица сроков по видам, научные данные и советы.",
    pubDate: "2025-09-05T00:00:00+03:00",
  },
  {
    title: "Погода для грибов: при какой температуре и влажности растут грибы",
    slug: "pogoda-dlya-gribov",
    description:
      "Узнайте, какая погода нужна для роста грибов. Оптимальная температура, влажность и осадки для белых грибов, опят, лисичек.",
    pubDate: "2025-09-01T00:00:00+03:00",
  },
];

export async function GET() {
  const baseUrl = "https://www.skyforest.by";

  const items = BLOG_ARTICLES.map(
    (a) => `    <item>
      <title><![CDATA[${a.title}]]></title>
      <link>${baseUrl}/blog/${a.slug}</link>
      <guid isPermaLink="true">${baseUrl}/blog/${a.slug}</guid>
      <description><![CDATA[${a.description}]]></description>
      <pubDate>${new Date(a.pubDate).toUTCString()}</pubDate>
      <category>Грибы</category>
    </item>`
  ).join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Skyforest.by — Блог для грибников</title>
    <link>${baseUrl}/blog</link>
    <description>Экспертные статьи о сборе грибов: погода, места, сроки и признаки удачного сезона. Советы по тихой охоте в Беларуси и России.</description>
    <language>ru</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${baseUrl}/images/logo-square.png</url>
      <title>Skyforest.by</title>
      <link>${baseUrl}</link>
    </image>
${items}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
