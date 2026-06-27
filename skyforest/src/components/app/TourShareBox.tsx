"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Copy, Check, Download, ExternalLink, QrCode } from "lucide-react";
import { BRAND } from "@/lib/brand";

export function TourShareBox({ tourId }: { tourId: string }) {
  const t = useTranslations("mushroomTours");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const url = `${BRAND.url}/tours/${tourId}`;

  const drawQR = useCallback(async () => {
    if (!url || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const size = 512;
    canvas.width = size;
    canvas.height = size;

    await QRCode.toCanvas(canvas, url, {
      width: size,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
      errorCorrectionLevel: "H",
    });

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const logoSize = size * 0.2;
    const logoX = (size - logoSize) / 2;
    const logoY = (size - logoSize) / 2;
    const pad = 10;

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(logoX - pad, logoY - pad, logoSize + pad * 2, logoSize + pad * 2, 12);
    ctx.fill();

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => ctx.drawImage(img, logoX, logoY, logoSize, logoSize);
    img.src = "/images/logo-square.png";
  }, [url]);

  useEffect(() => {
    drawQR();
  }, [drawQR]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success(t("admin.copied"));
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `skyforest-tour-${tourId}.jpg`;
    link.href = canvasRef.current.toDataURL("image/jpeg", 0.92);
    link.click();
  };

  return (
    <div className="mt-3 rounded-xl border border-purple-500/20 bg-card/60 p-4">
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-purple-200">
        <QrCode className="h-4 w-4" aria-hidden="true" />
        {t("admin.share")}
      </p>

      <span className="mb-1 block text-xs text-muted-foreground">{t("admin.publicLink")}</span>
      <div className="flex items-center gap-2">
        <div className="flex-1 overflow-hidden rounded-lg bg-white/5 px-3 py-2">
          <p className="truncate font-mono text-xs text-primary-light">{url}</p>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          title={t("admin.copyLink")}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-white transition-colors hover:bg-primary/90"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
        <a
          href={url || undefined}
          target="_blank"
          rel="noreferrer"
          title={t("admin.openPublic")}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
        <div className="rounded-xl bg-white p-2">
          <canvas
            ref={canvasRef}
            className="h-40 w-40"
            role="img"
            aria-label={t("admin.share")}
          />
        </div>
        <div className="flex-1">
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            <Download className="h-4 w-4" />
            {t("admin.downloadQr")}
          </button>
          <p className="mt-2 text-xs text-muted-foreground">{t("admin.qrHint")}</p>
        </div>
      </div>
    </div>
  );
}
