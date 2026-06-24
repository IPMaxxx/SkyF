import type { Metadata } from "next";
import { BRAND, isSamplify } from "@/lib/brand";
import { PaymentMethodSamplify } from "@/components/legal/PaymentMethodSamplify";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const base = BRAND.url;
  const path = "/payment_method";
  return {
    title: isSamplify ? "Payment methods" : "Способы оплаты",
    description: isSamplify
      ? "How to pay for SkyForest tokens — secure card payments via Stripe."
      : "Способы оплаты токенов в Skyforest.by — банковские карты, ЕРИП и другие варианты. Безопасные платежи через bePaid.",
    alternates: {
      canonical: locale === "en" ? `${base}/en${path}` : `${base}${path}`,
      languages: { ru: `${base}${path}`, en: `${base}/en${path}` },
    },
  };
}

export default function PaymentMethodPage() {
  if (isSamplify) {
    return (
      <div className="mx-auto max-w-3xl px-4 pb-16 sm:pb-20 pt-24 sm:pt-28 sm:px-6 lg:px-8">
        <h1 className="mb-6 sm:mb-8 text-2xl sm:text-3xl font-bold">
          Payment methods
        </h1>
        <PaymentMethodSamplify />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 sm:pb-20 pt-24 sm:pt-28 sm:px-6 lg:px-8">
      <h1 className="mb-6 sm:mb-8 text-2xl sm:text-3xl font-bold">Способы оплаты</h1>

      <div className="prose prose-sm max-w-none space-y-8 text-foreground">
        <section>
          <h2 className="text-xl font-semibold">1. Оплата через ЕРИП</h2>
          <p>
            Оплату можно произвести в любом сервисе системы «Расчёт» (ЕРИП):
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Банкоматы</li>
            <li>Кассы банков</li>
            <li>Инфокиоски</li>
            <li>Мобильный банкинг</li>
            <li>Интернет-банкинг</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">
            2. Оплата банковской картой через интернет
          </h2>
          <p>
            Для оплаты банковской картой через интернет используется платёжный
            процессор{" "}
            <a
              href="https://bepaid.by"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              bePaid
            </a>
            . Платежи защищены сертификатом PCI DSS Level 1 — высшим уровнем
            безопасности платёжных данных.
          </p>

          <h3 className="text-lg font-semibold">Принимаемые карты:</h3>
          <ul className="list-disc space-y-2 pl-6">
            <li>Visa</li>
            <li>Visa Electron</li>
            <li>MasterCard</li>
            <li>Maestro</li>
            <li>Белкарт</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">3. Безопасность платежей</h2>
          <p>
            Все данные передаются по защищённому каналу SSL/TLS. Данные вашей
            банковской карты не передаются интернет-магазину и не хранятся на
            сервере. Обработка платежей полностью соответствует стандарту PCI
            DSS.
          </p>
          <p>
            Для дополнительной безопасности используется технология 3-D Secure.
            При совершении платежа вы будете перенаправлены на страницу вашего
            банка для подтверждения операции.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">4. Порядок оплаты</h2>
          <ol className="list-decimal space-y-2 pl-6">
            <li>Оформите заказ на сайте</li>
            <li>Выберите способ оплаты «Банковская карта»</li>
            <li>
              Введите реквизиты карты: номер, срок действия, имя держателя,
              CVV-код
            </li>
            <li>Нажмите «Оплатить»</li>
            <li>При необходимости пройдите верификацию 3-D Secure</li>
            <li>Получите подтверждение оплаты на email</li>
          </ol>
        </section>

        <section>
          <h2 className="text-xl font-semibold">5. Возврат средств</h2>
          <p>
            Возврат денежных средств производится на карту, с которой была
            произведена оплата. Срок возврата составляет от 1 до 30 дней в
            зависимости от банка-эмитента.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">6. Поддержка</h2>
          <p>
            По вопросам оплаты обращайтесь в нашу службу поддержки:
          </p>
          <div className="rounded-xl bg-muted p-4 text-sm">
            {BRAND.contacts.telegram && BRAND.contacts.telegramLabel && (
              <p>
                Telegram:{" "}
                <a
                  href={BRAND.contacts.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {BRAND.contacts.telegramLabel}
                </a>
              </p>
            )}
            <p>Email: {BRAND.contacts.email}</p>
            {BRAND.contacts.phone && <p>Телефон: {BRAND.contacts.phone}</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
