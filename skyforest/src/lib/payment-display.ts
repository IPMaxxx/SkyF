import { CreditCard, Building2, MessageSquare, Wallet } from "lucide-react";
import { isSamplify } from "./brand";

export const WITHDRAW_METHODS = isSamplify
  ? ([
      {
        id: "card",
        labelEn: "Bank card",
        labelRu: "Банковская карта",
        placeholderEn: "Card number or payout details",
        placeholderRu: "Номер карты или реквизиты",
        icon: CreditCard,
      },
      {
        id: "bank",
        labelEn: "Bank transfer / IBAN",
        labelRu: "Банковский перевод / IBAN",
        placeholderEn: "IBAN / SWIFT / account number",
        placeholderRu: "IBAN / SWIFT / номер счёта",
        icon: Building2,
      },
      {
        id: "other",
        labelEn: "Other method",
        labelRu: "Другой способ",
        placeholderEn: "Describe payout method and details",
        placeholderRu: "Укажите способ и реквизиты",
        icon: MessageSquare,
      },
    ] as const)
  : ([
      {
        id: "card",
        labelEn: "Bank card",
        labelRu: "Банковская карта",
        placeholderEn: "Card number (XXXX XXXX XXXX XXXX)",
        placeholderRu: "Номер карты (XXXX XXXX XXXX XXXX)",
        icon: CreditCard,
      },
      {
        id: "erip",
        labelEn: "ERIP / bank account",
        labelRu: "ЕРИП / расчётный счёт",
        placeholderEn: "Account / IBAN",
        placeholderRu: "Номер счёта / IBAN",
        icon: Building2,
      },
      {
        id: "phone",
        labelEn: "Phone transfer",
        labelRu: "Перевод по номеру телефона",
        placeholderEn: "+375 (XX) XXX-XX-XX",
        placeholderRu: "+375 (XX) XXX-XX-XX",
        icon: Wallet,
      },
      {
        id: "other",
        labelEn: "Other method",
        labelRu: "Другой способ",
        placeholderEn: "Describe payout method and details",
        placeholderRu: "Укажите способ и реквизиты",
        icon: MessageSquare,
      },
    ] as const);

export function withdrawMethodLabel(
  method: (typeof WITHDRAW_METHODS)[number],
  locale: string
): string {
  return locale === "en" ? method.labelEn : method.labelRu;
}

export function withdrawMethodPlaceholder(
  method: (typeof WITHDRAW_METHODS)[number],
  locale: string
): string {
  return locale === "en" ? method.placeholderEn : method.placeholderRu;
}

export const ACCEPTED_CARDS = isSamplify
  ? (["Visa", "MasterCard", "Amex"] as const)
  : (["Visa", "MasterCard", "Belkart"] as const);
