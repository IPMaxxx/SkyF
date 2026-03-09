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
} from "lucide-react";
import QRCode from "qrcode";

interface ReferralStats {
  code: string;
  uses_count: number;
  total_earned: number;
}

export default function ReferralPage() {
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
    ? `https://skyforest.by/ref/${stats.code}`
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
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `skyforest-referral-${stats?.code}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="text-muted-foreground">Не удалось загрузить данные</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15">
          <Gift className="h-8 w-8 text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold">Пригласить друга</h1>
        <p className="mx-auto mt-2 max-w-md text-muted-foreground">
          Поделитесь ссылкой или QR-кодом — вы получаете{" "}
          <strong className="text-amber-400">10% от каждой покупки</strong>{" "}
          приглашённого, а он получает{" "}
          <strong className="text-emerald-400">+10% токенов</strong> к своим покупкам
        </p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-5 text-center">
          <Users className="mx-auto mb-2 h-5 w-5 text-emerald-400" />
          <div className="text-3xl font-bold text-emerald-400">
            {stats.uses_count}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Приглашённых
          </p>
        </div>
        <div className="glass rounded-2xl p-5 text-center">
          <Coins className="mx-auto mb-2 h-5 w-5 text-amber-400" />
          <div className="text-3xl font-bold text-amber-400">
            {stats.total_earned}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Заработано токенов
          </p>
        </div>
      </div>

      {/* Referral link */}
      <div className="glass mb-8 rounded-2xl p-6">
        <h2 className="mb-3 text-sm font-semibold">Ваша реферальная ссылка</h2>
        <div className="flex items-center gap-2">
          <div className="flex-1 overflow-hidden rounded-xl bg-white/5 px-4 py-3">
            <p className="truncate text-sm font-mono text-primary-light">
              {referralUrl}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary transition-colors hover:bg-primary-dark"
          >
            {copied ? (
              <Check className="h-5 w-5 text-white" />
            ) : (
              <Copy className="h-5 w-5 text-white" />
            )}
          </button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Код: <strong className="text-foreground">{stats.code}</strong>
        </p>
      </div>

      {/* QR Code */}
      <div className="glass rounded-2xl p-6">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <QrCode className="h-4 w-4 text-emerald-400" />
          QR-код для стримов и соцсетей
        </h2>
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-2xl bg-[#111] p-4">
            <canvas ref={canvasRef} className="h-64 w-64" />
          </div>
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            <Download className="h-4 w-4" />
            Скачать QR-код (PNG)
          </button>
          <p className="text-center text-xs text-muted-foreground">
            Разместите QR-код во время стрима или в соцсетях — зрители
            отсканируют и зарегистрируются по вашей ссылке
          </p>
        </div>
      </div>

      {/* How it works */}
      <div className="mt-8 glass rounded-2xl p-6">
        <h2 className="mb-4 text-sm font-semibold">Как это работает</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">
              1
            </div>
            <p className="text-sm text-muted-foreground">
              Поделитесь ссылкой или QR-кодом с друзьями, зрителями, подписчиками
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">
              2
            </div>
            <p className="text-sm text-muted-foreground">
              Друг регистрируется или вводит код на странице покупки токенов и получает <strong className="text-emerald-400">+10% токенов</strong> к каждой покупке — навсегда
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">
              3
            </div>
            <p className="text-sm text-muted-foreground">
              Вы получаете <strong className="text-amber-400">10% от каждой его покупки</strong> — без ограничений на количество приглашений и покупок
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
