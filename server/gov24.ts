import { parseDeadline } from "./deadline.ts";
import type { BenefitRecord } from "./record.ts";
import { sidoFromAgency } from "./regions.ts";
import { cleanText, oneLine } from "./text.ts";

// 보조금24 = 행정안전부_대한민국 공공서비스(혜택) 정보 (공공데이터포털)
// https://www.data.go.kr/data/15113968/openapi.do
const BASE = "https://api.odcloud.kr/api/gov24/v3";
const PER_PAGE = 1000;
const MAX_PAGES = 20;

type Row = Record<string, unknown>;

interface OdcloudPage {
  code?: number;
  msg?: string;
  totalCount?: number;
  data?: Row[];
}

async function getPage(endpoint: string, key: string, page: number, cond: Record<string, string> = {}): Promise<OdcloudPage> {
  const params = new URLSearchParams({ serviceKey: key, page: String(page), perPage: String(PER_PAGE) });
  for (const [k, v] of Object.entries(cond)) params.set(`cond[${k}]`, v);
  const res = await fetch(`${BASE}/${endpoint}?${params}`, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`보조금24 ${endpoint} HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const body = (await res.json()) as OdcloudPage;
  if (typeof body.code === "number" && body.code < 0) throw new Error(`보조금24 ${endpoint} 오류 ${body.code}: ${body.msg}`);
  return body;
}

async function getAll(endpoint: string, key: string): Promise<Row[]> {
  const rows: Row[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const body = await getPage(endpoint, key, page);
    const data = body.data ?? [];
    rows.push(...data);
    if (data.length === 0 || rows.length >= (body.totalCount ?? 0)) break;
  }
  return rows;
}

function str(row: Row, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v !== null && v !== undefined && String(v).trim() !== "") return String(v);
  }
  return "";
}

function num(v: unknown): number | null {
  const n = Number(v);
  return v === null || v === undefined || v === "" || !Number.isFinite(n) ? null : n;
}

function toRecord(row: Row, cond: Row | undefined): BenefitRecord {
  const agency = str(row, "소관기관명");
  const agencyType = str(row, "소관기관유형");
  const local = agencyType !== "" && !agencyType.includes("중앙");
  const sido = local ? sidoFromAgency(agency) : null;
  const sigungu = agencyType.includes("시군구") ? (agency.split(/\s+/)[1] ?? null) : null;

  // 지원조건의 나이 0~120은 "제한 없음"을 뜻한다.
  let ageMin = cond ? num(cond["JA0110"]) : null;
  let ageMax = cond ? num(cond["JA0111"]) : null;
  if (ageMin !== null && ageMin <= 0) ageMin = null;
  if (ageMax !== null && ageMax >= 120) ageMax = null;

  const name = str(row, "서비스명");
  const target = cleanText(str(row, "지원대상"));
  const summary = oneLine(str(row, "서비스목적요약", "서비스목적"));

  return {
    service_id: str(row, "서비스ID"),
    name,
    summary,
    category: str(row, "서비스분야") || "기타",
    agency,
    target,
    support: cleanText(str(row, "지원내용")),
    criteria: cleanText(str(row, "선정기준")) || undefined,
    apply_method: cleanText(str(row, "신청방법")),
    contact: cleanText(str(row, "전화문의", "문의처")),
    detail_url: str(row, "상세조회URL") || `https://www.gov.kr/portal/rcvfvrSvc/dtlEx/${str(row, "서비스ID")}`,
    source: "보조금24",
    ...parseDeadline(str(row, "신청기한")),
    match: {
      regions: sido ? [sido] : [],
      sigungu,
      ageMin,
      ageMax,
      text: [name, summary, target, str(row, "사용자구분"), str(row, "서비스분야")].join(" "),
    },
  };
}

export async function fetchGov24(key: string): Promise<BenefitRecord[]> {
  const [list, conditions] = await Promise.all([
    getAll("serviceList", key),
    // 지원조건은 나이 필터에만 쓰므로, 실패해도 목록은 그대로 쓴다.
    getAll("supportConditions", key).catch((e: unknown) => {
      console.warn("[보조금24] 지원조건 조회 실패, 나이 필터 없이 진행:", e);
      return [] as Row[];
    }),
  ]);
  const condById = new Map(conditions.map((c) => [String(c["서비스ID"]), c]));
  return list.map((row) => toRecord(row, condById.get(String(row["서비스ID"]))));
}

// 목록에 없는 구비서류·온라인 신청 주소 등을 상세 API에서 채운다.
export async function fetchGov24Detail(key: string, serviceId: string): Promise<Partial<BenefitRecord> | null> {
  const body = await getPage("serviceDetail", key, 1, { "서비스ID::EQ": serviceId });
  const row = body.data?.[0];
  if (!row) return null;
  const extra: Partial<BenefitRecord> = {};
  const documents = cleanText(str(row, "구비서류"));
  const applyUrl = str(row, "온라인신청사이트URL");
  const contact = cleanText(str(row, "문의처"));
  const criteria = cleanText(str(row, "선정기준"));
  if (documents) extra.documents = documents;
  if (applyUrl) extra.apply_url = applyUrl;
  if (contact) extra.contact = contact;
  if (criteria) extra.criteria = criteria;
  return extra;
}
