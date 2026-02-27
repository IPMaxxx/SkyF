import { Mail, Phone, Send } from "lucide-react";

const CONTACTS = [
  {
    icon: Mail,
    label: "Email",
    value: "support@skyforest.by",
    href: "mailto:support@skyforest.by",
  },
  {
    icon: Phone,
    label: "Телефон",
    value: "+375 29 328 2842",
    href: "tel:+375293282842",
  },
  {
    icon: Send,
    label: "Telegram",
    value: "Чат с поддержкой",
    href: "https://t.me/skyforest_support_bot",
  },
];

const MESSENGERS = [
  {
    label: "WhatsApp",
    href: "https://wa.clck.bar/375293282842",
    color: "bg-green-600/80 hover:bg-green-600",
  },
  {
    label: "Viber",
    href: "viber://chat?number=%2B375293282842",
    color: "bg-purple-600/80 hover:bg-purple-600",
  },
  {
    label: "Telegram",
    href: "https://t.me/skyforest_support_bot",
    color: "bg-blue-600/80 hover:bg-blue-600",
  },
];

export function Contacts() {
  return (
    <section id="contacts" className="relative py-20 sm:py-28">
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
            Есть вопросы?
          </h2>
          <p className="text-white/60">Свяжитесь с нами</p>
        </div>

        <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-3">
          {CONTACTS.map((c) => (
            <a
              key={c.label}
              href={c.href}
              target={c.href.startsWith("http") ? "_blank" : undefined}
              rel={
                c.href.startsWith("http") ? "noopener noreferrer" : undefined
              }
              className="glass flex flex-col items-center rounded-2xl p-6 text-center transition-all hover:bg-white/10"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                <c.icon className="h-5 w-5 text-primary-light" />
              </div>
              <p className="mb-1 text-sm font-medium text-white/50">
                {c.label}
              </p>
              <p className="text-sm font-semibold text-white">{c.value}</p>
            </a>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {MESSENGERS.map((m) => (
            <a
              key={m.label}
              href={m.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`rounded-xl px-6 py-2.5 text-sm font-medium text-white transition-colors ${m.color}`}
            >
              {m.label}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
