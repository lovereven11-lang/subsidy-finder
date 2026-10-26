import type {
  BenefitDetail,
  BenefitListResponse,
  BenefitSource,
  DeadlineBriefing,
  Profile,
  SourceStatus,
} from "../types";

// 지원금 서버(server/index.ts)를 부른다.
// 개발 중에는 vite가 /api를 localhost:8787로 넘겨주고(vite.config.ts),
// 배포할 때는 VITE_API_BASE_URL에 서버 주소를 넣는다. 예: https://subsidy-api.example.com
const BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export const DISCLAIMER =
  "보조금24·기업마당 등재 기준 주요 지원금을 안내해요. 일부 지자체 사업은 누락될 수 있으니, 신청 전 원문에서 자격요건과 신청기간을 꼭 확인하세요.";

export class ApiError extends Error {}

async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== "")).toString();
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}${qs ? `?${qs}` : ""}`);
  } catch {
    throw new ApiError("서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.");
  }
  const body = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok || body === null) {
    // 개발 프록시는 서버가 꺼져 있으면 본문 없이 5xx를 돌려준다.
    if (!body?.error && res.status >= 500) throw new ApiError("서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.");
    throw new ApiError(body?.error ?? `요청에 실패했어요 (${res.status})`);
  }
  return body;
}

function profileParams(p: Profile): Record<string, string> {
  return {
    age: p.age === null ? "" : String(p.age),
    sido: p.region_sido,
    sigungu: p.region_sigungu,
    targets: p.targets.join(","),
  };
}

// find_benefits
export function findBenefits(
  profile: Profile,
  options: { category?: string; keyword?: string; onlyOpen?: boolean } = {},
): Promise<BenefitListResponse> {
  return get("/api/benefits", {
    ...profileParams(profile),
    category: options.category ?? "",
    q: options.keyword?.trim() ?? "",
    onlyOpen: String(options.onlyOpen ?? true),
  });
}

// search_benefits
export function searchBenefits(keyword: string, onlyOpen = true): Promise<BenefitListResponse> {
  return get("/api/search", { q: keyword, onlyOpen: String(onlyOpen) });
}

// benefit_detail
export async function getBenefitDetail(source: BenefitSource, serviceId: string): Promise<BenefitDetail> {
  const body = await get<{ benefit: BenefitDetail; status: SourceStatus }>(
    `/api/benefits/${encodeURIComponent(source)}/${encodeURIComponent(serviceId)}`,
  );
  return body.benefit;
}

// deadline_briefing
export function getDeadlineBriefing(profile: Profile | null, days = 14): Promise<DeadlineBriefing> {
  return get("/api/briefing", { ...(profile ? profileParams(profile) : {}), days: String(days) });
}
