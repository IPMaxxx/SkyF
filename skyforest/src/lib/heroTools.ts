import type { LucideIcon } from "lucide-react";
import {
  Bell,
  CloudSun,
  Droplets,
  Footprints,
  ScanSearch,
  Store,
  Trees,
} from "lucide-react";

export type HeroToolTitleKey =
  | "f0Title"
  | "f1Title"
  | "f2Title"
  | "f3Title"
  | "f4Title"
  | "f5Title"
  | "f6Title";

export type HeroToolDescKey =
  | "f0Desc"
  | "f1Desc"
  | "f2Desc"
  | "f3Desc"
  | "f4Desc"
  | "f5Desc"
  | "f6Desc";

export type HeroTool = {
  id: string;
  icon: LucideIcon;
  titleKey: HeroToolTitleKey;
  descKey: HeroToolDescKey;
  href: string;
  accent: string;
  glow: string;
  iconBg: string;
};

export const HERO_TOOLS: HeroTool[] = [
  {
    id: "weather",
    icon: CloudSun,
    titleKey: "f5Title",
    descKey: "f5Desc",
    href: "/dashboard/weather",
    accent: "from-sky-400 to-cyan-400",
    glow: "group-hover:shadow-sky-500/30",
    iconBg: "from-sky-500/25 to-cyan-500/25",
  },
  {
    id: "monitor",
    icon: Bell,
    titleKey: "f0Title",
    descKey: "f0Desc",
    href: "/dashboard/compare",
    accent: "from-violet-400 to-purple-400",
    glow: "group-hover:shadow-violet-500/30",
    iconBg: "from-violet-500/25 to-purple-500/25",
  },
  {
    id: "rain",
    icon: Droplets,
    titleKey: "f1Title",
    descKey: "f1Desc",
    href: "/dashboard/rain-map",
    accent: "from-blue-400 to-indigo-400",
    glow: "group-hover:shadow-blue-500/30",
    iconBg: "from-blue-500/25 to-indigo-500/25",
  },
  {
    id: "forest",
    icon: Trees,
    titleKey: "f3Title",
    descKey: "f3Desc",
    href: "/dashboard/forest-search",
    accent: "from-emerald-400 to-teal-400",
    glow: "group-hover:shadow-emerald-500/30",
    iconBg: "from-emerald-500/25 to-teal-500/25",
  },
  {
    id: "market",
    icon: Store,
    titleKey: "f2Title",
    descKey: "f2Desc",
    href: "/dashboard/marketplace",
    accent: "from-pink-400 to-rose-400",
    glow: "group-hover:shadow-pink-500/30",
    iconBg: "from-pink-500/25 to-rose-500/25",
  },
  {
    id: "bot",
    icon: ScanSearch,
    titleKey: "f4Title",
    descKey: "f4Desc",
    href: "/#bot",
    accent: "from-amber-400 to-orange-400",
    glow: "group-hover:shadow-amber-500/30",
    iconBg: "from-amber-500/25 to-orange-500/25",
  },
  {
    id: "tours",
    icon: Footprints,
    titleKey: "f6Title",
    descKey: "f6Desc",
    href: "/dashboard/mushroom-tours",
    accent: "from-lime-400 to-green-400",
    glow: "group-hover:shadow-lime-500/30",
    iconBg: "from-lime-500/25 to-green-500/25",
  },
];

/** 3 + 2 + 2 — от анализа погоды к поиску мест и доп. сервисам */
export const HERO_TOOL_ROWS: string[][] = [
  ["weather", "monitor", "rain"],
  ["forest", "market"],
  ["bot", "tours"],
];

export const HERO_TOOL_BY_ID = Object.fromEntries(
  HERO_TOOLS.map((tool) => [tool.id, tool])
) as Record<string, HeroTool>;
