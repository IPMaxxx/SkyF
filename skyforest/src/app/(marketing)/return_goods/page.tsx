import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Условия возврата товара",
  description:
    "Условия возврата средств за токены в сервисе Skyforest.by — порядок и сроки возврата.",
  alternates: { canonical: "https://skyforest.by/return_goods" },
};

export default function ReturnGoodsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-bold">Условия возврата товара</h1>

      <div className="prose prose-sm max-w-none space-y-6 text-foreground">
        <h2 className="text-xl font-semibold">Правовая основа</h2>
        <p>
          Возврат товара осуществляется в соответствии с Законом Республики
          Беларусь «О защите прав потребителей»:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Статья 25</strong> — право на возврат товара надлежащего
            качества в течение 14 дней для розничных покупок
          </li>
          <li>
            <strong>Статья 26.1</strong> — право на возврат товара в течение 7
            дней при дистанционной покупке (без объяснения причин)
          </li>
        </ul>

        <h2 className="text-xl font-semibold">Условия возврата</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>Товар должен сохранить внешний вид и свойства</li>
          <li>
            Необходимо предоставить доказательство покупки (чек или иное
            подтверждение)
          </li>
          <li>
            Возврат не включает расходы продавца на доставку
          </li>
        </ul>

        <h2 className="text-xl font-semibold">Способы оформления возврата</h2>

        <h3 className="text-lg font-semibold">Дистанционный возврат</h3>
        <p>Для оформления возврата свяжитесь с нами любым удобным способом:</p>
        <div className="rounded-xl bg-muted p-4 text-sm">
          <p>Email: support@skyforest.by</p>
          <p>Телефон: +375 29 328 2842</p>
        </div>

        <p>В заявке на возврат укажите:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>Контактные данные</li>
          <li>Данные заказа</li>
          <li>Банковские реквизиты для возврата средств</li>
        </ul>

        <h2 className="text-xl font-semibold">Сроки возврата средств</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            Максимальный срок возврата — 7 дней с момента получения
            возвращённого товара
          </li>
          <li>
            Возврат на банковскую карту — от 1 до 3 рабочих дней после обработки
          </li>
          <li>Банк может удерживать комиссию за перевод</li>
        </ul>

        <h2 className="text-xl font-semibold">Доставка при возврате</h2>
        <p>
          Расходы на обратную доставку несёт покупатель. Компенсация расходов на
          доставку не производится.
        </p>
      </div>
    </div>
  );
}
