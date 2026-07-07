import type { ReasonParams } from "@/app/api/forest-search/route";

/** Loose translator signature — callers pass the next-intl `t` from the
 *  `forestSearch` namespace (cast to this shape to allow dynamic keys). */
type TFunc = (key: string, values?: Record<string, string | number>) => string;

interface ReasonSource {
  reasonCode?: string;
  reasonParams?: ReasonParams;
  /** Legacy history records persisted a prebuilt (Russian) string. */
  reason?: string;
}

/**
 * Resolve a score-breakdown item's `reasonCode` + `reasonParams` into a
 * localized string. Genus keys and IGBP codes carried in the params are
 * translated through the same `forestSearch` namespace so the whole reason
 * follows the active UI locale. Older history rows that only carried a
 * prebuilt `reason` string are returned as-is.
 */
export function formatReason(t: TFunc, item: ReasonSource): string {
  if (!item.reasonCode) return item.reason ?? "";

  const p = item.reasonParams ?? {};
  const genusList = (key: string) =>
    (Array.isArray(p[key]) ? (p[key] as string[]) : []).map((g) => t(`genus.${g}`)).join(", ");
  const num = (key: string) => p[key] as number;
  const str = (key: string) => p[key] as string;
  const igbp = (key: string) => t(`igbp.${p[key]}`);
  const ftype = (key: string) => t(`forestType.${p[key]}`);

  switch (item.reasonCode) {
    case "generaJaccard":
      return t("reasonGeneraJaccard", {
        pct: num("pct"),
        matched: num("matched"),
        total: num("total"),
        names: genusList("genera"),
      });
    case "generaNoCommon":
      return t("reasonGeneraNoCommon", { names: genusList("genera") });
    case "generaCandidateOnly":
      return t("reasonGeneraCandidateOnly", { names: genusList("genera") });
    case "generaNoCandidate":
      return t("reasonGeneraNoCandidate");
    case "generaNone":
      return t("reasonGeneraNone");

    case "domMatch":
      return t("reasonDomMatch", { ref: str("ref"), cand: str("cand") });
    case "domSameGroup":
      return t("reasonDomSameGroup", { ref: str("ref"), cand: str("cand") });
    case "domDiffGroup":
      return t("reasonDomDiffGroup", { ref: str("ref"), cand: str("cand") });
    case "domCandidateOnly":
      return t("reasonDomCandidateOnly", { cand: str("cand") });
    case "domNone":
      return t("reasonDomNone");

    case "typeMatch":
      return t("reasonTypeMatch", { type: ftype("type") });
    case "typePartialMixed":
      return t("reasonTypePartialMixed");
    case "typeMismatch":
      return t("reasonTypeMismatch", { ref: ftype("ref"), cand: ftype("cand") });
    case "typeBothUnknown":
      return t("reasonTypeBothUnknown");
    case "typeOneUnknown":
      return t("reasonTypeOneUnknown");

    case "modisMatch":
      return t("reasonModisMatch", { name: igbp("igbp") });
    case "modisBothForest":
      return t("reasonModisBothForest", { ref: igbp("ref"), cand: igbp("cand") });
    case "modisCandidateNotForest":
      return t("reasonModisCandidateNotForest", { cand: igbp("cand") });
    case "modisUnavailable":
      return t("reasonModisUnavailable");

    default:
      return item.reason ?? "";
  }
}

/**
 * Localize a stored IGBP land-cover class. New records carry the numeric class
 * code (resolved via the `igbp` namespace); legacy history rows stored the
 * already-Russian name, which we surface verbatim as a fallback.
 */
export function formatIgbpClass(
  t: TFunc & { has: (key: string) => boolean },
  cls: number | string | null | undefined
): string {
  if (cls === null || cls === undefined || cls === "") return "";
  const key = `igbp.${cls}`;
  return t.has(key) ? t(key) : String(cls);
}
