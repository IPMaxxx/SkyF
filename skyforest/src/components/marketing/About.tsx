import { CloudSun, Star, GitCompareArrows, CloudRain } from "lucide-react";

const STEPS = [
  {
    icon: CloudSun,
    title: "Проверьте погоду",
    desc: "Сохраните ваши грибные локации и мгновенно получайте архивные данные о погоде за 14 дней: температура, дождь, ветер, влажность.",
    color: "from-blue-500 to-cyan-600",
  },
  {
    icon: Star,
    title: "Запомните лучший день",
    desc: "Был удачный сбор? Сохраните дату, локацию и вид гриба. Skyforest зафиксирует 14-дневный погодный паттерн как ваш эталон.",
    color: "from-amber-500 to-orange-600",
  },
  {
    icon: GitCompareArrows,
    title: "Сравните паттерны",
    desc: "Выберите эталонный день и текущую дату — получите точный процент совпадения погоды. Настраивайте веса параметров под себя.",
    color: "from-violet-500 to-purple-600",
  },
  {
    icon: CloudRain,
    title: "Изучите карту осадков",
    desc: "Поставьте точку, задайте радиус — увидите тепловую карту дождей за последние дни. Ищите грибы там, где шёл дождь.",
    color: "from-sky-500 to-blue-600",
  },
];

export function About() {
  return (
    <section id="about" className="relative py-20 sm:py-28">
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
            Как это работает
          </h2>
          <p className="mx-auto max-w-2xl text-white/60">
            Skyforest анализирует погодные данные и сравнивает их с вашими
            лучшими грибными днями. Простой путь от данных к корзине с грибами.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className="glass rounded-2xl p-6 transition-all hover:bg-white/10"
            >
              <div
                className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${step.color} text-white shadow-lg`}
              >
                <step.icon className="h-6 w-6" />
              </div>
              <div className="mb-3 text-xs font-bold uppercase tracking-wider text-white/40">
                Шаг {i + 1}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-white/60">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
