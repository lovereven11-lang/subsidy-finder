import { parseDeadline } from "./deadline.ts";
import type { BenefitRecord } from "./record.ts";
import { sidoFromTags, SIDO } from "./regions.ts";
import { cleanText, oneLine } from "./text.ts";

// 기업마당 지원사업정보 API
// https://www.bizinfo.go.kr/apiDetail.do?id=bizinfoApi
const URL_BASE = "https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do";
const SEARCH_CNT = 1000;

type Item = Record<string, unknown>;

function str(item: Item, ...keys: string[]): string {
  for (const k of keys) {
    const v = item[k];
    if (v !== null && v !== undefined && String(v).trim() !== "") return String(v);
  }
  return "";
}

// 응답은 { jsonArray: { item: [...] } } 형태지만, 건수가 1개면 배열 대신 객체가 오거나
// jsonArray 자체가 배열로 오는 경우가 있어 모두 받아준다.
function extractItems(body: unknown): Item[] {
  const root = (body as { jsonArray?: unknown })?.jsonArray ?? body;
  const items = Array.isArray(root) ? root : ((root as { item?: unknown })?.item ?? []);
  return (Array.isArray(items) ? items : [items]).filter((x): x is Item => typeof x === "object" && x !== null);
}

function toRecord(item: Item): BenefitRecord {
  const id = str(item, "pblancId");
  const tags = str(item, "hashtags")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  // 전국 대상 공고는 해시태그에 시/도가 전부 들어 있으므로, 대부분 지역이 언급되면 전국으로 본다.
  const regionTags = sidoFromTags(tags);
  const regions = regionTags.length >= SIDO.length - 3 ? [] : regionTags;

  const name = cleanText(str(item, "pblancNm"));
  const summary = oneLine(str(item, "bsnsSumryCn"));
  const target = cleanText(str(item, "trgetNm"));
  const pageUrl = str(item, "pblancUrl");

  return {
    service_id: id,
    name,
    summary,
    category: str(item, "pldirSportRealmLclasCodeNm") || "기타",
    agency: str(item, "jrsdInsttNm", "excInsttNm"),
    target,
    support: cleanText(str(item, "bsnsSumryCn")),
    apply_method: cleanText(str(item, "reqstMthPapersCn")),
    contact: cleanText(str(item, "refrncNm")),
    detail_url: pageUrl.startsWith("http")
      ? pageUrl
      : `https://www.bizinfo.go.kr/sii/siia/selectSIIA200Detail.do?pblancId=${encodeURIComponent(id)}`,
    apply_url: str(item, "rceptEngnHmpgUrl") || undefined,
    source: "기업마당",
    ...parseDeadline(str(item, "reqstBeginEndDe")),
    match: {
      regions,
      sigungu: null,
      ageMin: null,
      ageMax: null,
      text: [name, summary, target, tags.join(" ")].join(" "),
    },
  };
}

export async function fetchBizinfo(key: string): Promise<BenefitRecord[]> {
  const params = new URLSearchParams({ crtfcKey: key, dataType: "json", searchCnt: String(SEARCH_CNT) });
  const res = await fetch(`${URL_BASE}?${params}`, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`기업마당 HTTP ${res.status}`);
  const text = await res.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    // 키가 틀리면 JSON 대신 안내 문구나 HTML이 온다.
    throw new Error(`기업마당 응답이 JSON이 아니에요: ${text.slice(0, 200)}`);
  }
  return extractItems(body)
    .map(toRecord)
    .filter((r) => r.service_id !== "");
}
