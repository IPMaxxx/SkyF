"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Gift,
  Copy,
  Check,
  Users,
  Coins,
  Download,
  Loader2,
  QrCode,
  Send,
  MessageCircle,
  Share2,
  Mail,
} from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface ReferralStats {
  code: string;
  uses_count: number;
  total_earned: number;
}

export default function ReferralPage() {
  const t = useTranslations("referralPage");
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    fetch("/api/referral/stats")
      .then((r) => r.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const referralUrl = stats
    ? `https://www.skyforest.by/ref/${stats.code}`
    : "";

  const drawQR = useCallback(async () => {
    if (!stats || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const size = 400;
    canvas.width = size;
    canvas.height = size;

    await QRCode.toCanvas(canvas, referralUrl, {
      width: size,
      margin: 2,
      color: { dark: "#ffffff", light: "#111111" },
      errorCorrectionLevel: "H",
    });

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const logoSize = size * 0.22;
    const logoX = (size - logoSize) / 2;
    const logoY = (size - logoSize) / 2;

    ctx.fillStyle = "#111111";
    const pad = 8;
    ctx.beginPath();
    ctx.roundRect(
      logoX - pad,
      logoY - pad,
      logoSize + pad * 2,
      logoSize + pad * 2,
      12
    );
    ctx.fill();

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      ctx.drawImage(img, logoX, logoY, logoSize, logoSize);
      logoRef.current = img;
    };
    img.src = "/images/logo-square.png";
  }, [stats, referralUrl]);

  useEffect(() => {
    drawQR();
  }, [drawQR]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    toast.success(t("shareCopied"));
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `skyforest-referral-${stats?.code}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  const shareText = t("shareText");
  const encodedUrl = encodeURIComponent(referralUrl);
  const encodedText = encodeURIComponent(`${shareText} ${referralUrl}`);
  const encodedTextOnly = encodeURIComponent(shareText);

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "SkyForest",
          text: shareText,
          url: referralUrl,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      handleCopy();
    }
  };

  const shareLinks: {
    label: string;
    href: string;
    icon: typeof Send;
    color: string;
  }[] = [
    {
      label: t("shareTelegram"),
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTextOnly}`,
      icon: Send,
      color: "bg-[#229ED9]/15 text-[#4fb6e6] hover:bg-[#229ED9]/25",
    },
    {
      label: t("shareWhatsApp"),
      href: `https://wa.me/?text=${encodedText}`,
      icon: MessageCircle,
      color: "bg-[#25D366]/15 text-[#41db7d] hover:bg-[#25D366]/25",
    },
    {
      label: t("shareViber"),
      href: `viber://forward?text=${encodedText}`,
      icon: MessageCircle,
      color: "bg-[#7360F2]/15 text-[#9482ff] hover:bg-[#7360F2]/25",
    },
    {
      label: t("shareVk"),
      href: `https://vk.com/share.php?url=${encodedUrl}&title=${encodedTextOnly}`,
      icon: Share2,
      color: "bg-[#0077FF]/15 text-[#4d9bff] hover:bg-[#0077FF]/25",
    },
    {
      label: t("shareEmail"),
      href: `mailto:?subject=${encodeURIComponent("SkyForest")}&body=${encodedText}`,
      icon: Mail,
      color: "bg-white/10 text-white/80 hover:bg-white/15",
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="text-muted-foreground">{t("loadError")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15">
          <Gift className="h-8 w-8 text-emerald-400" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mx-auto mt-2 max-w-md text-muted-foreground">
          {t("subtitleBefore")}{" "}
          <strong className="text-amber-400">{t("subtitleBold1")}</strong>{" "}
          {t("subtitleMid")}{" "}
          <strong className="text-emerald-400">{t("subtitleBold2")}</strong>{" "}
          {t("subtitleAfter")}
        </p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-5 text-center">
          <Users className="mx-auto mb-2 h-5 w-5 text-emerald-400" aria-hidden="true" />
          <div className="text-3xl font-bold text-emerald-400">
            {stats.uses_count}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{t("invited")}</p>
        </div>
        <div className="glass rounded-2xl p-5 text-center">
          <Coins className="mx-auto mb-2 h-5 w-5 text-amber-400" aria-hidden="true" />
          <div className="text-3xl font-bold text-amber-400">
            {stats.total_earned}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{t("earnedTokens")}</p>
        </div>
      </div>

      <div className="glass mb-6 rounded-2xl p-6">
        <h2 className="mb-3 text-sm font-semibold">{t("yourLink")}</h2>
        <div className="flex items-center gap-2">
          <div className="flex-1 overflow-hidden rounded-xl bg-white/5 px-4 py-3">
            <p className="truncate text-sm font-mono text-primary-light">
              {referralUrl}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            aria-label={t("shareCopied")}
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary transition-colors hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1a12]"
          >
            {copied ? (
              <Check className="h-5 w-5 text-white" aria-hidden="true" />
            ) : (
              <Copy className="h-5 w-5 text-white" aria-hidden="true" />
            )}
          </button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {t("yourCode")}:{" "}
          <strong className="text-foreground">{stats.code}</strong>
        </p>
      </div>

      <div className="glass mb-8 rounded-2xl p-6">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Share2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          {t("shareTitle")}
        </h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {shareLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex flex-col items-center gap-1.5 rounded-xl px-3 py-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light ${link.color}`}
            >
              <link.icon className="h-5 w-5" aria-hidden="true" />
              <span>{link.label}</span>
            </a>
          ))}
        </div>
        <button
          type="button"
          onClick={handleNativeShare}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light"
        >
          <Share2 className="h-4 w-4" aria-hidden="true" />
          {t("shareNative")}
        </button>
      </div>

      <div className="glass rounded-2xl p-6">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <QrCode className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          {t("qrTitle")}
        </h2>
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-2xl bg-[#111] p-4">
            <canvas
              ref={canvasRef}
              className="h-64 w-64"
              role="img"
              aria-label={t("qrTitle")}
            />
          </div>
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            {t("downloadQr")}
          </button>
          <p className="text-center text-xs text-muted-foreground">
            {t("qrHint")}
          </p>
        </div>
      </div>

      <div className="mt-8 glass rounded-2xl p-6">
        <h2 className="mb-4 text-sm font-semibold">{t("howTitle")}</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">
              1
            </div>
            <p className="text-sm text-muted-foreground">{t("how1")}</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">
              2
            </div>
            <p className="text-sm text-muted-foreground">
              {t("how2Before")}{" "}
              <strong className="text-emerald-400">{t("how2Bold")}</strong>{" "}
              {t("how2After")}
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">
              3
            </div>
            <p className="text-sm text-muted-foreground">
              {t("how3Before")}{" "}
              <strong className="text-amber-400">{t("how3Bold")}</strong>{" "}
              {t("how3After")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
