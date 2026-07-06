"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Pencil, Check, X, Star } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface EditProfileNameProps {
  userId: string;
  initialName: string | null;
  accountType?: string | null;
}

export function EditProfileName({ userId, initialName, accountType }: EditProfileNameProps) {
  const t = useTranslations("account.profileName");
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName || "");
  const [saving, setSaving] = useState(false);
  const isAdmin = accountType === "admin";

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: trimmed })
      .eq("id", userId);

    if (error) {
      toast.error(t("saveError"));
    } else {
      toast.success(t("updated"));
      setEditing(false);
    }
    setSaving(false);
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className={isAdmin ? "font-bold" : ""}>{initialName || t("notSet")}</span>
        {isAdmin && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
        <Pencil className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("placeholder")}
        autoFocus
        className="w-48 rounded-lg border border-border bg-white px-3 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") { setEditing(false); setName(initialName || ""); }
        }}
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={saving || !name.trim()}
        className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 text-primary-light transition-colors hover:bg-primary/30 disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
      </button>
      <button
        type="button"
        onClick={() => { setEditing(false); setName(initialName || ""); }}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
