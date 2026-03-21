/** Calendar YYYY-MM-DD in Europe/Minsk (no DST in Belarus). */
export function minskTodayYmd(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Minsk" });
}

/** Add civil days to a YYYY-MM-DD string, staying in Minsk calendar. */
export function addCalendarDaysYmd(ymd: string, deltaDays: number): string {
  const t = new Date(`${ymd}T12:00:00+03:00`);
  t.setTime(t.getTime() + deltaDays * 86400000);
  return t.toLocaleDateString("sv-SE", { timeZone: "Europe/Minsk" });
}
