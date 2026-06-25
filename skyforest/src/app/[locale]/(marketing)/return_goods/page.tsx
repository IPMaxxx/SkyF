import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { isSamplify, BRAND } from "@/lib/brand";
import { ReturnGoodsSamplify } from "@/components/legal/ReturnGoodsSamplify";
import { MarketingPageHeader } from "@/components/marketing/MarketingPageHeader";
import { marketingPageMetadata } from "@/lib/marketingSeo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const title = isSamplify ? "Refund Policy" : "Условия возврата средств";
  const description = isSamplify
    ? "SkyForest token refund policy — terms and processing times."
    : "Условия возврата средств за токены SkyForest — порядок, сроки и контакты.";
  return marketingPageMetadata({ title, description, path: "/return_goods", locale });
}

export default async function ReturnGoodsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "footer" });
  const pageTitle = isSamplify ? "Refund Policy" : "Условия возврата средств";

  if (isSamplify) {
    return (
      <div className="mx-auto max-w-3xl px-4 pb-16 sm:pb-20 pt-24 sm:pt-28 sm:px-6 lg:px-8">
        <MarketingPageHeader
          locale={locale}
          title={pageTitle}
          breadcrumbs={[
            { name: t("legalTitle"), path: "/return_goods" },
            { name: pageTitle },
          ]}
        />
        <ReturnGoodsSamplify />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 sm:pb-20 pt-24 sm:pt-28 sm:px-6 lg:px-8">
      <MarketingPageHeader
        locale={locale}
        title={pageTitle}
        breadcrumbs={[
          { name: t("legalTitle"), path: "/return_goods" },
          { name: pageTitle },
        ]}
      />

      <div className="prose prose-sm max-w-none space-y-6 text-foreground">
        <h2 className="text-xl font-semibold">Общие положения</h2>
        <p>
          Сервис SkyForest не реализует товары. Предметом оплаты являются{" "}
          <strong>токены</strong>&nbsp;— условные единицы учёта, которые
          используются для доступа к функциям сервиса (анализ погодных данных,
          построение карт осадков, сравнение погодных условий и др.).
        </p>
        <p>
          Токены не являются товаром, электронными деньгами, ценными бумагами
          или иным финансовым инструментом. Приобретение токенов является
          оплатой информационных услуг, оказываемых в электронной форме.
        </p>

        <h2 className="text-xl font-semibold">Условия возврата</h2>
        <p>
          Возврат денежных средств возможен <strong>только</strong> при
          одновременном соблюдении следующих условий:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            Ни один токен из приобретённого пакета <strong>не был
            использован</strong>
          </li>
          <li>
            С момента покупки прошло не более <strong>14 календарных
            дней</strong>
          </li>
        </ul>

        <h2 className="text-xl font-semibold">Когда возврат невозможен</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            Если хотя бы один токен из пакета был использован — услуга
            считается частично оказанной, возврат не производится
          </li>
          <li>
            Если с момента покупки прошло более 14 календарных дней
          </li>
          <li>
            Токены, начисленные бесплатно (бонусные, реферальные), возврату
            не подлежат
          </li>
        </ul>

        <h2 className="text-xl font-semibold">Порядок оформления возврата</h2>
        <p>
          Для оформления возврата направьте запрос на электронную почту с
          указанием следующих данных:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>Email, на который зарегистрирован аккаунт</li>
          <li>Дата и сумма покупки</li>
          <li>Причина возврата</li>
        </ul>
        <div className="rounded-xl bg-muted p-4 text-sm">
          <p>Email: {BRAND.contacts.email}</p>
          {BRAND.contacts.telegramLabel && (
            <p>Telegram: {BRAND.contacts.telegramLabel}</p>
          )}
        </div>

        <h2 className="text-xl font-semibold">Сроки возврата</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            Срок рассмотрения заявки — до 7 рабочих дней
          </li>
          <li>
            Возврат на банковскую карту — от 1 до 5 рабочих дней после
            одобрения заявки
          </li>
          <li>
            Возврат осуществляется тем же способом, которым была произведена
            оплата
          </li>
        </ul>

        <h2 className="text-xl font-semibold">Правовая основа</h2>
        <p>
          Порядок возврата средств определяется договором-офертой,
          размещённым по адресу{" "}
          <a href="/offer" className="text-primary hover:underline">
            {BRAND.domain}/offer
          </a>
          , и законодательством Республики Беларусь.
        </p>
      </div>
    </div>
  );
}
