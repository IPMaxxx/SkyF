"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { BRAND } from "@/lib/brand";
import { toast } from "sonner";
import { UserName } from "@/components/app/UserName";
import dynamic from "next/dynamic";
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
  Map,
  Trash2,
  Tag,
  CreditCard,
  UserSearch,
  AlertTriangle,
  FlaskConical,
  Play,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";

const AdminMapLazy = dynamic(
  () => import("@/components/app/AdminMap").then((m) => ({ default: m.AdminMap })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[600px] items-center justify-center rounded-xl bg-white/5">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  },
);

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
    editable: ["full_name", "phone", "_balance", "_bonus_balance"],
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
        label: "Реальн.",
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
        key: "_bonus_balance",
        label: "Бонус.",
        type: "number",
        render: (_v, row) => {
          const tb = row.token_balance as Record<string, number> | null;
          if (!tb) return <span className="text-muted-foreground">—</span>;
          return (
            <span className="flex items-center gap-1 text-emerald-400 font-semibold text-xs">
              {tb.bonus_balance ?? 0}
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
    key: "token_payments",
    label: "Оплаты",
    icon: CreditCard,
    columns: [
      {
        key: "profile",
        label: "Пользователь",
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
      {
        key: "amount",
        label: "Токены",
        type: "number",
        render: (_v, row) => (
          <span className="font-semibold text-xs text-emerald-400">+{row.amount as number}</span>
        ),
      },
      {
        key: "payment_amount_cents",
        label: "Сумма (банк)",
        render: (_v, row) => {
          const cents = row.payment_amount_cents as number | null | undefined;
          const cur = (row.payment_currency as string) || "BYN";
          if (cents == null || Number.isNaN(cents)) {
            return <span className="text-xs text-muted-foreground">—</span>;
          }
          const major = cents / 100;
          return (
            <span className="text-xs font-medium tabular-nums">
              {major.toFixed(2)} {cur}
            </span>
          );
        },
      },
      {
        key: "payment_id",
        label: `ID платежа (${BRAND.paymentProviderName})`,
        render: (_v, row) => {
          const id = row.payment_id as string | null;
          if (!id) return <span className="text-xs text-muted-foreground">—</span>;
          return (
            <span className="text-[10px] font-mono text-muted-foreground break-all max-w-[140px] block" title={id}>
              {id}
            </span>
          );
        },
      },
      {
        key: "payment_tracking_id",
        label: "Tracking",
        render: (_v, row) => {
          const tr = row.payment_tracking_id as string | null;
          if (!tr) return <span className="text-xs text-muted-foreground">—</span>;
          return (
            <span className="text-[10px] font-mono text-muted-foreground break-all max-w-[120px] block" title={tr}>
              {tr}
            </span>
          );
        },
      },
      {
        key: "description",
        label: "Описание",
        type: "text",
        render: (_v, row) => (
          <span className="text-xs truncate max-w-[140px] block text-muted-foreground">
            {(row.description as string) || "—"}
          </span>
        ),
      },
      { key: "balance_after", label: "Баланс после", type: "number" },
      { key: "created_at", label: "Дата", type: "date" },
    ],
  },
  {
    key: "token_balances",
    label: "Балансы",
    icon: Coins,
    pkColumn: "user_id",
    editable: ["balance", "bonus_balance", "total_purchased", "total_spent", "total_earned"],
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
      { key: "balance", label: "Реальн.", type: "number",
        render: (_v, row) => (
          <span className="font-semibold text-amber-400 text-xs">{row.balance as number}</span>
        ),
      },
      { key: "bonus_balance", label: "Бонус.", type: "number",
        render: (_v, row) => (
          <span className="font-semibold text-emerald-400 text-xs">{row.bonus_balance as number ?? 0}</span>
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
    key: "deleted_locations",
    label: "Удал. локации",
    icon: Trash2,
    columns: [
      { key: "name", label: "Название", type: "text" },
      {
        key: "coords",
        label: "Координаты",
        render: (_v: unknown, row: Record<string, unknown>) => {
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
        render: (_v: unknown, row: Record<string, unknown>) => {
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
      { key: "original_created_at", label: "Создана", type: "date" },
      { key: "deleted_at", label: "Удалена", type: "date" },
    ],
  },
  {
    key: "deleted_best_days",
    label: "Удал. гр. дни",
    icon: Trash2,
    columns: [
      { key: "name", label: "Название", type: "text" },
      { key: "best_date", label: "Дата", type: "date" },
      {
        key: "mushroom_info",
        label: "Гриб",
        render: (_v: unknown, row: Record<string, unknown>) => {
          const name = (row.mushroom_common_name as string) || (row.mushroom_latin_name as string);
          const img = row.mushroom_image_url as string | null;
          if (!name) return <span className="text-muted-foreground text-xs">—</span>;
          return (
            <div className="flex items-center gap-2">
              {img && (
                <img src={img} alt="" className="h-6 w-6 rounded object-cover flex-shrink-0" />
              )}
              <span className="text-xs truncate max-w-[120px]">{name}</span>
            </div>
          );
        },
      },
      { key: "location_name", label: "Локация", type: "text" },
      {
        key: "photos",
        label: "Фото",
        type: "photos",
        render: (_v: unknown, row: Record<string, unknown>) => {
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
        render: (_v: unknown, row: Record<string, unknown>) => {
          const p = row.profile as Record<string, string> | null;
          return <span className="text-xs">{p?.full_name || p?.email || "—"}</span>;
        },
      },
      { key: "original_created_at", label: "Создан", type: "date" },
      { key: "deleted_at", label: "Удалён", type: "date" },
    ],
  },
  {
    key: "admin_marks",
    label: "Метки админа",
    icon: Tag,
    columns: [
      {
        key: "status",
        label: "Статус",
        type: "badge",
        render: (_v: unknown, row: Record<string, unknown>) => {
          const s = row.status as string;
          const cfg: Record<string, { label: string; cls: string }> = {
            priority:    { label: "Приоритет",     cls: "bg-red-500/20 text-red-300 border-red-500/30" },
            interesting: { label: "Интересно",     cls: "bg-violet-500/20 text-violet-300 border-violet-500/30" },
            suspicious:  { label: "Подозрительно", cls: "bg-orange-500/20 text-orange-300 border-orange-500/30" },
            secondary:   { label: "Второстепенно", cls: "bg-gray-500/20 text-gray-300 border-gray-500/30" },
            reviewed:    { label: "Просмотрено",   cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
          };
          const c = cfg[s] ?? { label: s, cls: "bg-gray-500/20 text-gray-300" };
          return (
            <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${c.cls}`}>
              {c.label}
            </span>
          );
        },
      },
      {
        key: "target_type",
        label: "Тип",
        type: "badge",
        render: (_v: unknown, row: Record<string, unknown>) => {
          const t = row.target_type as string;
          const labels: Record<string, string> = {
            location: "Локация",
            best_day: "Гр. день",
            deleted_location: "Удал. локация",
            deleted_best_day: "Удал. гр. день",
          };
          return <span className="text-xs">{labels[t] || t}</span>;
        },
      },
      {
        key: "target_id",
        label: "ID объекта",
        type: "text",
        render: (_v: unknown, row: Record<string, unknown>) => (
          <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[80px] block">
            {(row.target_id as string)?.slice(0, 12)}…
          </span>
        ),
      },
      {
        key: "note",
        label: "Заметка",
        type: "text",
        render: (_v: unknown, row: Record<string, unknown>) => (
          <span className="text-xs truncate max-w-[150px] block text-muted-foreground">
            {(row.note as string) || "—"}
          </span>
        ),
      },
      { key: "updated_at", label: "Обновлено", type: "date" },
      { key: "created_at", label: "Создана", type: "date" },
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
        label: "Реальн.",
        type: "number",
        render: (_v: unknown, row: Record<string, unknown>) => (
          <span className="flex items-center gap-1 text-amber-400 font-semibold text-xs">
            <Coins className="h-3 w-3" />
            {row.balance as number}
          </span>
        ),
      },
      {
        key: "bonus_balance",
        label: "Бонус.",
        type: "number",
        render: (_v: unknown, row: Record<string, unknown>) => (
          <span className="text-emerald-400 font-semibold text-xs">
            {(row.bonus_balance as number) ?? 0}
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
    items: [
      { key: "overview", label: "Дашборд", icon: BarChart3 },
      { key: "admin_map", label: "Карта", icon: Map },
      { key: "user_lookup", label: "Поиск юзера", icon: UserSearch },
      { key: "reg_test", label: "Тест регистрации", icon: FlaskConical },
    ],
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
    label: "Удалённые / Метки",
    items: [
      TABLES.find((t) => t.key === "deleted_locations")!,
      TABLES.find((t) => t.key === "deleted_best_days")!,
      TABLES.find((t) => t.key === "admin_marks")!,
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
      TABLES.find((t) => t.key === "token_payments")!,
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
    } else if (
      activeTab === "admin_map" ||
      activeTab === "user_lookup" ||
      activeTab === "reg_test"
    ) {
      // these tabs handle their own data loading
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
      values._bonus_balance = tb?.bonus_balance ?? 0;
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
    let bonusBalanceUpdate: number | undefined;
    for (const col of tableConfig.editable) {
      if (editValues[col] !== undefined) {
        if (col === "_balance") {
          balanceUpdate = Number(editValues[col]);
        } else if (col === "_bonus_balance") {
          bonusBalanceUpdate = Number(editValues[col]);
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

      if (activeTab === "profiles" && (balanceUpdate !== undefined || bonusBalanceUpdate !== undefined)) {
        const balanceUpdates: Record<string, number> = {};
        if (balanceUpdate !== undefined) balanceUpdates.balance = balanceUpdate;
        if (bonusBalanceUpdate !== undefined) balanceUpdates.bonus_balance = bonusBalanceUpdate;
        const res = await fetch("/api/admin/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            table: "token_balances",
            id: editingRow,
            updates: balanceUpdates,
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
                    <StatCard label="Удал. локаций" value={stats.counts.deleted_locations ?? 0} icon={Trash2} color="bg-red-500/20 text-red-400" />
                    <StatCard label="Удал. гр. дней" value={stats.counts.deleted_best_days ?? 0} icon={Trash2} color="bg-red-500/20 text-red-400" />
                    <StatCard label="Меток админа" value={stats.counts.admin_marks ?? 0} icon={Tag} color="bg-violet-500/20 text-violet-400" />
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
                      <div className="mt-3 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => setActiveTab("token_transactions")}
                          className="text-xs text-amber-400 hover:underline"
                        >
                          Все транзакции →
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab("token_payments")}
                          className="text-xs text-emerald-400 hover:underline"
                        >
                          Оплаты (банк) →
                        </button>
                      </div>
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

          {/* Admin Map view */}
          {activeTab === "admin_map" && (
            <div>
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
                  <Map className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Карта локаций и грибных дней</h1>
                  <p className="text-xs text-muted-foreground">
                    Все текущие и удалённые объекты на карте
                  </p>
                </div>
              </div>
              <AdminMapLazy />
            </div>
          )}

          {/* Chat view for messages */}
          {activeTab === "marketplace_messages" && (
            <AdminChatsView />
          )}

          {/* User lookup tool */}
          {activeTab === "user_lookup" && <AdminUserLookup />}

          {/* Registration self-test */}
          {activeTab === "reg_test" && <AdminRegistrationTest />}

          {/* Table view */}
          {activeTab !== "overview" && activeTab !== "admin_map" && activeTab !== "marketplace_messages" && activeTab !== "user_lookup" && activeTab !== "reg_test" && activeTableConfig && (
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
                                if (!col.render || col.key === "created_at" || col.key === "updated_at" || col.key === "best_date" || col.key === "sold_at" || col.key === "last_run_at" || ["price", "amount", "balance", "bonus_balance", "balance_after", "uses_count", "token_cost", "radius_km", "purchase_tokens", "buyer_bonus", "referrer_bonus", "total_purchased", "total_spent", "total_earned", "last_score", "payment_amount_cents"].includes(col.key)) {
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

/* ───────────── Admin User Lookup ───────────── */

interface UserLookupResult {
  email: string;
  status:
    | "active"
    | "scheduled_deletion"
    | "auth_only"
    | "profile_only"
    | "in_archive"
    | "not_found";
  auth_user: {
    id: string;
    email: string | null;
    created_at: string;
    last_sign_in_at: string | null;
    email_confirmed_at: string | null;
    banned_until: string | null;
    raw_user_meta_data: Record<string, unknown> | null;
  } | null;
  profile: {
    id: string;
    email: string | null;
    full_name: string | null;
    phone: string | null;
    account_type: string | null;
    created_at: string | null;
    updated_at: string | null;
    deletion_scheduled_at: string | null;
    deletion_effective_at: string | null;
  } | null;
  token_balance: {
    balance: number;
    bonus_balance: number;
    total_purchased: number;
    total_spent: number;
    total_earned: number;
    updated_at: string | null;
  } | null;
  deleted_accounts: Array<{
    id: string;
    original_user_id: string;
    email: string;
    deleted_at: string;
  }>;
  counts: Record<string, number>;
  target_user_id: string | null;
}

interface PurgeStep {
  step: string;
  affected: number | null;
  error?: string;
}

const STATUS_META: Record<
  UserLookupResult["status"],
  { label: string; cls: string; description: string }
> = {
  active: {
    label: "Активный",
    cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    description: "Юзер существует и пользуется аккаунтом.",
  },
  scheduled_deletion: {
    label: "Запланировано удаление",
    cls: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    description:
      "Аккаунт в режиме soft-deletion. Будет удалён cron-ом по истечении cooldown.",
  },
  auth_only: {
    label: "Только в auth",
    cls: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    description:
      "Юзер есть в auth.users, но профиля нет. Битая регистрация — обычно достаточно вычистить.",
  },
  profile_only: {
    label: "Профиль без auth",
    cls: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    description:
      "Профиль остался без auth-записи. Можно подчистить — регистрация на этот email пройдёт.",
  },
  in_archive: {
    label: "В архиве удалённых",
    cls: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    description:
      "Юзер уже удалён, email сохранён в deleted_accounts (это блокирует welcome-бонус).",
  },
  not_found: {
    label: "Не найден",
    cls: "bg-gray-500/20 text-gray-300 border-gray-500/30",
    description:
      "По этому email ничего нет. Регистрация должна проходить без ошибки.",
  },
};

function AdminUserLookup() {
  const [emailInput, setEmailInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<UserLookupResult | null>(null);

  // Two-stage delete confirmation
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmStage, setConfirmStage] = useState<1 | 2>(1);
  const [confirmText, setConfirmText] = useState("");
  const [confirmAck, setConfirmAck] = useState(false);
  const [alsoClearArchive, setAlsoClearArchive] = useState(true);
  const [purging, setPurging] = useState(false);
  const [purgeReport, setPurgeReport] = useState<{
    auth_deleted: boolean;
    steps: PurgeStep[];
  } | null>(null);

  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const email = emailInput.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      toast.error("Введите корректный email");
      return;
    }
    setSearching(true);
    setResult(null);
    setPurgeReport(null);
    try {
      const res = await fetch(
        `/api/admin/users/lookup?email=${encodeURIComponent(email)}`,
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error || `HTTP ${res.status}`);
        return;
      }
      const data = (await res.json()) as UserLookupResult;
      setResult(data);
    } catch {
      toast.error("Сеть упала");
    } finally {
      setSearching(false);
    }
  }, [emailInput]);

  const closeConfirm = () => {
    if (purging) return;
    setConfirmOpen(false);
    setConfirmStage(1);
    setConfirmText("");
    setConfirmAck(false);
  };

  const openConfirm = () => {
    setConfirmStage(1);
    setConfirmText("");
    setConfirmAck(false);
    setConfirmOpen(true);
  };

  const handlePurge = async () => {
    if (!result) return;
    const expectedEmail = result.email.trim().toLowerCase();
    if (confirmText.trim().toLowerCase() !== expectedEmail) {
      toast.error("Email подтверждения не совпадает");
      return;
    }
    if (!confirmAck) {
      toast.error("Поставьте галочку подтверждения");
      return;
    }
    setPurging(true);
    try {
      const res = await fetch("/api/admin/users/purge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: result.target_user_id,
          email: result.email,
          confirm_email: result.email,
          also_clear_deleted_archive: alsoClearArchive,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || `HTTP ${res.status}`);
        return;
      }
      toast.success("Пользователь удалён");
      setPurgeReport({
        auth_deleted: !!data.auth_deleted,
        steps: (data.steps || []) as PurgeStep[],
      });
      setConfirmOpen(false);
      setConfirmStage(1);
      setConfirmText("");
      setConfirmAck(false);
      // Refresh lookup so admin sees new state
      void handleSearch();
    } catch {
      toast.error("Сеть упала");
    } finally {
      setPurging(false);
    }
  };

  const statusMeta = result ? STATUS_META[result.status] : null;
  const totalRelated = result
    ? Object.values(result.counts).reduce((sum, n) => sum + (n || 0), 0)
    : 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
          <UserSearch className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Поиск пользователя по email</h1>
          <p className="text-xs text-muted-foreground">
            Сводка по auth.users + profiles + архивам и безопасное полное удаление
          </p>
        </div>
      </div>

      {/* Search form */}
      <form
        onSubmit={handleSearch}
        className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="user@example.com"
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm outline-none placeholder:text-muted-foreground/50 focus:border-purple-500/30 focus:ring-1 focus:ring-purple-500/20"
            autoFocus
          />
        </div>
        <button
          type="submit"
          disabled={searching}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-purple-500/20 px-4 py-2.5 text-sm font-medium text-purple-300 hover:bg-purple-500/30 disabled:opacity-50"
        >
          {searching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          Найти
        </button>
      </form>

      {/* Result */}
      {result && statusMeta && (
        <div className="space-y-4">
          {/* Status card */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <span
                className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${statusMeta.cls}`}
              >
                {statusMeta.label}
              </span>
              <span className="text-sm text-muted-foreground">
                {result.email}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {statusMeta.description}
            </p>

            {/* auth.users block */}
            {result.auth_user && (
              <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.04] p-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  auth.users
                </p>
                <dl className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
                  <KV k="id" v={result.auth_user.id} mono />
                  <KV
                    k="created_at"
                    v={formatDate(result.auth_user.created_at)}
                  />
                  <KV
                    k="email_confirmed_at"
                    v={
                      result.auth_user.email_confirmed_at
                        ? formatDate(result.auth_user.email_confirmed_at)
                        : "—"
                    }
                  />
                  <KV
                    k="last_sign_in_at"
                    v={
                      result.auth_user.last_sign_in_at
                        ? formatDate(result.auth_user.last_sign_in_at)
                        : "никогда"
                    }
                  />
                  <KV
                    k="banned_until"
                    v={result.auth_user.banned_until || "—"}
                  />
                </dl>
              </div>
            )}

            {/* profile block */}
            {result.profile && (
              <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.04] p-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  profiles
                </p>
                <dl className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
                  <KV k="full_name" v={result.profile.full_name || "—"} />
                  <KV k="phone" v={result.profile.phone || "—"} />
                  <KV
                    k="account_type"
                    v={result.profile.account_type || "user"}
                  />
                  <KV
                    k="created_at"
                    v={formatDate(result.profile.created_at)}
                  />
                  <KV
                    k="deletion_scheduled_at"
                    v={
                      result.profile.deletion_scheduled_at
                        ? formatDate(result.profile.deletion_scheduled_at)
                        : "—"
                    }
                  />
                  <KV
                    k="deletion_effective_at"
                    v={
                      result.profile.deletion_effective_at
                        ? formatDate(result.profile.deletion_effective_at)
                        : "—"
                    }
                  />
                </dl>
              </div>
            )}

            {/* token balance */}
            {result.token_balance && (
              <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                  Баланс
                </p>
                <div className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
                  <KV
                    k="balance"
                    v={String(result.token_balance.balance ?? 0)}
                  />
                  <KV
                    k="bonus_balance"
                    v={String(result.token_balance.bonus_balance ?? 0)}
                  />
                  <KV
                    k="total_purchased"
                    v={String(result.token_balance.total_purchased ?? 0)}
                  />
                  <KV
                    k="total_spent"
                    v={String(result.token_balance.total_spent ?? 0)}
                  />
                  <KV
                    k="total_earned"
                    v={String(result.token_balance.total_earned ?? 0)}
                  />
                </div>
              </div>
            )}

            {/* deleted_accounts */}
            {result.deleted_accounts.length > 0 && (
              <div className="mt-3 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-blue-300">
                  deleted_accounts ({result.deleted_accounts.length})
                </p>
                <div className="space-y-1 text-xs">
                  {result.deleted_accounts.map((d) => (
                    <div key={d.id} className="flex flex-wrap gap-2">
                      <span className="font-mono text-muted-foreground">
                        {d.original_user_id}
                      </span>
                      <span className="text-muted-foreground">
                        удалён {formatDate(d.deleted_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Related counts */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <p className="mb-3 text-sm font-semibold">
              Связанные записи{" "}
              <span className="text-xs text-muted-foreground">
                (всего {totalRelated})
              </span>
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {Object.entries(result.counts).map(([k, v]) => (
                <div
                  key={k}
                  className={`rounded-lg border px-3 py-2 ${
                    v > 0
                      ? "border-purple-500/20 bg-purple-500/5"
                      : "border-white/5 bg-white/[0.02]"
                  }`}
                >
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {k}
                  </p>
                  <p
                    className={`text-lg font-bold ${
                      v > 0 ? "text-purple-300" : "text-muted-foreground"
                    }`}
                  >
                    {v}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Danger zone */}
          {(result.target_user_id ||
            result.deleted_accounts.length > 0) && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-red-300">
                <AlertTriangle className="h-4 w-4" />
                Опасная зона
              </div>
              <p className="mb-4 text-xs text-muted-foreground">
                Полное удаление: чистит все связанные записи (локации, грибные
                дни, листинги, транзакции, балансы, чаты, реф. коды,
                автомониторинг, поиски леса, архивы), затем удаляет auth-юзера
                (профиль уйдёт каскадно). Действие необратимо.
              </p>
              <button
                onClick={openConfirm}
                className="flex items-center gap-2 rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/30"
              >
                <Trash2 className="h-4 w-4" />
                Удалить пользователя и все его данные
              </button>
            </div>
          )}

          {/* Purge report */}
          {purgeReport && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <p className="mb-3 text-sm font-bold text-emerald-300">
                Отчёт об удалении{" "}
                {purgeReport.auth_deleted
                  ? "(auth.users тоже удалён)"
                  : "(auth.users НЕ удалён — см. ошибки)"}
              </p>
              <div className="space-y-1 text-xs">
                {purgeReport.steps.map((s, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded bg-white/5 px-2 py-1"
                  >
                    <span className="font-mono text-muted-foreground">
                      {s.step}
                    </span>
                    <span
                      className={
                        s.error
                          ? "text-red-400"
                          : s.affected
                            ? "text-emerald-400"
                            : "text-muted-foreground"
                      }
                    >
                      {s.error
                        ? `error: ${s.error}`
                        : s.affected !== null
                          ? `affected: ${s.affected}`
                          : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation modal */}
      {confirmOpen && result && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeConfirm}
          />
          <div className="relative z-[10000] w-full max-w-md overflow-hidden rounded-2xl border border-red-500/30 bg-[#1a0e0e]/95 shadow-2xl backdrop-blur-xl">
            <div className="border-b border-red-500/20 bg-red-500/10 p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-red-200">
                <AlertTriangle className="h-4 w-4" />
                Подтверждение удаления — шаг {confirmStage} из 2
              </div>
            </div>

            <div className="p-5">
              {confirmStage === 1 ? (
                <>
                  <p className="mb-3 text-sm text-foreground">
                    Будет удалён пользователь{" "}
                    <strong className="text-red-300">{result.email}</strong>
                    {result.target_user_id && (
                      <>
                        {" "}
                        (id{" "}
                        <span className="font-mono text-xs text-muted-foreground">
                          {result.target_user_id}
                        </span>
                        )
                      </>
                    )}
                    .
                  </p>
                  <p className="mb-4 text-xs text-muted-foreground">
                    Будут стёрты {totalRelated} связанных записей (см. сводку
                    выше). Это <strong>необратимо</strong>.
                  </p>

                  <label className="mb-4 flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 p-3 text-xs">
                    <input
                      type="checkbox"
                      checked={alsoClearArchive}
                      onChange={(e) => setAlsoClearArchive(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>
                      <strong>Очистить запись из deleted_accounts</strong>{" "}
                      <span className="text-muted-foreground">
                        — иначе при повторной регистрации этого email не
                        начислится welcome-бонус.
                      </span>
                    </span>
                  </label>

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={closeConfirm}
                      className="rounded-lg border border-white/10 px-4 py-2 text-sm text-muted-foreground hover:bg-white/5"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={() => setConfirmStage(2)}
                      className="rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/30"
                    >
                      Понимаю, продолжить
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="mb-2 text-sm text-foreground">
                    Введите email{" "}
                    <strong className="text-red-300">{result.email}</strong> для
                    подтверждения:
                  </p>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={result.email}
                    className="mb-3 w-full rounded-lg border border-red-500/30 bg-white/5 px-3 py-2 text-sm font-mono outline-none focus:border-red-500/50"
                    autoFocus
                  />
                  <label className="mb-4 flex items-start gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={confirmAck}
                      onChange={(e) => setConfirmAck(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>
                      Я понимаю, что все данные пользователя будут удалены без
                      возможности восстановления.
                    </span>
                  </label>

                  <div className="flex justify-between gap-2">
                    <button
                      onClick={() => setConfirmStage(1)}
                      disabled={purging}
                      className="rounded-lg border border-white/10 px-4 py-2 text-sm text-muted-foreground hover:bg-white/5 disabled:opacity-50"
                    >
                      Назад
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={closeConfirm}
                        disabled={purging}
                        className="rounded-lg border border-white/10 px-4 py-2 text-sm text-muted-foreground hover:bg-white/5 disabled:opacity-50"
                      >
                        Отмена
                      </button>
                      <button
                        onClick={handlePurge}
                        disabled={
                          purging ||
                          confirmText.trim().toLowerCase() !==
                            result.email.trim().toLowerCase() ||
                          !confirmAck
                        }
                        className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {purging ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        Удалить навсегда
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KV({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {k}
      </span>
      <span className={mono ? "font-mono text-[11px] break-all" : ""}>{v}</span>
    </div>
  );
}

/* ───────────── Registration self-test ───────────── */

interface RegTestStep {
  step: string;
  status: "ok" | "fail" | "warn" | "skip";
  duration_ms: number;
  detail?: string;
  data?: Record<string, unknown> | null;
}

interface RegTestReport {
  ok: boolean;
  email: string;
  user_id: string | null;
  total_duration_ms: number;
  steps: RegTestStep[];
  cleanup_done: boolean;
}

const STEP_LABELS: Record<string, string> = {
  precheck_auth_users_unique: "Email свободен в auth.users",
  precheck_deleted_archive: "Email не в архиве deleted_accounts",
  auth_admin_create_user: "Создание пользователя в auth.users",
  trigger_profile_created: "Триггер handle_new_user → public.profiles",
  trigger_token_balance_created:
    "Триггер handle_new_profile_tokens → token_balances",
  welcome_bonus_transaction_logged:
    "Запись welcome-бонуса в token_transactions",
  real_signup_smtp_check:
    "Реальный signUp через anon-ключ (проверка SMTP / отправки письма)",
  cleanup_delete_user: "Очистка: удаление тестового пользователя",
};

interface StepHint {
  meaning: string;
  fix: string;
  tellUser: string;
}

const STEP_HINTS: Record<string, StepHint> = {
  precheck_auth_users_unique: {
    meaning:
      "Тестовый email уже занят в auth.users — это значит, что прошлый прогон теста не удалился, либо реальный юзер успел зарегистрироваться на этот адрес.",
    fix: "Откройте «Поиск юзера», вбейте этот email и удалите аккаунт через «Опасную зону». Затем перегенерите email кнопкой ↻ и запустите тест ещё раз.",
    tellUser:
      "К жалобе пользователя отношения не имеет — это проблема самого теста, не отвечайте ему ничего.",
  },
  precheck_deleted_archive: {
    meaning:
      "Email находится в архиве deleted_accounts (антифрод v23). Если пользователь жалуется именно на этот email — повторная регистрация пройдёт, но welcome-бонус 20 токенов начислен НЕ будет.",
    fix: "Если это реальный пользователь — через «Поиск юзера» найдите его email и при удалении (либо вручную) очистите запись из deleted_accounts.",
    tellUser:
      "«Вы уже регистрировались с этим email ранее. Можете зарегистрироваться повторно, но приветственные бонусные токены не начислятся — напишите нам, если нужно их вернуть.»",
  },
  auth_admin_create_user: {
    meaning:
      "Сам Supabase Auth не дал создать пользователя. Возможные причины: невалидный SUPABASE_SERVICE_ROLE_KEY, отвалился Supabase, включён captcha/anti-abuse, превышены лимиты проекта, email домен в blocklist.",
    fix: "Смотрите detail шага — там точное сообщение от Supabase. Проверьте, что в .env свежие ключи; зайдите в Supabase Dashboard → Auth → Logs и посмотрите ошибки за последние 5 минут; проверьте лимиты проекта (Settings → Billing).",
    tellUser:
      "«Сейчас проблема на стороне сервиса авторизации, мы её чиним. Попробуйте через 10–15 минут, если не получится — напишите нам ещё раз.»",
  },
  trigger_profile_created: {
    meaning:
      "Это самая частая причина жалоб. auth-юзер создаётся, но триггер handle_new_user не вставляет строку в public.profiles. Симптом для пользователя: он подтверждает email, входит в приложение, и его сразу выкидывает / не пускает в дашборд / показывает «профиль не найден».",
    fix: "Откройте Supabase SQL Editor и выполните: SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created'; — триггер должен существовать. Если нет — повторно прогоните schema.sql. Если есть — выполните CREATE OR REPLACE FUNCTION public.handle_new_user() из schema.sql и проверьте, что нет ошибок (например, NOT NULL поле в profiles, которое триггер не заполняет).",
    tellUser:
      "«Спасибо, что сообщили — у нас сбой при создании профилей. Уже чиним, через 1–2 часа вернёмся с ответом и восстановим вашу регистрацию вручную. Какой email вы использовали?» (после фикса — через «Поиск юзера» создайте профиль вручную или попросите перерегистрироваться).",
  },
  trigger_token_balance_created: {
    meaning:
      "Профиль создаётся, но триггер handle_new_profile_tokens не создаёт строку в token_balances. Симптом: пользователь регистрируется и входит, но баланс пустой, welcome-бонус не начислен, оплата сервисов не работает.",
    fix: "В SQL Editor: SELECT * FROM pg_trigger WHERE tgname = 'on_profile_created_tokens'; и проверьте функцию handle_new_profile_tokens (см. patch-v23-antifraud.sql). Если статус WARN с неожиданными значениями (balance/bonus_balance) — кто-то изменил функцию, проверьте git log на supabase/.",
    tellUser:
      "«Профиль создан, но приветственные токены не начислились из-за технического сбоя. Уже чиним, в течение часа начислим вручную — напишите ваш email.»",
  },
  welcome_bonus_transaction_logged: {
    meaning:
      "Баланс создался, но запись о бонусной транзакции не появилась в token_transactions. Это косметическая проблема — пользователь видит токены, но в истории операций их «появление» не отражено.",
    fix: "Проверьте, что внутри handle_new_profile_tokens есть INSERT INTO token_transactions (см. patch-v23-antifraud.sql, строки 32–33). Не критично для регистрации.",
    tellUser:
      "Пользователю сообщать ничего не надо — он этого не заметит. Поправьте функцию при следующем деплое.",
  },
  real_signup_smtp_check: {
    meaning:
      'Самый частый сценарий жалобы «не могу зарегистрироваться» с ошибкой "Error sending confirmation email". Регистрация в БД проходит, но Supabase не может отправить письмо подтверждения. Причины: (1) превышен лимит встроенного SMTP Supabase — 3 письма/час на Free tier, (2) Custom SMTP настроен с битыми credentials, (3) провайдер заблокировал отправку.',
    fix: "Откройте Supabase Dashboard → Project → Authentication → Emails → SMTP Settings. Если SMTP не подключён — подключите Custom SMTP. Самые простые варианты: Resend (3000 писем/мес бесплатно, 5 минут на настройку), Brevo (300/день), либо ваш Gmail (host: smtp.gmail.com, port: 465, App Password — тот же, что в .env как SMTP_PASS). После подключения — снова прогоните этот тест с галкой «Проверить SMTP».",
    tellUser:
      "«Сейчас сбой при отправке писем подтверждения. Уже чиним. Попробуйте ещё раз через 1–2 часа, либо напишите нам ваш email — мы подтвердим аккаунт вручную.»",
  },
  cleanup_delete_user: {
    meaning:
      "Тестовый пользователь создался, но не удалился автоматически. Все остальные шаги могли пройти успешно — на сам процесс регистрации это не влияет.",
    fix: "Откройте «Поиск юзера», вбейте email из этого отчёта и удалите вручную через «Опасную зону». Это нужно, чтобы повторный прогон теста с тем же email не упал на precheck.",
    tellUser: "К жалобе пользователя отношения не имеет.",
  },
};

const STATUS_STYLES: Record<
  RegTestStep["status"],
  { cls: string; icon: typeof CheckCircle2; label: string }
> = {
  ok: {
    cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    icon: CheckCircle2,
    label: "OK",
  },
  fail: {
    cls: "border-red-500/30 bg-red-500/10 text-red-300",
    icon: XCircle,
    label: "FAIL",
  },
  warn: {
    cls: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    icon: AlertCircle,
    label: "WARN",
  },
  skip: {
    cls: "border-white/10 bg-white/5 text-muted-foreground",
    icon: AlertCircle,
    label: "SKIP",
  },
};

function defaultTestEmail(): string {
  const ts = Date.now().toString(36);
  return `regtest+${ts}@skyforest.test`;
}

function AdminRegistrationTest() {
  const [emailInput, setEmailInput] = useState(defaultTestEmail());
  const [fullName, setFullName] = useState("Reg Test");
  const [testSmtp, setTestSmtp] = useState(false);
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<RegTestReport | null>(null);

  const runTest = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      const email = emailInput.trim().toLowerCase();
      if (!email || !email.includes("@")) {
        toast.error("Введите корректный email");
        return;
      }
      if (testSmtp && /@skyforest\.test$/.test(email)) {
        toast.error(
          "Для проверки SMTP нужен реальный email-домен (Supabase отклонит .test)",
        );
        return;
      }
      setRunning(true);
      setReport(null);
      try {
        const res = await fetch("/api/admin/registration-test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            full_name: fullName,
            test_smtp: testSmtp,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || `HTTP ${res.status}`);
          return;
        }
        const r = data as RegTestReport;
        setReport(r);
        if (r.ok) {
          toast.success("Регистрация работает корректно");
        } else {
          const failed = r.steps.find((s) => s.status === "fail");
          toast.error(
            failed
              ? `Сломан шаг: ${STEP_LABELS[failed.step] ?? failed.step}`
              : "Тест завершился с ошибкой",
          );
        }
      } catch {
        toast.error("Сеть упала");
      } finally {
        setRunning(false);
      }
    },
    [emailInput, fullName, testSmtp],
  );

  const regenerateEmail = () => {
    setEmailInput(defaultTestEmail());
    setReport(null);
  };

  const stepsCount = report?.steps.length ?? 0;
  const failCount =
    report?.steps.filter((s) => s.status === "fail").length ?? 0;
  const warnCount =
    report?.steps.filter((s) => s.status === "warn").length ?? 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
          <FlaskConical className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Тест регистрации</h1>
          <p className="text-xs text-muted-foreground">
            Прогон полного серверного флоу: создаём auth-юзера, ждём триггеры
            (profiles, token_balances, welcome-бонус), затем чистим за собой.
          </p>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={runTest}
        className="mb-6 rounded-xl border border-white/10 bg-white/[0.03] p-5"
      >
        <div className="grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Email для теста
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="regtest+xxx@skyforest.test"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-mono outline-none placeholder:text-muted-foreground/50 focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/20"
              />
              <button
                type="button"
                onClick={regenerateEmail}
                title="Сгенерировать новый email"
                className="rounded-lg border border-white/10 px-3 py-2 text-xs text-muted-foreground hover:bg-white/5"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              full_name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/20"
            />
          </div>
          <button
            type="submit"
            disabled={running}
            className="flex h-[42px] items-center justify-center gap-1.5 rounded-lg bg-emerald-500/20 px-5 text-sm font-medium text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50"
          >
            {running ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Запустить тест
          </button>
        </div>

        <label className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs">
          <input
            type="checkbox"
            checked={testSmtp}
            onChange={(e) => setTestSmtp(e.target.checked)}
            className="mt-0.5"
          />
          <span className="text-amber-200/90">
            <strong>Проверить SMTP (отправку письма подтверждения)</strong> —
            дополнительно сделает реальный <span className="font-mono">signUp</span>{" "}
            через anon-ключ на адрес{" "}
            <span className="font-mono">
              {emailInput.replace(/@/, "+smtp@") || "...+smtp@..."}
            </span>
            . Supabase реально попытается послать письмо. Включайте, если жалуются
            на ошибку <span className="font-mono">«Error sending confirmation email»</span>.
            Для теста нужен <strong>реальный email-домен</strong> (gmail.com,
            ваш домен и т.п.) — Supabase отклоняет .test/.example.
          </span>
        </label>

        <div className="mt-3 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-blue-200/90">
          <strong>Что проверяет базово:</strong> создание auth-пользователя через
          service-role, срабатывание триггеров{" "}
          <span className="font-mono">handle_new_user</span> и{" "}
          <span className="font-mono">handle_new_profile_tokens</span>, запись
          welcome-бонуса. Письмо{" "}
          <strong>{testSmtp ? "БУДЕТ отправлено" : "не отправляется"}</strong>{" "}
          {testSmtp ? "(жжёт квоту SMTP, 3 письма/час на Free tier)" : "(email_confirm=true)"}.
          После прогона аккаунт(ы) удаляются автоматически.
        </div>
      </form>

      {/* Summary + steps */}
      {report && (
        <div className="space-y-4">
          {/* Summary */}
          <div
            className={`rounded-xl border p-5 ${
              report.ok
                ? "border-emerald-500/30 bg-emerald-500/5"
                : "border-red-500/30 bg-red-500/5"
            }`}
          >
            <div className="mb-2 flex flex-wrap items-center gap-3">
              {report.ok ? (
                <span className="flex items-center gap-2 text-sm font-bold text-emerald-300">
                  <CheckCircle2 className="h-5 w-5" />
                  Регистрация работает
                </span>
              ) : (
                <span className="flex items-center gap-2 text-sm font-bold text-red-300">
                  <XCircle className="h-5 w-5" />
                  Регистрация сломана
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {stepsCount} шагов · {report.total_duration_ms} ms ·{" "}
                {failCount > 0 && (
                  <span className="text-red-300">{failCount} fail </span>
                )}
                {warnCount > 0 && (
                  <span className="text-amber-300">{warnCount} warn </span>
                )}
                {report.cleanup_done ? (
                  <span className="text-emerald-300">cleanup OK</span>
                ) : (
                  <span className="text-red-300">cleanup НЕ выполнен</span>
                )}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              email: <span className="font-mono">{report.email}</span>
              {report.user_id && (
                <>
                  {" "}
                  · user_id:{" "}
                  <span className="font-mono">{report.user_id}</span>
                </>
              )}
            </p>
            {!report.cleanup_done && report.user_id && (
              <p className="mt-2 text-xs text-amber-300">
                ⚠️ Тестовый пользователь не удалился автоматически. Удалите
                вручную через «Поиск юзера» по email{" "}
                <span className="font-mono">{report.email}</span>.
              </p>
            )}
          </div>

          {/* Steps */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <p className="mb-3 text-sm font-semibold">Шаги</p>
            <div className="space-y-2">
              {report.steps.map((s, idx) => {
                const meta = STATUS_STYLES[s.status];
                const Icon = meta.icon;
                const label = STEP_LABELS[s.step] ?? s.step;
                const hint = STEP_HINTS[s.step];
                const showHint =
                  hint && (s.status === "fail" || s.status === "warn");
                return (
                  <div
                    key={idx}
                    className={`rounded-lg border px-3 py-2 ${meta.cls}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-2">
                        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{label}</p>
                          <p className="font-mono text-[10px] opacity-70">
                            {s.step}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 text-[11px]">
                        <span className="font-mono opacity-70">
                          {s.duration_ms} ms
                        </span>
                        <span className="rounded bg-black/30 px-1.5 py-0.5 font-bold tracking-wider">
                          {meta.label}
                        </span>
                      </div>
                    </div>
                    {s.detail && (
                      <p className="mt-1.5 ml-6 text-xs leading-relaxed opacity-90">
                        {s.detail}
                      </p>
                    )}
                    {showHint && (
                      <div className="mt-2 ml-6 space-y-1.5 rounded-md bg-black/30 p-2.5 text-[11px] leading-relaxed">
                        <p>
                          <span className="font-bold opacity-90">
                            Что это значит:
                          </span>{" "}
                          <span className="opacity-80">{hint.meaning}</span>
                        </p>
                        <p>
                          <span className="font-bold opacity-90">
                            Что делать:
                          </span>{" "}
                          <span className="opacity-80">{hint.fix}</span>
                        </p>
                        <p>
                          <span className="font-bold opacity-90">
                            Что сказать пользователю:
                          </span>{" "}
                          <span className="opacity-80 italic">
                            {hint.tellUser}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Reference: full hints for all steps, always available */}
      <details className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs">
        <summary className="cursor-pointer select-none text-sm font-semibold text-foreground">
          📖 Справочник: что значит каждая ошибка и что отвечать пользователю
        </summary>
        <div className="mt-4 space-y-3">
          {Object.entries(STEP_HINTS).map(([key, hint]) => (
            <div
              key={key}
              className="rounded-lg border border-white/5 bg-white/[0.02] p-3"
            >
              <p className="mb-2 text-sm font-semibold text-foreground">
                {STEP_LABELS[key] ?? key}
              </p>
              <p className="mb-1.5 text-[11px] leading-relaxed text-muted-foreground">
                <span className="font-bold text-foreground/80">
                  Что это значит:
                </span>{" "}
                {hint.meaning}
              </p>
              <p className="mb-1.5 text-[11px] leading-relaxed text-muted-foreground">
                <span className="font-bold text-foreground/80">
                  Что делать:
                </span>{" "}
                {hint.fix}
              </p>
              <p className="text-[11px] italic leading-relaxed text-blue-200/80">
                <span className="font-bold not-italic text-foreground/80">
                  Что сказать пользователю:
                </span>{" "}
                {hint.tellUser}
              </p>
            </div>
          ))}
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
            <p className="mb-1 text-sm font-semibold text-emerald-300">
              Если все шаги зелёные, а юзер всё равно не может зарегистрироваться
            </p>
            <p className="mb-1.5 text-[11px] leading-relaxed text-muted-foreground">
              Сервер регистрации работает — проблема на стороне пользователя
              (его email, браузер, captcha, локальная сеть, ввод пароля).
              Сначала вбейте его email в «Поиск юзера»: возможно, он уже
              зарегистрирован (пусть восстанавливает пароль) или находится в
              архиве deleted_accounts.
            </p>
            <p className="text-[11px] italic leading-relaxed text-blue-200/80">
              <span className="font-bold not-italic text-foreground/80">
                Что сказать:
              </span>{" "}
              «Проверили — система работает. Подскажите: какой именно email вы
              вводите, какую ошибку показывает экран (скриншот?), пробовали ли
              другой браузер или режим инкогнито? Если email уже использовался
              ранее — попробуйте «Забыли пароль».»
            </p>
          </div>
        </div>
      </details>
    </div>
  );
}
