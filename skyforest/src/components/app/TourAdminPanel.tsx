"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { BRAND } from "@/lib/brand";
import type { MushroomTour, TourStatus } from "@/lib/supabase/types";
import { formatMoney } from "@/lib/tourFormat";
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  Loader2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  QrCode,
} from "lucide-react";
import { TourShareBox } from "@/components/app/TourShareBox";
import { MushroomSearch } from "@/components/app/MushroomSearch";

const LocationPicker = dynamic(
  () => import("@/components/app/LocationPicker").then((m) => m.LocationPicker),
  { ssr: false }
);

interface ParticipantRow {
  participant_no: number;
  user_id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  contact_link: string | null;
  best_amount: number;
  bids_count: number;
  tokens_spent: number;
  rank: number | null;
  status: string;
  bids: { amount: number; created_at: string }[];
}

type FormState = {
  id?: string;
  title: string;
  description: string;
  mushroom_species: string;
  mushroom_image_url: string | null;
  mushroom_inaturalist_id: number | null;
  departure_lat: number | null;
  departure_lng: number | null;
  departure_desc: string;
  tour_date: string;
  departure_time: string;
  spots: number;
  start_price: number;
  bid_step: number;
  currency: string;
  auction_start_at: string;
  auction_end_at: string;
  anti_snipe_seconds: number;
  confirm_window_hours: number;
  status: TourStatus;
};

const emptyForm = (): FormState => ({
  title: "",
  description: "",
  mushroom_species: "",
  mushroom_image_url: null,
  mushroom_inaturalist_id: null,
  departure_lat: null,
  departure_lng: null,
  departure_desc: "",
  tour_date: "",
  departure_time: "",
  spots: 8,
  start_price: 0,
  bid_step: 1,
  currency: BRAND.currency,
  auction_start_at: "",
  auction_end_at: "",
  anti_snipe_seconds: 60,
  confirm_window_hours: 24,
  status: "draft",
});

// ISO <-> datetime-local helpers (local time)
function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function localInputToIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function TourAdminPanel({ onChange }: { onChange: () => void }) {
  const t = useTranslations("mushroomTours");
  const [open, setOpen] = useState(false);
  const [tours, setTours] = useState<MushroomTour[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [participantsFor, setParticipantsFor] = useState<string | null>(null);
  const [shareFor, setShareFor] = useState<string | null>(null);

  const loadTours = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/tours");
      const data = await res.json();
      if (res.ok) setTours(data.tours ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) loadTours();
  }, [open, loadTours]);

  const startCreate = () => setForm(emptyForm());
  const startEdit = (tour: MushroomTour) =>
    setForm({
      id: tour.id,
      title: tour.title ?? "",
      description: tour.description ?? "",
      mushroom_species: tour.mushroom_species ?? "",
      mushroom_image_url: tour.mushroom_image_url,
      mushroom_inaturalist_id: tour.mushroom_inaturalist_id,
      departure_lat: tour.departure_lat,
      departure_lng: tour.departure_lng,
      departure_desc: tour.departure_desc ?? "",
      tour_date: tour.tour_date ?? "",
      departure_time: tour.departure_time ? tour.departure_time.slice(0, 5) : "",
      spots: tour.spots,
      start_price: tour.start_price,
      bid_step: tour.bid_step,
      currency: tour.currency,
      auction_start_at: isoToLocalInput(tour.auction_start_at),
      auction_end_at: isoToLocalInput(tour.auction_end_at),
      anti_snipe_seconds: tour.anti_snipe_seconds,
      confirm_window_hours: tour.confirm_window_hours,
      status: tour.status,
    });

  const save = async () => {
    if (!form) return;
    if (!form.title.trim()) {
      toast.error(t("admin.fTitle"));
      return;
    }
    const startIso = localInputToIso(form.auction_start_at);
    const endIso = localInputToIso(form.auction_end_at);
    if (!startIso || !endIso) {
      toast.error(t("admin.fAuctionStart"));
      return;
    }

    setSaving(true);
    const payload = {
      ...form,
      auction_start_at: startIso,
      auction_end_at: endIso,
      tour_date: form.tour_date || null,
      departure_time: form.departure_time || null,
    };
    try {
      const res = await fetch("/api/admin/tours", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || t("admin.saveError"));
        return;
      }
      toast.success(form.id ? t("admin.updated") : t("admin.created"));
      const wasCreate = !form.id;
      const savedId = data.tour?.id as string | undefined;
      setForm(null);
      await loadTours();
      if (wasCreate && savedId) setShareFor(savedId);
      onChange();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm(t("admin.deleteConfirm"))) return;
    const res = await fetch(`/api/admin/tours?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success(t("admin.deleted"));
      await loadTours();
      onChange();
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || t("admin.saveError"));
    }
  };

  return (
    <div className="mb-6 rounded-2xl border border-purple-500/30 bg-purple-500/5 p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="flex items-center gap-2 font-semibold text-purple-300">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          {t("admin.panel")}
        </span>
        <span className="text-xs text-muted-foreground">admin</span>
      </button>

      {open && (
        <div className="mt-4 space-y-3">
          {!form && (
            <button
              type="button"
              onClick={startCreate}
              className="flex items-center gap-2 rounded-xl bg-purple-500/20 px-4 py-2 text-sm font-medium text-purple-200 transition-colors hover:bg-purple-500/30"
            >
              <Plus className="h-4 w-4" />
              {t("admin.newTour")}
            </button>
          )}

          {form && (
            <TourForm
              form={form}
              setForm={setForm}
              onSave={save}
              onCancel={() => setForm(null)}
              saving={saving}
              t={t}
            />
          )}

          {loading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> {t("loading")}
            </div>
          ) : (
            <div className="space-y-2">
              {tours.map((tour) => (
                <div key={tour.id} className="rounded-xl border border-border bg-card/40 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{tour.title}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="uppercase">{tour.status}</span>
                        {" · "}
                        {new Date(tour.auction_start_at).toLocaleString()} →{" "}
                        {new Date(tour.auction_end_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <IconBtn onClick={() => startEdit(tour)} title={t("admin.editTour")}>
                        <Pencil className="h-4 w-4" />
                      </IconBtn>
                      <IconBtn
                        onClick={() => setShareFor(shareFor === tour.id ? null : tour.id)}
                        title={t("admin.share")}
                      >
                        <QrCode className="h-4 w-4" />
                      </IconBtn>
                      <IconBtn
                        onClick={() =>
                          setParticipantsFor(participantsFor === tour.id ? null : tour.id)
                        }
                        title={t("admin.participants")}
                      >
                        <Users className="h-4 w-4" />
                      </IconBtn>
                      <IconBtn onClick={() => remove(tour.id)} title={t("admin.delete")} danger>
                        <Trash2 className="h-4 w-4" />
                      </IconBtn>
                    </div>
                  </div>
                  {shareFor === tour.id && <TourShareBox tourId={tour.id} />}
                  {participantsFor === tour.id && (
                    <ParticipantsTable tourId={tour.id} currency={tour.currency} t={t} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
        danger
          ? "text-red-400 hover:bg-red-500/10"
          : "text-muted-foreground hover:bg-white/10 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-lg border border-border bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary";

function TourForm({
  form,
  setForm,
  onSave,
  onCancel,
  saving,
  t,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm({ ...form, [k]: v });

  return (
    <div className="rounded-xl border border-purple-500/20 bg-card/60 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label={t("admin.fTitle")}>
            <input className={inputCls} value={form.title} onChange={(e) => set("title", e.target.value)} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label={t("admin.fDescription")}>
            <textarea
              className={inputCls}
              rows={2}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label={t("admin.fMushroom")}>
            <MushroomSearch
              value={
                form.mushroom_species
                  ? {
                      inaturalist_id: form.mushroom_inaturalist_id ?? 0,
                      latin_name: form.mushroom_species,
                      common_name: null,
                      image_url: form.mushroom_image_url,
                    }
                  : null
              }
              onChange={(m) =>
                setForm({
                  ...form,
                  mushroom_species: m ? m.common_name || m.latin_name : "",
                  mushroom_image_url: m?.image_url ?? null,
                  mushroom_inaturalist_id: m?.inaturalist_id ?? null,
                })
              }
            />
          </Field>
        </div>
        <Field label={t("admin.fDepartureDesc")}>
          <input
            className={inputCls}
            value={form.departure_desc}
            onChange={(e) => set("departure_desc", e.target.value)}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field label={t("admin.fDeparturePoint")}>
            <LocationPicker
              lat={form.departure_lat}
              lng={form.departure_lng}
              onSelect={(lat, lng) => setForm({ ...form, departure_lat: lat, departure_lng: lng })}
            />
          </Field>
          {form.departure_lat != null && form.departure_lng != null && (
            <p className="mt-1 text-xs text-muted-foreground">
              {t("admin.coords")}: {form.departure_lat.toFixed(5)}, {form.departure_lng.toFixed(5)}
            </p>
          )}
        </div>

        <Field label={t("admin.fTourDate")}>
          <input
            type="date"
            className={inputCls}
            value={form.tour_date}
            onChange={(e) => set("tour_date", e.target.value)}
          />
        </Field>
        <Field label={t("admin.fDepartureTime")}>
          <input
            type="time"
            className={inputCls}
            value={form.departure_time}
            onChange={(e) => set("departure_time", e.target.value)}
          />
        </Field>

        <Field label={t("admin.fSpots")}>
          <input
            type="number"
            min={1}
            className={inputCls}
            value={form.spots}
            onChange={(e) => set("spots", Number(e.target.value))}
          />
        </Field>
        <Field label={t("admin.fCurrency")}>
          <input className={inputCls} value={form.currency} onChange={(e) => set("currency", e.target.value)} />
        </Field>

        <Field label={t("admin.fStartPrice")}>
          <input
            type="number"
            min={0}
            step="0.01"
            className={inputCls}
            value={form.start_price}
            onChange={(e) => set("start_price", Number(e.target.value))}
          />
        </Field>
        <Field label={t("admin.fBidStep")}>
          <input
            type="number"
            min={0.01}
            step="0.01"
            className={inputCls}
            value={form.bid_step}
            onChange={(e) => set("bid_step", Number(e.target.value))}
          />
        </Field>

        <Field label={t("admin.fAuctionStart")}>
          <input
            type="datetime-local"
            className={inputCls}
            value={form.auction_start_at}
            onChange={(e) => set("auction_start_at", e.target.value)}
          />
        </Field>
        <Field label={t("admin.fAuctionEnd")}>
          <input
            type="datetime-local"
            className={inputCls}
            value={form.auction_end_at}
            onChange={(e) => set("auction_end_at", e.target.value)}
          />
        </Field>

        <Field label={t("admin.fAntiSnipe")}>
          <input
            type="number"
            min={0}
            className={inputCls}
            value={form.anti_snipe_seconds}
            onChange={(e) => set("anti_snipe_seconds", Number(e.target.value))}
          />
        </Field>
        <Field label={t("admin.fConfirmWindow")}>
          <input
            type="number"
            min={0}
            className={inputCls}
            value={form.confirm_window_hours}
            onChange={(e) => set("confirm_window_hours", Number(e.target.value))}
          />
        </Field>

        <Field label={t("admin.fStatus")}>
          <select
            className={inputCls}
            value={form.status}
            onChange={(e) => set("status", e.target.value as TourStatus)}
          >
            <option value="draft">{t("admin.fStatus")}: draft</option>
            <option value="published">published</option>
            <option value="finished">finished</option>
            <option value="cancelled">cancelled</option>
          </select>
        </Field>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {form.id ? t("admin.save") : t("admin.create")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
        >
          {t("admin.cancel")}
        </button>
      </div>
    </div>
  );
}

function ParticipantsTable({
  tourId,
  currency,
  t,
}: {
  tourId: string;
  currency: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const [rows, setRows] = useState<ParticipantRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tours/${tourId}/participants`);
      const data = await res.json();
      if (res.ok) setRows(data.participants ?? []);
    } finally {
      setLoading(false);
    }
  }, [tourId]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (action: string, userId?: string) => {
    const res = await fetch(`/api/admin/tours/${tourId}/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, user_id: userId }),
    });
    if (res.ok) {
      toast.success(t("admin.promoted"));
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Error");
    }
  };

  if (loading) {
    return (
      <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> {t("loading")}
      </div>
    );
  }

  if (rows.length === 0) {
    return <p className="mt-3 text-sm text-muted-foreground">{t("admin.noParticipants")}</p>;
  }

  return (
    <div className="mt-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold">{t("admin.participantsTitle")}</p>
        <button
          type="button"
          onClick={() => act("promote")}
          className="rounded-lg bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300 hover:bg-emerald-500/25"
        >
          {t("admin.promote")}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-muted-foreground">
            <tr>
              <th className="px-2 py-1">{t("admin.colNo")}</th>
              <th className="px-2 py-1">{t("admin.colName")}</th>
              <th className="px-2 py-1">{t("admin.colEmail")}</th>
              <th className="px-2 py-1">{t("admin.colContact")}</th>
              <th className="px-2 py-1">{t("admin.colBest")}</th>
              <th className="px-2 py-1">{t("admin.colBids")}</th>
              <th className="px-2 py-1">{t("admin.colTokens")}</th>
              <th className="px-2 py-1">{t("admin.colRank")}</th>
              <th className="px-2 py-1">{t("admin.colStatus")}</th>
              <th className="px-2 py-1">{t("admin.colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.user_id} className="border-t border-border/60">
                <td className="px-2 py-1 font-mono">{r.participant_no}</td>
                <td className="px-2 py-1">{r.full_name || "—"}</td>
                <td className="px-2 py-1">{r.email || "—"}</td>
                <td className="px-2 py-1">
                  {r.contact_link ? (
                    <a
                      href={r.contact_link.startsWith("http") ? r.contact_link : undefined}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary-light hover:underline"
                    >
                      {r.contact_link}
                      {r.contact_link.startsWith("http") && <ExternalLink className="h-3 w-3" />}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-2 py-1 font-medium">{formatMoney(r.best_amount, currency)}</td>
                <td className="px-2 py-1">{r.bids_count}</td>
                <td className="px-2 py-1">{r.tokens_spent}</td>
                <td className="px-2 py-1">{r.rank ?? "—"}</td>
                <td className="px-2 py-1">{t(`status${capitalize(r.status)}` as never)}</td>
                <td className="px-2 py-1">
                  <button
                    type="button"
                    onClick={() => act("no_show", r.user_id)}
                    className="rounded bg-red-500/10 px-2 py-0.5 text-[11px] text-red-300 hover:bg-red-500/20"
                  >
                    {t("admin.markNoShow")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function capitalize(s: string): string {
  // maps participant status -> i18n key suffix (statusWinner, statusNoShow, ...)
  const map: Record<string, string> = {
    bidding: "Bidding",
    winner: "Winner",
    waitlist: "Waitlist",
    confirmed: "Confirmed",
    declined: "Declined",
    no_show: "NoShow",
    expired: "Expired",
  };
  return map[s] ?? "Bidding";
}
