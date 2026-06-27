"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import { Loader2, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

interface EditContactLinkProps {
  userId: string;
  initialValue: string | null;
}

export function EditContactLink({ userId, initialValue }: EditContactLinkProps) {
  const t = useTranslations("account");
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialValue || "");
  const [saved, setSaved] = useState(initialValue || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = value.trim();
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ contact_link: trimmed || null })
      .eq("id", userId);

    if (error) {
      toast.error(t("contactLinkError"));
    } else {
      toast.success(t("contactLinkSaved"));
      setSaved(trimmed);
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
        <span className={saved ? "" : "italic"}>{saved || t("contactLinkEmpty")}</span>
        <Pencil className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t("contactLinkPlaceholder")}
        autoFocus
        className="w-56 rounded-lg border border-border bg-white px-3 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") {
            setEditing(false);
            setValue(saved);
          }
        }}
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 text-primary-light transition-colors hover:bg-primary/30 disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
      </button>
      <button
        type="button"
        onClick={() => {
          setEditing(false);
          setValue(saved);
        }}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
