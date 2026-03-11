"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { UserName } from "@/components/app/UserName";
import {
  ArrowLeft,
  Loader2,
  Shield,
  Users,
  MapPin,
  Star,
  Store,
  Coins,
  Gift,
  Search,
  Trees,
  GitCompareArrows,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Pencil,
  Check,
  X,
  RefreshCw,
  BarChart3,
  MessageSquare,
  Eye,
  ExternalLink,
  Activity,
} from "lucide-react";

/* ───────────── Types ───────────── */

interface StatsData {
  counts: Record<string, number>;
  tokens: {
    total_balance: number;
    total_purchased: number;
    total_spent: number;
    total_earned: number;
  };
  recent_users: { id: string; email: string; full_name: string | null; created_at: string }[];
  recent_transactions: {
    id: string;
    user_id: string;
    amount: number;
    type: string;
    description: string | null;
    created_at: string;
  }[];
}

interface TableConfig {
  key: string;
  label: string;
  icon: typeof Users;
  columns: ColumnDef[];
  editable?: string[];
  pkColumn?: string;
}

interface ColumnDef {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "boolean" | "badge" | "user" | "json" | "link" | "photos";
  width?: string;
  nested?: string;
  badgeColors?: Record<string, string>;
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
}

type Tab = "overview" | string;

/* ───────────── Constants ───────────── */

const BADGE_COLORS: Record<string, string> = {
  admin: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  user: "bg-gray-500/20 text-gray-300 border-gray-500/30",
  active: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  sold: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  cancelled: "bg-red-500/20 text-red-300 border-red-500/30",
  purchase: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  spend: "bg-red-500/20 text-red-300 border-red-500/30",
  bonus: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  refund: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  winter: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  spring: "bg-green-500/20 text-green-300 border-green-500/30",
  summer: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  autumn: "bg-orange-500/20 text-orange-300 border-orange-500/30",
};

const SEASON_LABELS: Record<string, string> = {
  winter: "Зима",
  spring: "Весна",
  summer: "Лето",
  autumn: "Осень",
};

const TOKEN_TYPE_LABELS: Record<string, string> = {
  purchase: "Покупка",
  spend: "Расход",
  bonus: "Бонус",
  refund: "Возврат",
};

const TABLES: TableConfig[] = [
  {
    key: "profiles",
    label: "Пользователи",
    icon: Users,
    editable: ["full_name", "phone", "_balance"],
    columns: [
      { key: "email", label: "Email", type: "text" },
      { key: "full_name", label: "Имя", type: "text" },
      { key: "phone", label: "Телефон", type: "text" },
      {
        key: "account_type",
        label: "Тип",
        type: "badge",
        width: "w-20",
      },
      {
        key: "_balance",
        label: "Баланс",
        type: "number",
        render: (_v, row) => {
          const tb = row.token_balance as Record<string, number> | null;
          if (!tb) return <span className="text-muted-foreground">—</span>;
          return (
            <span className="flex items-center gap-1 text-amber-400 font-semibold">
              <Coins className="h-3 w-3" />
              {tb.balance ?? 0}
            </span>
          );
        },
      },
      {
        key: "token_balance_purchased",
        label: "Купл.",
        type: "number",
        render: (_v, row) => {
          const tb = row.token_balance as Record<string, number> | null;
          return (
            <span className="text-emerald-400 text-xs">
              {tb?.total_purchased ?? 0}
            </span>
          );
        },
      },
      {
        key: "token_balance_spent",
        label: "Потр.",
        type: "number",
        render: (_v, row) => {
          const tb = row.token_balance as Record<string, number> | null;
          return (
            <span className="text-red-400 text-xs">
              {tb?.total_spent ?? 0}
            </span>
          );
        },
      },
      { key: "created_at", label: "Создан", type: "date" },
    ],
  },
  {
    key: "locations",
    label: "Локации",
    icon: MapPin,
    editable: ["name"],
    columns: [
      { key: "name", label: "Название", type: "text" },
      {
        key: "coords",
        label: "Координаты",
        render: (_v, row) => {
          const lat = row.lat as number;
          const lng = row.lng as number;
          return (
            <a
              href={`https://www.google.com/maps?q=${lat},${lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              {lat?.toFixed(4)}, {lng?.toFixed(4)}
              <ExternalLink className="h-3 w-3" />
            </a>
          );
        },
      },
      {
        key: "profile",
        label: "Пользователь",
        type: "user",
        render: (_v, row) => {
          const p = row.profile as Record<string, string> | null;
          return (
            <div className="text-xs">
              <span className="font-medium">{p?.full_name || "—"}</span>
              {p?.email && (
                <span className="text-muted-foreground ml-1">({p.email})</span>
              )}
            </div>
          );
        },
      },
      { key: "created_at", label: "Создана", type: "date" },
    ],
  },
  {
    key: "best_days",
    label: "Грибные дни",
    icon: Star,
    editable: ["name", "best_date"],
    columns: [
      { key: "name", label: "Название", type: "text" },
      { key: "best_date", label: "Дата", type: "date" },
      {
        key: "mushroom",
        label: "Гриб",
        render: (_v, row) => {
          const m = row.mushroom as Record<string, string> | null;
          if (!m) return <span className="text-muted-foreground text-xs">—</span>;
          return (
            <div className="flex items-center gap-2">
              {m.image_url && (
                <img
                  src={m.image_url}
                  alt=""
                  className="h-6 w-6 rounded object-cover flex-shrink-0"
                />
              )}
              <span className="text-xs truncate max-w-[120px]">
                {m.common_name || m.latin_name}
              </span>
            </div>
          );
        },
      },
      {
        key: "location",
        label: "Локация",
        render: (_v, row) => {
          const l = row.location as Record<string, unknown> | null;
          if (!l) return <span className="text-muted-foreground text-xs">—</span>;
          return (
            <span className="text-xs truncate max-w-[100px]" title={l.name as string}>
              {l.name as string}
            </span>
          );
        },
      },
      {
        key: "photos",
        label: "Фото",
        type: "photos",
        render: (_v, row) => {
          const photos = row.photos as string[] | null;
          if (!photos || photos.length === 0)
            return <span className="text-muted-foreground text-xs">0</span>;
          return <span className="text-xs text-emerald-400">{photos.length}</span>;
        },
      },
      {
        key: "profile",
        label: "Пользователь",
        type: "user",
        render: (_v, row) => {
          const p = row.profile as Record<string, string> | null;
          return (
            <span className="text-xs">{p?.full_name || p?.email || "—"}</span>
          );
        },
      },
      { key: "created_at", label: "Создан", type: "date" },
    ],
  },
  {
    key: "marketplace_listings",
    label: "Маркетплейс",
    icon: Store,
    editable: ["price", "status"],
    columns: [
      {
        key: "best_day",
        label: "Грибной день",
        render: (_v, row) => {
          const bd = row.best_day as Record<string, string> | null;
          return <span className="text-xs font-medium">{bd?.name || "—"}</span>;
        },
      },
      { key: "price", label: "Цена", type: "number",
        render: (_v, row) => (
          <span className="flex items-center gap-1 text-amber-400 font-semibold text-xs">
            <Coins className="h-3 w-3" />
            {row.price as number}
          </span>
        ),
      },
      {
        key: "season",
        label: "Сезон",
        type: "badge",
        render: (_v, row) => {
          const s = row.season as string;
          return (
            <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${BADGE_COLORS[s] ?? ""}`}>
              {SEASON_LABELS[s] || s}
            </span>
          );
        },
      },
      {
        key: "status",
        label: "Статус",
        type: "badge",
      },
      {
        key: "seller",
        label: "Продавец",
        render: (_v, row) => {
          const s = row.seller as Record<string, string> | null;
          return <span className="text-xs">{s?.full_name || s?.email || "—"}</span>;
        },
      },
      { key: "sold_at", label: "Продан", type: "date" },
      { key: "created_at", label: "Создан", type: "date" },
    ],
  },
  {
    key: "marketplace_messages",
    label: "Сообщения",
    icon: MessageSquare,
    columns: [
      {
        key: "message",
        label: "Сообщение",
        render: (_v, row) => (
          <span className="text-xs truncate max-w-[200px] block">
            {row.message as string}
          </span>
        ),
      },
      { key: "listing_id", label: "Листинг", type: "text", width: "w-16",
        render: (_v, row) => (
          <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[60px] block">
            {(row.listing_id as string)?.slice(0, 8)}…
          </span>
        ),
      },
      {
        key: "sender",
        label: "Отправитель",
        render: (_v, row) => {
          const s = row.sender as Record<string, string> | null;
          if (s) return <span className="text-xs">{s.full_name || s.email || "—"}</span>;
          return (
            <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[80px] block">
              {(row.sender_id as string)?.slice(0, 8)}…
            </span>
          );
        },
      },
      { key: "created_at", label: "Дата", type: "date" },
    ],
  },
  {
    key: "token_transactions",
    label: "Транзакции",
    icon: Coins,
    columns: [
      {
        key: "type",
        label: "Тип",
        type: "badge",
        render: (_v, row) => {
          const t = row.type as string;
          return (
            <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${BADGE_COLORS[t] ?? ""}`}>
              {TOKEN_TYPE_LABELS[t] || t}
            </span>
          );
        },
      },
      {
        key: "amount",
        label: "Сумма",
        type: "number",
        render: (_v, row) => {
          const a = row.amount as number;
          return (
            <span className={`font-semibold text-xs ${a > 0 ? "text-emerald-400" : "text-red-400"}`}>
              {a > 0 ? "+" : ""}{a}
            </span>
          );
        },
      },
      { key: "description", label: "Описание", type: "text",
        render: (_v, row) => (
          <span className="text-xs truncate max-w-[150px] block text-muted-foreground">
            {(row.description as string) || "—"}
          </span>
        ),
      },
      { key: "balance_after", label: "Остаток", type: "number" },
      {
        key: "profile",
        label: "Пользователь",
        render: (_v, row) => {
          const p = row.profile as Record<string, string> | null;
          return <span className="text-xs">{p?.full_name || p?.email || "—"}</span>;
        },
      },
      { key: "created_at", label: "Дата", type: "date" },
    ],
  },
  {
    key: "token_balances",
    label: "Балансы",
    icon: Coins,
    pkColumn: "user_id",
    editable: ["balance", "total_purchased", "total_spent", "total_earned"],
    columns: [
      {
        key: "profile",
        label: "Пользователь",
        render: (_v, row) => {
          const p = row.profile as Record<string, string> | null;
          return (
            <div className="text-xs">
              <span className="font-medium">{p?.full_name || "—"}</span>
              {p?.email && <span className="text-muted-foreground ml-1">({p.email})</span>}
            </div>
          );
        },
      },
      { key: "balance", label: "Баланс", type: "number",
        render: (_v, row) => (
          <span className="font-semibold text-amber-400 text-xs">{row.balance as number}</span>
        ),
      },
      { key: "total_purchased", label: "Куплено", type: "number",
        render: (_v, row) => <span className="text-xs text-emerald-400">{row.total_purchased as number}</span>,
      },
      { key: "total_spent", label: "Потрачено", type: "number",
        render: (_v, row) => <span className="text-xs text-red-400">{row.total_spent as number}</span>,
      },
      { key: "total_earned", label: "Заработано", type: "number",
        render: (_v, row) => <span className="text-xs text-blue-400">{row.total_earned as number}</span>,
      },
      { key: "updated_at", label: "Обновлён", type: "date" },
    ],
  },
  {
    key: "referral_codes",
    label: "Реф. коды",
    icon: Gift,
    columns: [
      { key: "code", label: "Код", type: "text" },
      { key: "uses_count", label: "Использований", type: "number" },
      {
        key: "profile",
        label: "Пользователь",
        render: (_v, row) => {
          const p = row.profile as Record<string, string> | null;
          return <span className="text-xs">{p?.full_name || p?.email || "—"}</span>;
        },
      },
      { key: "created_at", label: "Создан", type: "date" },
    ],
  },
  {
    key: "auto_compares",
    label: "Авто-мониторинг",
    icon: GitCompareArrows,
    editable: ["enabled", "name"],
    columns: [
      { key: "name", label: "Название", type: "text" },
      {
        key: "enabled",
        label: "Активен",
        type: "boolean",
        render: (_v, row) => (
          <span className={`text-xs font-medium ${row.enabled ? "text-emerald-400" : "text-red-400"}`}>
            {row.enabled ? "Да" : "Нет"}
          </span>
        ),
      },
      { key: "run_time", label: "Время", type: "text" },
      {
        key: "last_score",
        label: "Последний балл",
        type: "number",
        render: (_v, row) => {
          const s = row.last_score as number | null;
          if (s === null || s === undefined) return <span className="text-muted-foreground text-xs">—</span>;
          return <span className="text-xs font-medium">{Number(s).toFixed(1)}%</span>;
        },
      },
      {
        key: "profile",
        label: "Пользователь",
        render: (_v, row) => {
          const p = row.profile as Record<string, string> | null;
          return <span className="text-xs">{p?.full_name || p?.email || "—"}</span>;
        },
      },
      { key: "last_run_at", label: "Последний запуск", type: "date" },
      { key: "created_at", label: "Создан", type: "date" },
    ],
  },
  {
    key: "forest_search_history",
    label: "Поиск леса",
    icon: Trees,
    columns: [
      {
        key: "ref_coords",
        label: "Реф. точка",
        render: (_v, row) => (
          <span className="text-xs font-mono">
            {(row.ref_lat as number)?.toFixed(3)}, {(row.ref_lng as number)?.toFixed(3)}
          </span>
        ),
      },
      { key: "radius_km", label: "Радиус", type: "number",
        render: (_v, row) => <span className="text-xs">{row.radius_km as number} км</span>,
      },
      { key: "token_cost", label: "Стоимость", type: "number",
        render: (_v, row) => (
          <span className="flex items-center gap-1 text-amber-400 text-xs">
            <Coins className="h-3 w-3" />{row.token_cost as number}
          </span>
        ),
      },
      {
        key: "profile",
        label: "Пользователь",
        render: (_v, row) => {
          const p = row.profile as Record<string, string> | null;
          return <span className="text-xs">{p?.full_name || p?.email || "—"}</span>;
        },
      },
      { key: "created_at", label: "Дата", type: "date" },
    ],
  },
  {
    key: "active_users",
    label: "Активные юзеры",
    icon: Activity,
    columns: [
      { key: "full_name", label: "Имя", type: "text" },
      { key: "email", label: "Email", type: "text" },
      {
        key: "balance",
        label: "Баланс",
        type: "number",
        render: (_v: unknown, row: Record<string, unknown>) => (
          <span className="flex items-center gap-1 text-amber-400 font-semibold text-xs">
            <Coins className="h-3 w-3" />
            {row.balance as number}
          </span>
        ),
      },
      {
        key: "total_purchased",
        label: "Купл.",
        type: "number",
        render: (_v: unknown, row: Record<string, unknown>) => (
          <span className="text-emerald-400 text-xs">{row.total_purchased as number}</span>
        ),
      },
      {
        key: "total_spent",
        label: "Потр.",
        type: "number",
        render: (_v: unknown, row: Record<string, unknown>) => (
          <span className="text-red-400 text-xs">{row.total_spent as number}</span>
        ),
      },
      {
        key: "locations_count",
        label: "Локации",
        type: "number",
        render: (_v: unknown, row: Record<string, unknown>) => {
          const c = row.locations_count as number;
          return <span className={`text-xs ${c > 0 ? "text-emerald-400" : "text-muted-foreground"}`}>{c}</span>;
        },
      },
      {
        key: "best_days_count",
        label: "Гр. дни",
        type: "number",
        render: (_v: unknown, row: Record<string, unknown>) => {
          const c = row.best_days_count as number;
          return <span className={`text-xs ${c > 0 ? "text-amber-400" : "text-muted-foreground"}`}>{c}</span>;
        },
      },
      {
        key: "compares_count",
        label: "Монит.",
        type: "number",
        render: (_v: unknown, row: Record<string, unknown>) => {
          const c = row.compares_count as number;
          return <span className={`text-xs ${c > 0 ? "text-violet-400" : "text-muted-foreground"}`}>{c}</span>;
        },
      },
      {
        key: "transactions_count",
        label: "Транзакции",
        type: "number",
        render: (_v: unknown, row: Record<string, unknown>) => {
          const c = row.transactions_count as number;
          return <span className={`text-xs font-medium ${c > 0 ? "text-foreground" : "text-muted-foreground"}`}>{c}</span>;
        },
      },
      { key: "last_active_at", label: "Посл. актив.", type: "date" },
      { key: "created_at", label: "Регистрация", type: "date" },
    ],
  },
];

/* ───────────── Tab groups for sidebar ───────────── */

const TAB_GROUPS = [
  {
    label: "Обзор",
    items: [{ key: "overview", label: "Дашборд", icon: BarChart3 }],
  },
  {
    label: "Основное",
    items: [
      TABLES.find((t) => t.key === "profiles")!,
      TABLES.find((t) => t.key === "locations")!,
      TABLES.find((t) => t.key === "best_days")!,
    ],
  },
  {
    label: "Маркетплейс",
    items: [
      TABLES.find((t) => t.key === "marketplace_listings")!,
      TABLES.find((t) => t.key === "marketplace_messages")!,
    ],
  },
  {
    label: "Финансы",
    items: [
      TABLES.find((t) => t.key === "token_transactions")!,
      TABLES.find((t) => t.key === "token_balances")!,
    ],
  },
  {
    label: "Рефералы",
    items: [
      TABLES.find((t) => t.key === "referral_codes")!,
    ],
  },
  {
    label: "Активность",
    items: [
      TABLES.find((t) => t.key === "active_users")!,
      TABLES.find((t) => t.key === "auto_compares")!,
      TABLES.find((t) => t.key === "forest_search_history")!,
    ],
  },
];

/* ───────────── Helpers ───────────── */

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  const date = new Date(d);
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortDate(d: string) {
  return new Date(d).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: typeof Users;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Main Component ───────────── */

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Stats
  const [stats, setStats] = useState<StatsData | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Table data
  const [tableData, setTableData] = useState<Record<string, unknown>[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [tablePage, setTablePage] = useState(1);
  const [tableTotal, setTableTotal] = useState(0);
  const [tableTotalPages, setTableTotalPages] = useState(0);
  const [tableLimit] = useState(25);
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Editing
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  // Detail modal
  const [detailRow, setDetailRow] = useState<Record<string, unknown> | null>(null);

  // Filter
  const [filterColumn, setFilterColumn] = useState<string | null>(null);
  const [filterValue, setFilterValue] = useState<string | null>(null);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Admin check
  useEffect(() => {
    const checkAdmin = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsAdmin(false); return; }
      const { data } = await supabase
        .from("profiles")
        .select("account_type")
        .eq("id", user.id)
        .single();
      setIsAdmin(data?.account_type === "admin");
    };
    checkAdmin();
  }, []);

  // Load stats
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) throw new Error();
      setStats(await res.json());
    } catch {
      toast.error("Ошибка загрузки статистики");
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Load table data
  const loadTableData = useCallback(
    async (table: string, page: number, sort?: string | null, dir?: string, search?: string, fCol?: string | null, fVal?: string | null) => {
      setTableLoading(true);
      try {
        const params = new URLSearchParams({
          table,
          page: page.toString(),
          limit: tableLimit.toString(),
        });
        if (sort) params.set("sort_by", sort);
        if (dir) params.set("sort_dir", dir);
        if (search) params.set("search", search);
        if (fCol && fVal) {
          params.set("filter_column", fCol);
          params.set("filter_value", fVal);
        }
        const res = await fetch(`/api/admin/data?${params}`);
        if (!res.ok) throw new Error();
        const json = await res.json();
        setTableData(json.data ?? []);
        setTableTotal(json.total ?? 0);
        setTableTotalPages(json.total_pages ?? 0);
        setTablePage(json.page ?? 1);
      } catch {
        toast.error("Ошибка загрузки данных");
      } finally {
        setTableLoading(false);
      }
    },
    [tableLimit]
  );

  // Tab change
  useEffect(() => {
    if (activeTab === "overview") {
      loadStats();
    } else {
      setSortBy(null);
      setSortDir("desc");
      setSearchQuery("");
      setSearchInput("");
      setFilterColumn(null);
      setFilterValue(null);
      setEditingRow(null);
      loadTableData(activeTab, 1);
    }
  }, [activeTab, loadStats, loadTableData]);

  // Search debounce
  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearchQuery(val);
      if (activeTab !== "overview") {
        loadTableData(activeTab, 1, sortBy, sortDir, val, filterColumn, filterValue);
      }
    }, 400);
  };

  // Sort
  const handleSort = (column: string) => {
    let newDir: "asc" | "desc" = "asc";
    if (sortBy === column) {
      newDir = sortDir === "asc" ? "desc" : "asc";
    }
    setSortBy(column);
    setSortDir(newDir);
    if (activeTab !== "overview") {
      loadTableData(activeTab, 1, column, newDir, searchQuery, filterColumn, filterValue);
    }
  };

  // Pagination
  const handlePageChange = (newPage: number) => {
    if (activeTab !== "overview") {
      loadTableData(activeTab, newPage, sortBy, sortDir, searchQuery, filterColumn, filterValue);
    }
  };

  // Edit
  const startEdit = (row: Record<string, unknown>) => {
    const id = (row.id || row.user_id) as string;
    setEditingRow(id);
    const values = { ...row };
    if (activeTab === "profiles") {
      const tb = row.token_balance as Record<string, number> | null;
      values._balance = tb?.balance ?? 0;
    }
    setEditValues(values);
  };

  const cancelEdit = () => {
    setEditingRow(null);
    setEditValues({});
  };

  const saveEdit = async () => {
    if (!editingRow) return;
    const tableConfig = TABLES.find((t) => t.key === activeTab);
    if (!tableConfig?.editable) return;

    const updates: Record<string, unknown> = {};
    let balanceUpdate: number | undefined;
    for (const col of tableConfig.editable) {
      if (editValues[col] !== undefined) {
        if (col === "_balance") {
          balanceUpdate = Number(editValues[col]);
        } else {
          updates[col] = editValues[col];
        }
      }
    }

    setSaving(true);
    try {
      if (Object.keys(updates).length > 0) {
        const res = await fetch("/api/admin/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table: activeTab, id: editingRow, updates }),
        });
        if (!res.ok) {
          const data = await res.json();
          toast.error(data.error || "Ошибка обновления");
          return;
        }
      }

      if (activeTab === "profiles" && balanceUpdate !== undefined) {
        const res = await fetch("/api/admin/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            table: "token_balances",
            id: editingRow,
            updates: { balance: balanceUpdate },
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          toast.error(data.error || "Ошибка обновления баланса");
          return;
        }
      }

      toast.success("Обновлено");
      cancelEdit();
      loadTableData(activeTab, tablePage, sortBy, sortDir, searchQuery, filterColumn, filterValue);
    } catch {
      toast.error("Ошибка сети");
    } finally {
      setSaving(false);
    }
  };

  // Filter by user from a row
  const filterByUser = (userId: string) => {
    setFilterColumn("user_id");
    setFilterValue(userId);
    if (activeTab !== "overview") {
      loadTableData(activeTab, 1, sortBy, sortDir, searchQuery, "user_id", userId);
    }
  };

  const clearFilter = () => {
    setFilterColumn(null);
    setFilterValue(null);
    if (activeTab !== "overview") {
      loadTableData(activeTab, 1, sortBy, sortDir, searchQuery, null, null);
    }
  };

  // Loading / access denied
  if (isAdmin === null) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <Shield className="mx-auto mb-4 h-16 w-16 text-red-400/50" />
        <h1 className="text-xl font-bold mb-2">Доступ запрещён</h1>
        <p className="text-sm text-muted-foreground mb-4">
          Эта страница доступна только администраторам
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Вернуться
        </Link>
      </div>
    );
  }

  const activeTableConfig = TABLES.find((t) => t.key === activeTab);

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-56" : "w-0 overflow-hidden"
        } flex-shrink-0 border-r border-white/10 bg-[#0d1a12]/80 backdrop-blur-md transition-all duration-200`}
      >
        <div className="sticky top-14 flex h-[calc(100vh-3.5rem)] flex-col overflow-y-auto p-3">
          <div className="mb-3 flex items-center gap-2 px-2">
            <Shield className="h-5 w-5 text-purple-400" />
            <span className="text-sm font-bold text-purple-300">Админ-панель</span>
          </div>

          {TAB_GROUPS.map((group) => (
            <div key={group.label} className="mb-3">
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                {group.label}
              </p>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => setActiveTab(item.key)}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                      activeTab === item.key
                        ? "bg-purple-500/20 text-purple-300"
                        : "text-foreground/70 hover:bg-white/5 hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                    {activeTab !== "overview" && item.key !== "overview" && stats?.counts && (
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        {stats.counts[item.key] ?? ""}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 overflow-x-auto">
        <div className="p-4 lg:p-6">
          {/* Top bar */}
          <div className="mb-6 flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-muted-foreground hover:bg-white/5 hover:text-foreground lg:hidden"
            >
              {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            <Link
              href="/dashboard"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3" />
              Дашборд
            </Link>
          </div>

          {/* Overview tab */}
          {activeTab === "overview" && (
            <div>
              <div className="mb-6 flex items-center justify-between">
                <h1 className="text-xl font-bold">Обзор системы</h1>
                <button
                  onClick={loadStats}
                  disabled={statsLoading}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-white/5 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${statsLoading ? "animate-spin" : ""}`} />
                  Обновить
                </button>
              </div>

              {statsLoading && !stats ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : stats ? (
                <div className="space-y-6">
                  {/* Main stats grid */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    <StatCard label="Пользователей" value={stats.counts.profiles} icon={Users} color="bg-purple-500/20 text-purple-400" />
                    <StatCard label="Локаций" value={stats.counts.locations} icon={MapPin} color="bg-emerald-500/20 text-emerald-400" />
                    <StatCard label="Грибных дней" value={stats.counts.best_days} icon={Star} color="bg-amber-500/20 text-amber-400" />
                    <StatCard label="Акт. листингов" value={stats.counts.listings_active} icon={Store} color="bg-pink-500/20 text-pink-400" />
                    <StatCard label="Продано листингов" value={stats.counts.listings_sold} icon={Store} color="bg-blue-500/20 text-blue-400" />
                    <StatCard label="Отменено листингов" value={stats.counts.listings_cancelled} icon={Store} color="bg-red-500/20 text-red-400" />
                    <StatCard label="Транзакций" value={stats.counts.token_transactions} icon={Coins} color="bg-amber-500/20 text-amber-400" />
                    <StatCard label="Реф. кодов" value={stats.counts.referral_codes} icon={Gift} color="bg-cyan-500/20 text-cyan-400" />
                    <StatCard label="Авто-мониторинг" value={stats.counts.auto_compares} icon={GitCompareArrows} color="bg-indigo-500/20 text-indigo-400" />
                    <StatCard label="Поисков леса" value={stats.counts.forest_searches} icon={Trees} color="bg-green-500/20 text-green-400" />
                    <StatCard label="Сообщений" value={stats.counts.marketplace_messages} icon={MessageSquare} color="bg-teal-500/20 text-teal-400" />
                  </div>

                  {/* Token economy */}
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
                    <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-300">
                      <Coins className="h-4 w-4" />
                      Экономика токенов
                    </h2>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      <div>
                        <p className="text-2xl font-bold text-amber-400">{stats.tokens.total_balance}</p>
                        <p className="text-xs text-muted-foreground">В обращении</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-emerald-400">{stats.tokens.total_purchased}</p>
                        <p className="text-xs text-muted-foreground">Куплено всего</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-red-400">{stats.tokens.total_spent}</p>
                        <p className="text-xs text-muted-foreground">Потрачено всего</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-400">{stats.tokens.total_earned}</p>
                        <p className="text-xs text-muted-foreground">Заработано (маркет)</p>
                      </div>
                    </div>
                  </div>

                  {/* Recent activity */}
                  <div className="grid gap-4 lg:grid-cols-2">
                    {/* Recent users */}
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
                        <Users className="h-4 w-4 text-purple-400" />
                        Последние регистрации
                      </h3>
                      <div className="space-y-2">
                        {stats.recent_users.map((u) => (
                          <div
                            key={u.id}
                            className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2"
                          >
                            <div>
                              <p className="text-xs font-medium">{u.full_name || "Без имени"}</p>
                              <p className="text-[10px] text-muted-foreground">{u.email}</p>
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {formatShortDate(u.created_at)}
                            </span>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => setActiveTab("profiles")}
                        className="mt-3 text-xs text-purple-400 hover:underline"
                      >
                        Все пользователи →
                      </button>
                    </div>

                    {/* Recent transactions */}
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
                        <Coins className="h-4 w-4 text-amber-400" />
                        Последние транзакции
                      </h3>
                      <div className="space-y-2">
                        {stats.recent_transactions.map((t) => (
                          <div
                            key={t.id}
                            className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${BADGE_COLORS[t.type] ?? ""}`}>
                                  {TOKEN_TYPE_LABELS[t.type] || t.type}
                                </span>
                                <span className={`text-xs font-semibold ${t.amount > 0 ? "text-emerald-400" : "text-red-400"}`}>
                                  {t.amount > 0 ? "+" : ""}{t.amount}
                                </span>
                              </div>
                              <p className="mt-0.5 text-[10px] text-muted-foreground truncate max-w-[200px]">
                                {t.description || "—"}
                              </p>
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {formatShortDate(t.created_at)}
                            </span>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => setActiveTab("token_transactions")}
                        className="mt-3 text-xs text-amber-400 hover:underline"
                      >
                        Все транзакции →
                      </button>
                    </div>
                  </div>

                  {/* Quick links */}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {TABLES.slice(0, 8).map((t) => {
                      const Icon = t.icon;
                      return (
                        <button
                          key={t.key}
                          onClick={() => setActiveTab(t.key)}
                          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-xs font-medium transition-colors hover:bg-white/10"
                        >
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Chat view for messages */}
          {activeTab === "marketplace_messages" && (
            <AdminChatsView />
          )}

          {/* Table view */}
          {activeTab !== "overview" && activeTab !== "marketplace_messages" && activeTableConfig && (
            <div>
              {/* Header */}
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
                    <activeTableConfig.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold">{activeTableConfig.label}</h1>
                    <p className="text-xs text-muted-foreground">
                      {tableTotal} записей
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Search */}
                  <div className="relative flex-1 sm:w-64 sm:flex-none">
                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={searchInput}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      placeholder="Поиск..."
                      className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-xs outline-none placeholder:text-muted-foreground/50 focus:border-purple-500/30 focus:ring-1 focus:ring-purple-500/20"
                    />
                  </div>
                  {/* Refresh */}
                  <button
                    onClick={() => loadTableData(activeTab, tablePage, sortBy, sortDir, searchQuery, filterColumn, filterValue)}
                    disabled={tableLoading}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-muted-foreground transition-colors hover:bg-white/5 disabled:opacity-50"
                    title="Обновить"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${tableLoading ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Active filter */}
              {filterColumn && filterValue && (
                <div className="mb-3 flex items-center gap-2 rounded-lg border border-purple-500/20 bg-purple-500/5 px-3 py-2">
                  <span className="text-xs text-muted-foreground">
                    Фильтр: <strong className="text-foreground">{filterColumn}</strong> = <span className="font-mono text-purple-300">{filterValue.slice(0, 12)}…</span>
                  </span>
                  <button onClick={clearFilter} className="ml-auto text-xs text-purple-400 hover:underline">
                    Сбросить
                  </button>
                </div>
              )}

              {/* Table */}
              <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5">
                        {activeTableConfig.columns.map((col) => (
                          <th
                            key={col.key}
                            className={`px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground ${col.width ?? ""}`}
                          >
                            <button
                              onClick={() => {
                                if (!col.render || col.key === "created_at" || col.key === "updated_at" || col.key === "best_date" || col.key === "sold_at" || col.key === "last_run_at" || ["price", "amount", "balance", "balance_after", "uses_count", "token_cost", "radius_km", "purchase_tokens", "buyer_bonus", "referrer_bonus", "total_purchased", "total_spent", "total_earned", "last_score"].includes(col.key)) {
                                  handleSort(col.key);
                                }
                              }}
                              className="flex items-center gap-1 hover:text-foreground transition-colors"
                            >
                              {col.label}
                              {sortBy === col.key ? (
                                sortDir === "asc" ? (
                                  <ArrowUp className="h-3 w-3" />
                                ) : (
                                  <ArrowDown className="h-3 w-3" />
                                )
                              ) : (
                                <ArrowUpDown className="h-2.5 w-2.5 opacity-30" />
                              )}
                            </button>
                          </th>
                        ))}
                        <th className="w-20 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Действия
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableLoading ? (
                        <tr>
                          <td
                            colSpan={activeTableConfig.columns.length + 1}
                            className="px-3 py-12 text-center"
                          >
                            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                          </td>
                        </tr>
                      ) : tableData.length === 0 ? (
                        <tr>
                          <td
                            colSpan={activeTableConfig.columns.length + 1}
                            className="px-3 py-12 text-center text-sm text-muted-foreground"
                          >
                            Нет данных
                          </td>
                        </tr>
                      ) : (
                        tableData.map((row, idx) => {
                          const rowId = (row.id || row.user_id) as string;
                          const isEditing = editingRow === rowId;
                          return (
                            <tr
                              key={rowId || idx}
                              className="border-b border-white/5 transition-colors hover:bg-white/[0.03]"
                            >
                              {activeTableConfig.columns.map((col) => {
                                const value = row[col.key];
                                const isEditableCol = isEditing && activeTableConfig.editable?.includes(col.key);

                                return (
                                  <td key={col.key} className="px-3 py-2">
                                    {isEditableCol ? (
                                      <EditableCell
                                        column={col}
                                        value={editValues[col.key]}
                                        onChange={(v) => setEditValues((prev) => ({ ...prev, [col.key]: v }))}
                                      />
                                    ) : col.render ? (
                                      col.render(value, row)
                                    ) : col.type === "date" ? (
                                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        {formatDate(value as string | null)}
                                      </span>
                                    ) : col.type === "badge" ? (
                                      <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${BADGE_COLORS[value as string] ?? "bg-gray-500/20 text-gray-300"}`}>
                                        {value as string}
                                      </span>
                                    ) : col.type === "number" ? (
                                      <span className="text-xs font-medium">{value as number}</span>
                                    ) : (
                                      <span className="text-xs">{(value as string) ?? "—"}</span>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-1">
                                  {isEditing ? (
                                    <>
                                      <button
                                        onClick={saveEdit}
                                        disabled={saving}
                                        className="flex h-7 w-7 items-center justify-center rounded-md text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50"
                                        title="Сохранить"
                                      >
                                        {saving ? (
                                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                          <Check className="h-3.5 w-3.5" />
                                        )}
                                      </button>
                                      <button
                                        onClick={cancelEdit}
                                        className="flex h-7 w-7 items-center justify-center rounded-md text-red-400 hover:bg-red-500/10"
                                        title="Отмена"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => setDetailRow(row)}
                                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-white/10 hover:text-foreground"
                                        title="Подробнее"
                                      >
                                        <Eye className="h-3.5 w-3.5" />
                                      </button>
                                      {activeTableConfig.editable && (
                                        <button
                                          onClick={() => startEdit(row)}
                                          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-white/10 hover:text-foreground"
                                          title="Редактировать"
                                        >
                                          <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                      {row.user_id && activeTab !== "profiles" && (
                                        <button
                                          onClick={() => filterByUser(row.user_id as string)}
                                          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-white/10 hover:text-foreground"
                                          title="Фильтр по юзеру"
                                        >
                                          <Users className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {tableTotalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-white/10 bg-white/[0.02] px-4 py-3">
                    <p className="text-xs text-muted-foreground">
                      Стр. {tablePage} из {tableTotalPages} ({tableTotal} записей)
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handlePageChange(1)}
                        disabled={tablePage <= 1}
                        className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-white/5 disabled:opacity-30"
                      >
                        Первая
                      </button>
                      <button
                        onClick={() => handlePageChange(tablePage - 1)}
                        disabled={tablePage <= 1}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-white/5 disabled:opacity-30"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      {Array.from({ length: Math.min(5, tableTotalPages) }, (_, i) => {
                        let page: number;
                        if (tableTotalPages <= 5) {
                          page = i + 1;
                        } else if (tablePage <= 3) {
                          page = i + 1;
                        } else if (tablePage >= tableTotalPages - 2) {
                          page = tableTotalPages - 4 + i;
                        } else {
                          page = tablePage - 2 + i;
                        }
                        return (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`flex h-7 w-7 items-center justify-center rounded-md text-xs ${
                              page === tablePage
                                ? "bg-purple-500/20 text-purple-300 font-bold"
                                : "text-muted-foreground hover:bg-white/5"
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => handlePageChange(tablePage + 1)}
                        disabled={tablePage >= tableTotalPages}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-white/5 disabled:opacity-30"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handlePageChange(tableTotalPages)}
                        disabled={tablePage >= tableTotalPages}
                        className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-white/5 disabled:opacity-30"
                      >
                        Последняя
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail modal */}
      {detailRow && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDetailRow(null)} />
          <div className="relative z-[10000] w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-[#1a2a1f]/95 border border-purple-500/20 shadow-2xl backdrop-blur-xl p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold">
              <Eye className="h-4 w-4 text-purple-400" />
              Подробности записи
            </h3>
            <div className="space-y-2">
              {Object.entries(detailRow).map(([key, value]) => {
                if (key === "weather_data" || key === "forest_info" || key === "grid_data" || key === "current_weather" || key === "weights" || key === "by_parameter" || key === "by_day" || key === "ref_pattern" || key === "matches" || key === "stats" || key === "last_result") {
                  return (
                    <div key={key} className="rounded-lg bg-white/5 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{key}</p>
                      <p className="text-xs text-muted-foreground italic">
                        {value ? `JSON (${JSON.stringify(value).length} символов)` : "null"}
                      </p>
                    </div>
                  );
                }
                const displayValue = typeof value === "object" && value !== null
                  ? JSON.stringify(value, null, 2)
                  : String(value ?? "null");

                return (
                  <div key={key} className="rounded-lg bg-white/5 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{key}</p>
                    {typeof value === "object" && value !== null ? (
                      <pre className="text-xs text-foreground/80 whitespace-pre-wrap break-all max-h-32 overflow-y-auto font-mono">
                        {displayValue}
                      </pre>
                    ) : (
                      <p className="text-xs text-foreground/80 break-all">{displayValue}</p>
                    )}
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => setDetailRow(null)}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────── Admin Chats View ───────────── */

interface ChatThread {
  listing_id: string;
  user_a: string;
  user_b: string;
  message_count: number;
  last_message: string;
  last_message_at: string;
  last_sender_id: string;
}

interface ChatMessage {
  id: string;
  listing_id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  created_at: string;
}

interface ChatProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  account_type: string;
}

interface ChatListing {
  id: string;
  seller_id: string;
  status: string;
  best_day: { name: string } | { name: string }[] | null;
}

function AdminChatsView() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ChatProfile>>({});
  const [listings, setListings] = useState<Record<string, ChatListing>>({});
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [activeThread, setActiveThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [msgProfiles, setMsgProfiles] = useState<Record<string, ChatProfile>>({});
  const [msgLoading, setMsgLoading] = useState(false);
  const [msgSearch, setMsgSearch] = useState("");

  const loadThreads = useCallback(async (search?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ mode: "threads" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/chats?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setThreads(data.threads ?? []);
      setProfiles(data.profiles ?? {});
      setListings(data.listings ?? {});
    } catch {
      toast.error("Ошибка загрузки чатов");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearchQuery(val);
      loadThreads(val);
    }, 400);
  };

  const openThread = async (thread: ChatThread) => {
    setActiveThread(thread);
    setMsgLoading(true);
    setMsgSearch("");
    try {
      const params = new URLSearchParams({
        mode: "conversation",
        listing_id: thread.listing_id,
        user_a: thread.user_a,
        user_b: thread.user_b,
      });
      const res = await fetch(`/api/admin/chats?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMessages(data.messages ?? []);
      setMsgProfiles(data.profiles ?? {});
    } catch {
      toast.error("Ошибка загрузки сообщений");
    } finally {
      setMsgLoading(false);
    }
  };

  const filteredMessages = msgSearch
    ? messages.filter((m) =>
        m.message.toLowerCase().includes(msgSearch.toLowerCase())
      )
    : messages;

  const getName = (id: string, pMap?: Record<string, ChatProfile>) => {
    const p = (pMap ?? profiles)[id];
    return p?.full_name || p?.email || id.slice(0, 8) + "…";
  };

  const getListingName = (id: string) => {
    const l = listings[id];
    if (!l) return id.slice(0, 8) + "…";
    const bd = l.best_day;
    const name = Array.isArray(bd) ? bd[0]?.name : bd?.name;
    return name || id.slice(0, 8) + "…";
  };

  if (activeThread) {
    const listing = listings[activeThread.listing_id];
    const sellerId = listing?.seller_id;
    return (
      <div>
        {/* Back + header */}
        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={() => setActiveThread(null)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-muted-foreground hover:bg-white/5"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold truncate">
                {getName(activeThread.user_a, msgProfiles)} ↔ {getName(activeThread.user_b, msgProfiles)}
              </h2>
              <p className="text-[11px] text-muted-foreground truncate">
                Листинг: {getListingName(activeThread.listing_id)}
                {listing && (
                  <span className={`ml-2 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${BADGE_COLORS[listing.status] ?? ""}`}>
                    {listing.status}
                  </span>
                )}
              </p>
            </div>
          </div>
          <span className="text-xs text-muted-foreground">{messages.length} сообщений</span>
        </div>

        {/* Message search */}
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={msgSearch}
            onChange={(e) => setMsgSearch(e.target.value)}
            placeholder="Поиск по сообщениям..."
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-xs outline-none placeholder:text-muted-foreground/50 focus:border-blue-500/30"
          />
        </div>

        {/* Messages */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
          {msgLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {msgSearch ? "Сообщения не найдены" : "Нет сообщений"}
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto px-4 py-4 space-y-3">
              {filteredMessages.map((msg) => {
                const isSeller = msg.sender_id === sellerId;
                const senderProfile = msgProfiles[msg.sender_id];
                return (
                  <div key={msg.id} className={`flex ${isSeller ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[70%] ${isSeller ? "order-1" : "order-1"}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-medium ${isSeller ? "text-pink-400" : "text-blue-400"}`}>
                          {senderProfile?.full_name || senderProfile?.email || msg.sender_id.slice(0, 8)}
                        </span>
                        <span className="text-[10px] text-muted-foreground/50">
                          {new Date(msg.created_at).toLocaleString("ru-RU", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div
                        className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                          isSeller
                            ? "bg-pink-600/20 text-foreground rounded-tl-md border border-pink-500/20"
                            : "bg-blue-600/20 text-foreground rounded-tr-md border border-blue-500/20"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Чаты</h1>
            <p className="text-xs text-muted-foreground">{threads.length} диалогов</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64 sm:flex-none">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Поиск по сообщениям..."
              className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-xs outline-none placeholder:text-muted-foreground/50 focus:border-blue-500/30"
            />
          </div>
          <button
            onClick={() => loadThreads(searchQuery)}
            disabled={loading}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-muted-foreground hover:bg-white/5 disabled:opacity-50"
            title="Обновить"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Thread list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : threads.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] py-12">
          <MessageSquare className="mb-3 h-12 w-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            {searchQuery ? "Чаты не найдены" : "Нет чатов"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {threads.map((thread) => {
            const listing = listings[thread.listing_id];
            return (
              <button
                key={`${thread.listing_id}:${thread.user_a}:${thread.user_b}`}
                onClick={() => openThread(thread)}
                className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition-colors hover:bg-white/[0.06]"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium truncate">
                      {getName(thread.user_a)} ↔ {getName(thread.user_b)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-1">
                    <span className="truncate max-w-[200px]">
                      Листинг: {getListingName(thread.listing_id)}
                    </span>
                    {listing && (
                      <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${BADGE_COLORS[listing.status] ?? ""}`}>
                        {listing.status}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground/70 truncate max-w-[300px]">
                    {getName(thread.last_sender_id)}: {thread.last_message}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[11px] font-medium text-blue-400">
                    {thread.message_count}
                  </span>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {formatDate(thread.last_message_at)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ───────────── Editable Cell Component ───────────── */

function EditableCell({
  column,
  value,
  onChange,
}: {
  column: ColumnDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (column.key === "account_type") {
    return (
      <select
        value={(value as string) || "user"}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-1 text-xs outline-none"
      >
        <option value="user">user</option>
        <option value="admin">admin</option>
      </select>
    );
  }

  if (column.key === "status") {
    return (
      <select
        value={(value as string) || "active"}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-1 text-xs outline-none"
      >
        <option value="active">active</option>
        <option value="sold">sold</option>
        <option value="cancelled">cancelled</option>
      </select>
    );
  }

  if (column.key === "enabled") {
    return (
      <select
        value={value ? "true" : "false"}
        onChange={(e) => onChange(e.target.value === "true")}
        className="rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-1 text-xs outline-none"
      >
        <option value="true">Да</option>
        <option value="false">Нет</option>
      </select>
    );
  }

  if (column.type === "number" || column.key === "price" || column.key === "balance" || column.key === "total_purchased" || column.key === "total_spent" || column.key === "total_earned") {
    return (
      <input
        type="number"
        value={value as number ?? 0}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className="w-20 rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-1 text-xs outline-none"
      />
    );
  }

  return (
    <input
      type="text"
      value={(value as string) ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-1 text-xs outline-none"
    />
  );
}
