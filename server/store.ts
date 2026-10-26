import { fetchBizinfo } from "./bizinfo.ts";
import { fetchGov24, fetchGov24Detail } from "./gov24.ts";
import type { BenefitRecord } from "./record.ts";
import { sampleRecords } from "./sample.ts";
import type { BenefitSource, Profile, SourceState, SourceStatus } from "../src/types.ts";

// 공공 API 데이터는 하루 단위로 바뀌므로 메모리에 모아 두고 주기적으로 새로 받는다.
// (보조금24 개발계정은 하루 10,000건 한도 → 6시간마다 약 22번 호출이면 충분히 여유 있다)
const REFRESH_MS = 6 * 60 * 60 * 1000;

interface SourceCache {
  records: BenefitRecord[];
  state: SourceState;
}

const keys: Record<BenefitSource, string> = {
  보조금24: process.env.GOV24_SERVICE_KEY?.trim() ?? "",
  기업마당: process.env.BIZINFO_API_KEY?.trim() ?? "",
};

const fetchers: Record<BenefitSource, (key: string) => Promise<BenefitRecord[]>> = {
  보조금24: fetchGov24,
  기업마당: fetchBizinfo,
};

const cache: Record<BenefitSource, SourceCache> = {
  보조금24: { records: [], state: "sample" },
  기업마당: { records: [], state: "sample" },
};
let updatedAt: string | null = null;
let ready: Promise<void> | null = null;

async function loadSource(source: BenefitSource): Promise<void> {
  const key = keys[source];
  if (!key) {
    cache[source] = { records: sampleRecords(source), state: "sample" };
    return;
  }
  try {
    const records = await fetchers[source](key);
    cache[source] = { records, state: "live" };
    console.log(`[${source}] ${records.length}건 불러옴`);
  } catch (e) {
    console.error(`[${source}] 불러오기 실패:`, e);
    // 이전에 받아 둔 실제 데이터가 있으면 그대로 쓰고, 없을 때만 샘플로 대신한다.
    if (cache[source].state !== "live") cache[source] = { records: sampleRecords(source), state: "error" };
  }
}

async function refresh(): Promise<void> {
  await Promise.all([loadSource("보조금24"), loadSource("기업마당")]);
  updatedAt = new Date().toISOString();
}

export function startStore(): Promise<void> {
  if (!ready) {
    ready = refresh();
    setInterval(() => void refresh(), REFRESH_MS).unref();
  }
  return ready;
}

export function status(): SourceStatus {
  return { 보조금24: cache.보조금24.state, 기업마당: cache.기업마당.state, updated_at: updatedAt };
}

function allRecords(): BenefitRecord[] {
  return [...cache.보조금24.records, ...cache.기업마당.records];
}

// ---- 매칭 ----

// "나는 이런 상황이에요" 선택지별로 공고 문장에서 찾을 단어
const TARGET_WORDS: Record<string, string[]> = {
  청년: ["청년", "대학생", "사회초년생"],
  소상공인: ["소상공인", "자영업", "소공인", "중소기업", "창업"],
  육아: ["육아", "아동", "영유아", "영아", "자녀", "보육", "출산", "임산부", "양육"],
  신혼: ["신혼", "혼인", "결혼", "예비부부"],
  고령: ["노인", "어르신", "고령", "65세", "노년"],
  구직: ["구직", "취업", "실업", "미취업", "취준"],
};

// 화면의 분야 칩 → 두 API의 분야 이름에 들어 있는 단어
const CATEGORY_WORDS: Record<string, string[]> = {
  금융: ["금융"],
  주거: ["주거"],
  창업: ["창업"],
  고용: ["고용", "인력"],
  교육: ["교육"],
  육아: ["보육", "임신", "출산", "돌봄"],
  기술: ["기술"],
  건강: ["보건", "의료"],
};

export function categoryMatches(chip: string, category: string): boolean {
  if (!chip) return true;
  const words = CATEGORY_WORDS[chip] ?? [chip];
  return words.some((w) => category.includes(w));
}

function regionMatches(r: BenefitRecord, p: Profile): boolean {
  if (r.match.regions.length === 0) return true;
  if (!p.region_sido || !r.match.regions.includes(p.region_sido)) return false;
  // 시/군/구 사업은 사용자가 시/군/구를 입력했을 때만 이름까지 맞춰 본다.
  if (r.match.sigungu && p.region_sigungu) return r.match.sigungu.includes(p.region_sigungu.replace(/\s/g, ""));
  return true;
}

function ageMatches(r: BenefitRecord, p: Profile): boolean {
  if (p.age === null) return true;
  if (r.match.ageMin !== null && p.age < r.match.ageMin) return false;
  if (r.match.ageMax !== null && p.age > r.match.ageMax) return false;
  return true;
}

function targetMatches(r: BenefitRecord, p: Profile): boolean {
  if (p.targets.length === 0) return true;
  // 기업마당은 기업·소상공인 대상 공고라서, 소상공인이 아니면 창업 공고만 남긴다.
  if (r.source === "기업마당" && !p.targets.includes("소상공인")) {
    return r.category.includes("창업") && p.targets.some((t) => t === "청년" || t === "구직");
  }
  return p.targets.some((t) => (TARGET_WORDS[t] ?? [t]).some((w) => r.match.text.includes(w)));
}

export function matchesProfile(r: BenefitRecord, p: Profile): boolean {
  return regionMatches(r, p) && ageMatches(r, p) && targetMatches(r, p);
}

// 마감 임박순, 날짜를 모르는 건(상시·확인필요)은 뒤로
export function byDeadline(a: BenefitRecord, b: BenefitRecord): number {
  const da = a.dday ?? Number.MAX_SAFE_INTEGER;
  const db = b.dday ?? Number.MAX_SAFE_INTEGER;
  if (da !== db) return da - db;
  // 둘 다 날짜가 없으면 상시를 확인필요보다 먼저
  return Number(a.deadline_status !== "상시") - Number(b.deadline_status !== "상시");
}

export function isOpen(r: BenefitRecord): boolean {
  return r.deadline_status !== "마감";
}

export function query(filter: (r: BenefitRecord) => boolean): BenefitRecord[] {
  return allRecords().filter(filter).sort(byDeadline);
}

export async function detail(source: BenefitSource, id: string): Promise<BenefitRecord | null> {
  const found = cache[source].records.find((r) => r.service_id === id);
  if (!found) return null;
  if (source === "보조금24" && cache[source].state === "live") {
    try {
      const extra = await fetchGov24Detail(keys.보조금24, id);
      if (extra) return { ...found, ...extra };
    } catch (e) {
      console.warn(`[보조금24] 상세 조회 실패(${id}), 목록 정보로 대신:`, e);
    }
  }
  return found;
}
