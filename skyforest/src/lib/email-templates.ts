import { BRAND } from "@/lib/brand";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || BRAND.url;

interface CompareEmailData {
  bestDayName: string;
  locationName: string;
  compareDate: string;
  bestDate: string;
  overallScore: number;
  byParameter: Record<string, number>;
  insufficient?: boolean;
}

function scoreColor(pct: number): string {
  if (pct >= 80) return "#22c55e";
  if (pct >= 60) return "#eab308";
  if (pct >= 40) return "#f97316";
  return "#ef4444";
}

function scoreLabel(pct: number): string {
  if (pct >= 85) return "Excellent match!";
  if (pct >= 70) return "Good match";
  if (pct >= 55) return "Moderate match";
  if (pct >= 40) return "Weak match";
  return "Low match";
}

const PARAM_LABELS: Record<string, string> = {
  rain_sum: "Rain",
  temperature_mean: "Avg temp",
  temperature_min: "Min temp",
  temperature_max: "Max temp",
  wind_speed_max: "Wind",
  relative_humidity_mean: "Humidity",
};

export function buildCompareEmail(data: CompareEmailData): string {
  const score = Math.round(data.overallScore);
  const color = scoreColor(score);

  const paramRows = Object.entries(data.byParameter)
    .map(([key, val]) => {
      const pct = Math.round(val);
      return `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #1a2e1d;font-size:14px;color:#94a3b8;">${PARAM_LABELS[key] || key}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #1a2e1d;font-size:14px;font-weight:600;color:${scoreColor(pct)};text-align:right;">${pct}%</td>
        </tr>`;
    })
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0f0b;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:24px 16px;">
    
    <!-- Header -->
    <div style="text-align:center;padding:20px 0;">
      <h1 style="margin:0;font-size:20px;color:#e8f0ea;">Skyforest</h1>
      <p style="margin:4px 0 0;font-size:12px;color:#64748b;">Automatic pattern comparison</p>
    </div>

    <!-- Score card -->
    <div style="background:linear-gradient(135deg,${color}22,${color}11);border:1px solid ${color}44;border-radius:20px;padding:32px;text-align:center;margin-bottom:20px;">
      <p style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:2px;color:${color};">Pattern match</p>
      <p style="margin:0;font-size:64px;font-weight:800;color:${color};line-height:1;">${score}%</p>
      <p style="margin:8px 0 0;font-size:16px;color:${color};opacity:0.8;">${scoreLabel(score)}</p>
    </div>

    <!-- Details -->
    <div style="background:#0f1a12;border:1px solid #1a2e1d;border-radius:16px;padding:20px;margin-bottom:20px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#64748b;">Best Day</td>
          <td style="padding:6px 0;font-size:13px;color:#e8f0ea;text-align:right;font-weight:600;">${data.bestDayName}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#64748b;">Location</td>
          <td style="padding:6px 0;font-size:13px;color:#e8f0ea;text-align:right;">${data.locationName}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#64748b;">Comparison date</td>
          <td style="padding:6px 0;font-size:13px;color:#e8f0ea;text-align:right;">${data.compareDate}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#64748b;">Reference date</td>
          <td style="padding:6px 0;font-size:13px;color:#e8f0ea;text-align:right;">${data.bestDate}</td>
        </tr>
      </table>
    </div>

    <!-- Parameters -->
    <div style="background:#0f1a12;border:1px solid #1a2e1d;border-radius:16px;overflow:hidden;margin-bottom:20px;">
      <p style="margin:0;padding:12px 16px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#64748b;border-bottom:1px solid #1a2e1d;">By parameter</p>
      <table style="width:100%;border-collapse:collapse;">
        ${paramRows}
      </table>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${APP_URL}/dashboard/compare" style="display:inline-block;background:#62a863;color:#fff;text-decoration:none;padding:12px 32px;border-radius:12px;font-size:14px;font-weight:600;">View details</a>
    </div>

    <!-- Footer -->
    <p style="text-align:center;font-size:11px;color:#475569;">
      You're receiving this email because you enabled automatic comparison in Skyforest.<br>
      <a href="${APP_URL}/dashboard/compare" style="color:#62a863;">Turn off notifications</a>
    </p>
  </div>
</body>
</html>`;
}

export function buildNewMessageEmail(
  senderName: string,
  listingName: string,
  messagePreview: string,
  chatUrl?: string,
): string {
  const preview =
    messagePreview.length > 120
      ? messagePreview.slice(0, 120) + "…"
      : messagePreview;
  const replyUrl = chatUrl || `${APP_URL}/dashboard/marketplace/chats`;
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0f0b;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:24px 16px;">
    <div style="text-align:center;padding:20px 0;">
      <h1 style="margin:0;font-size:20px;color:#e8f0ea;">Skyforest</h1>
      <p style="margin:4px 0 0;font-size:12px;color:#64748b;">New message</p>
    </div>

    <div style="background:#0f1a12;border:1px solid #1a2e1d;border-radius:16px;padding:24px;margin-bottom:20px;">
      <p style="margin:0 0 12px;font-size:14px;color:#94a3b8;">
        <strong style="color:#e8f0ea;">${senderName || "A user"}</strong> sent you a message
      </p>
      <p style="margin:0 0 8px;font-size:12px;color:#64748b;">
        Mushroom day: <strong style="color:#e8f0ea;">${listingName || "—"}</strong>
      </p>
      <div style="background:#0a0f0b;border:1px solid #1a2e1d;border-radius:12px;padding:16px;margin-top:12px;">
        <p style="margin:0;font-size:14px;color:#e8f0ea;line-height:1.5;white-space:pre-wrap;">${preview}</p>
      </div>
    </div>

    <div style="text-align:center;margin-bottom:24px;">
      <a href="${replyUrl}" style="display:inline-block;background:#3b82f6;color:#fff;text-decoration:none;padding:12px 32px;border-radius:12px;font-size:14px;font-weight:600;">Reply</a>
    </div>

    <p style="text-align:center;font-size:11px;color:#475569;">
      You're receiving this email because someone messaged you on the Skyforest marketplace.
    </p>
  </div>
</body>
</html>`;
}

export function buildTourAuctionScheduledEmail(data: {
  tourTitle: string;
  auctionDate: string;
  tourDate?: string | null;
  tourUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0f0b;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:24px 16px;">
    <div style="text-align:center;padding:20px 0;">
      <h1 style="margin:0;font-size:20px;color:#e8f0ea;">Skyforest</h1>
      <p style="margin:4px 0 0;font-size:12px;color:#64748b;">Mushroom tour — auction date scheduled</p>
    </div>

    <div style="background:#0f1a12;border:1px solid #1a2e1d;border-radius:16px;padding:24px;margin-bottom:20px;">
      <p style="margin:0 0 12px;font-size:15px;color:#e8f0ea;font-weight:600;">${data.tourTitle}</p>
      <p style="margin:0 0 16px;font-size:14px;color:#94a3b8;line-height:1.6;">
        You're following this tour. The auction for a spot has been scheduled — don't miss your chance to bid.
      </p>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#64748b;">Auction start</td>
          <td style="padding:6px 0;font-size:13px;color:#62a863;text-align:right;font-weight:600;">${data.auctionDate}</td>
        </tr>
        ${
          data.tourDate
            ? `<tr>
          <td style="padding:6px 0;font-size:13px;color:#64748b;">Tour date</td>
          <td style="padding:6px 0;font-size:13px;color:#e8f0ea;text-align:right;">${data.tourDate}</td>
        </tr>`
            : ""
        }
      </table>
    </div>

    <div style="text-align:center;margin-bottom:24px;">
      <a href="${data.tourUrl}" style="display:inline-block;background:#62a863;color:#fff;text-decoration:none;padding:12px 32px;border-radius:12px;font-size:14px;font-weight:600;">Open tour page</a>
    </div>

    <p style="text-align:center;font-size:11px;color:#475569;">
      You're receiving this email because you started following this tour on Skyforest.
    </p>
  </div>
</body>
</html>`;
}

export function buildInsufficientTokensEmail(bestDayName: string, balance: number): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0f0b;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:24px 16px;">
    <div style="text-align:center;padding:20px 0;">
      <h1 style="margin:0;font-size:20px;color:#e8f0ea;">Skyforest</h1>
    </div>
    <div style="background:#f59e0b11;border:1px solid #f59e0b33;border-radius:16px;padding:24px;text-align:center;margin-bottom:20px;">
      <p style="margin:0 0 8px;font-size:14px;color:#f59e0b;font-weight:600;">Not enough tokens</p>
      <p style="margin:0;font-size:13px;color:#94a3b8;">
        The automatic comparison for "${bestDayName}" could not be run.<br>
        Current balance: <strong style="color:#f59e0b;">${balance} tokens</strong>. Required: 6.
      </p>
    </div>
    <div style="text-align:center;">
      <a href="${APP_URL}/payment" style="display:inline-block;background:#f59e0b;color:#fff;text-decoration:none;padding:12px 32px;border-radius:12px;font-size:14px;font-weight:600;">Buy tokens</a>
    </div>
  </div>
</body>
</html>`;
}
