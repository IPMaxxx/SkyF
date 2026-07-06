"use client";

import { Star } from "lucide-react";
import { useTranslations } from "next-intl";

interface UserNameProps {
  name: string | null | undefined;
  accountType?: string | null;
  fallback?: string;
  className?: string;
}

export function UserName({
  name,
  accountType,
  fallback,
  className = "",
}: UserNameProps) {
  const t = useTranslations("common");
  const isAdmin = accountType === "admin";
  const displayName = name || fallback || t("user");

  if (isAdmin) {
    return (
      <span className={`inline-flex items-center gap-1 ${className}`}>
        <span className="font-bold">{displayName}</span>
        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
      </span>
    );
  }

  return <span className={className}>{displayName}</span>;
}
