import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BRAND, isSamplify } from "@/lib/brand";
import { DeleteAccountSamplify } from "@/components/legal/DeleteAccountSamplify";
import { MarketingPageHeader } from "@/components/marketing/MarketingPageHeader";
import { marketingPageMetadata } from "@/lib/marketingSeo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const title = isSamplify
    ? "Delete your account and data"
    : "Удаление аккаунта и данных";
  const description = isSamplify
    ? "How to delete your SkyForest account and personal data, what is removed, what may be retained, and for how long."
    : "Как удалить аккаунт SkyForest и персональные данные: что удаляется, что может храниться и в течение какого срока.";
  return marketingPageMetadata({ title, description, path: "/delete-account", locale });
}

export default async function DeleteAccountPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "footer" });
  const pageTitle = isSamplify
    ? "Delete your account and data"
    : "Удаление аккаунта и данных";

  if (isSamplify) {
    return (
      <div className="mx-auto max-w-3xl px-4 pb-16 sm:pb-20 pt-24 sm:pt-28 sm:px-6 lg:px-8">
        <MarketingPageHeader
          locale={locale}
          title={pageTitle}
          breadcrumbs={[
            { name: t("legalTitle"), path: "/privacy" },
            { name: pageTitle },
          ]}
        />
        <DeleteAccountSamplify />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 sm:pb-20 pt-24 sm:pt-28 sm:px-6 lg:px-8">
      <MarketingPageHeader
        locale={locale}
        title={pageTitle}
        breadcrumbs={[
          { name: t("legalTitle"), path: "/privacy" },
          { name: pageTitle },
        ]}
      />

      <div className="prose prose-sm max-w-none space-y-6 text-foreground">
        <p className="text-muted-foreground">Редакция от 02 июля 2026 г.</p>

        <p>
          На этой странице описано, как удалить аккаунт {BRAND.name} и связанные
          с ним персональные данные. Оператором является{" "}
          {BRAND.company.legalName}, {BRAND.company.address}. Запрос на удаление
          можно направить без входа в аккаунт.
        </p>

        <h2 className="text-xl font-semibold">Как удалить аккаунт</h2>

        <h3 className="text-lg font-semibold">
          Способ 1 — в приложении (самостоятельно)
        </h3>
        <p>Если вы можете войти в аккаунт, удалите его самостоятельно:</p>
        <ol className="list-decimal space-y-2 pl-6">
          <li>Откройте {BRAND.name} и перейдите на страницу «Аккаунт».</li>
          <li>
            В нижней части страницы нажмите <strong>«Удалить аккаунт»</strong>.
          </li>
          <li>
            Подтвердите действие, введя адрес электронной почты аккаунта.
            Удаление планируется с 14-дневным периодом отмены, после которого
            аккаунт и данные удаляются безвозвратно автоматически.
          </li>
          <li>
            В течение этих 14 дней запланированное удаление можно отменить,
            снова войдя в аккаунт.
          </li>
        </ol>

        <h3 className="text-lg font-semibold">Способ 2 — по запросу</h3>
        <p>
          Если доступа к приложению нет, напишите нам с адреса электронной
          почты, привязанного к аккаунту:
        </p>
        <div className="rounded-xl bg-muted p-4 text-sm">
          <p>
            Кому: <strong>{BRAND.contacts.email}</strong>
          </p>
          <p>
            Тема: <strong>Удалить мой аккаунт</strong>
          </p>
        </div>
        <p>
          Мы проверяем, что запрос поступил от владельца аккаунта, и
          обрабатываем его в течение 30 дней.
        </p>

        <h2 className="text-xl font-semibold">Что удаляется</h2>
        <p>При удалении аккаунта безвозвратно удаляются:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>Профиль (имя и адрес электронной почты)</li>
          <li>Сохранённые локации и заметки</li>
          <li>Записи «лучших дней»</li>
          <li>Загруженные вами фотографии</li>
          <li>Объявления и сообщения на Маркетплейсе</li>
          <li>Токены push-уведомлений для ваших устройств</li>
          <li>
            История поиска, сравнения, реферальные коды и подписки
          </li>
          <li>
            Баланс токенов и неиспользованные токены (возврату не подлежат)
          </li>
        </ul>

        <h2 className="text-xl font-semibold">
          Что может храниться и в течение какого срока
        </h2>
        <p>
          Часть данных мы обязаны хранить ограниченное время по юридическим,
          финансовым и антифрод-причинам:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            Данные о покупках и транзакциях, требуемые бухгалтерским и налоговым
            законодательством, хранятся в течение установленного законом срока,
            после чего удаляются.
          </li>
          <li>
            Минимальная запись (хешированный идентификатор и адрес почты) может
            сохраняться для предотвращения злоупотреблений и мошенничества.
          </li>
          <li>
            Остаточные копии в зашифрованных резервных копиях удаляются в течение
            примерно 30 дней.
          </li>
        </ul>

        <h2 className="text-xl font-semibold">Сроки</h2>
        <p>
          Самостоятельное удаление завершается автоматически после 14-дневного
          периода отмены. Запросы, отправленные по электронной почте,
          обрабатываются в течение 30 дней. Резервные копии удаляются в течение
          примерно 30 дней после этого.
        </p>

        <p>
          Подробнее об обработке персональных данных — в{" "}
          <a href={`${BRAND.url}/privacy`} className="underline">
            Политике конфиденциальности
          </a>
          . Вопросы можно направить на {BRAND.contacts.email}.
        </p>
      </div>
    </div>
  );
}
