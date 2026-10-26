import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { formatDate, todayKst } from "./deadline.ts";
import { toBenefit, toDetail } from "./record.ts";
import { categoryMatches, detail, isOpen, matchesProfile, query, startStore, status } from "./store.ts";
import type { BenefitListResponse, BenefitSource, DeadlineBriefing, Profile } from "../src/types.ts";

const PORT = Number(process.env.PORT ?? 8787);
// 앱인토스 웹뷰 주소가 정해지면 ALLOWED_ORIGINS에 쉼표로 넣어 제한한다. 비워 두면 모두 허용.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const MAX_RESULTS = 100;
const ALSO_OPEN_LIMIT = 10;

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function send(req: IncomingMessage, res: ServerResponse, code: number, body: unknown) {
  const origin = req.headers.origin ?? "";
  const allow = ALLOWED_ORIGINS.length === 0 ? "*" : ALLOWED_ORIGINS.includes(origin) ? origin : "";
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    ...(allow ? { "Access-Control-Allow-Origin": allow, Vary: "Origin" } : {}),
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body));
}

// 쿼리스트링의 내 조건 → Profile (age, sido, sigungu, targets=청년,구직)
function profileFrom(q: URLSearchParams): Profile | null {
  const sido = q.get("sido") ?? "";
  const targets = (q.get("targets") ?? "").split(",").filter(Boolean);
  if (!sido && targets.length === 0 && !q.get("age")) return null;
  const age = Number(q.get("age"));
  return {
    age: q.get("age") && Number.isFinite(age) ? age : null,
    region_sido: sido,
    region_sigungu: q.get("sigungu") ?? "",
    targets,
    interests: [],
  };
}

// 검색어를 띄어쓰기로 나눠, 모든 단어가 들어 있는 지원금만 남긴다. 검색어가 없으면 모두 통과.
function keywordFilter(raw: string | null): (r: Parameters<typeof matchesProfile>[0]) => boolean {
  const words = (raw ?? "").trim().split(/\s+/).filter(Boolean);
  return (r) => {
    if (words.length === 0) return true;
    const text = `${r.name} ${r.match.text} ${r.category} ${r.agency}`;
    return words.every((w) => text.includes(w));
  };
}

function list(records: ReturnType<typeof query>): BenefitListResponse {
  return { count: records.length, benefits: records.slice(0, MAX_RESULTS).map(toBenefit), status: status() };
}

async function route(url: URL): Promise<unknown> {
  const q = url.searchParams;
  const onlyOpen = q.get("onlyOpen") !== "false";

  // find_benefits: 내 조건에 맞는 지원금 (마감 임박순)
  if (url.pathname === "/api/benefits") {
    const profile = profileFrom(q);
    if (!profile) throw new HttpError(400, "내 조건(sido, targets 등)이 필요해요.");
    const category = q.get("category") ?? "";
    // q가 있으면 내 조건에 맞는 것 중에서 검색어로 한 번 더 좁힌다.
    const matchesKeyword = keywordFilter(q.get("q"));
    return list(
      query(
        (r) =>
          matchesProfile(r, profile) &&
          categoryMatches(category, r.category) &&
          matchesKeyword(r) &&
          (!onlyOpen || isOpen(r)),
      ),
    );
  }

  // search_benefits: 키워드 검색 (내 조건 무관)
  if (url.pathname === "/api/search") {
    if (!(q.get("q") ?? "").trim()) throw new HttpError(400, "검색어(q)가 필요해요.");
    const matchesKeyword = keywordFilter(q.get("q"));
    return list(query((r) => matchesKeyword(r) && (!onlyOpen || isOpen(r))));
  }

  // deadline_briefing: 마감 임박 (프로필이 있으면 내 조건 기준)
  if (url.pathname === "/api/briefing") {
    const profile = profileFrom(q);
    const days = Math.min(Math.max(Number(q.get("days")) || 14, 1), 90);
    const mine = (r: Parameters<typeof matchesProfile>[0]) => !profile || matchesProfile(r, profile);
    const urgent = query((r) => mine(r) && r.dday !== null && r.dday >= 0 && r.dday <= days);
    const alsoOpen = query((r) => mine(r) && r.deadline_status === "상시");
    const body: DeadlineBriefing = {
      briefing_date: formatDate(todayKst()),
      headline:
        urgent.length > 0 ? `마감 임박 지원금 ${urgent.length}건 (D-${days} 이내)` : `D-${days} 안에 마감되는 지원금이 없어요`,
      urgent: urgent.slice(0, MAX_RESULTS).map(toBenefit),
      also_open: alsoOpen.slice(0, ALSO_OPEN_LIMIT).map(toBenefit),
      status: status(),
    };
    return body;
  }

  // benefit_detail: /api/benefits/{source}/{id}
  const m = url.pathname.match(/^\/api\/benefits\/([^/]+)\/([^/]+)$/);
  if (m) {
    const source = decodeURIComponent(m[1]);
    if (source !== "보조금24" && source !== "기업마당") throw new HttpError(400, "source는 보조금24 또는 기업마당이에요.");
    const found = await detail(source as BenefitSource, decodeURIComponent(m[2]));
    if (!found) throw new HttpError(404, "지원금을 찾을 수 없어요.");
    return { benefit: toDetail(found), status: status() };
  }

  if (url.pathname === "/api/status") return status();

  throw new HttpError(404, "없는 주소예요.");
}

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS" });
    return res.end();
  }
  if (req.method !== "GET") return send(req, res, 405, { error: "GET만 지원해요." });
  try {
    await startStore();
    const url = new URL(req.url ?? "/", "http://localhost");
    send(req, res, 200, await route(url));
  } catch (e) {
    if (e instanceof HttpError) return send(req, res, e.status, { error: e.message });
    console.error(e);
    send(req, res, 500, { error: "서버 오류가 발생했어요." });
  }
});

server.listen(PORT, () => {
  console.log(`지원금 API 서버: http://localhost:${PORT}`);
  void startStore().then(() => console.log("데이터 상태:", status()));
});
