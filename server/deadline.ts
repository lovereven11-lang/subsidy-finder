import type { DeadlineStatus } from "../src/types.ts";

const DAY = 24 * 60 * 60 * 1000;
export const URGENT_DAYS = 7;

export function todayKst(): Date {
  // 서버가 어느 시간대에서 돌든 한국 날짜 기준으로 D-day를 센다.
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// "20261014", "2026-10-14", "2026.10.14", "2026. 10. 14" 같은 날짜를 모두 찾는다.
const DATE_RE = /(20\d{2})[.\-/년\s]*?(\d{1,2})[.\-/월\s]*?(\d{1,2})/g;

function findDates(text: string): Date[] {
  const dates: Date[] = [];
  for (const m of text.matchAll(DATE_RE)) {
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (mo < 1 || mo > 12 || d < 1 || d > 31) continue;
    dates.push(new Date(Date.UTC(y, mo - 1, d)));
  }
  return dates;
}

export interface Deadline {
  apply_period: string;
  dday: number | null;
  deadline_status: DeadlineStatus;
}

export function parseDeadline(raw: string | null | undefined): Deadline {
  const text = (raw ?? "").replace(/\s+/g, " ").trim();
  if (!text) return { apply_period: "기간 정보 없음", dday: null, deadline_status: "확인필요" };

  const dates = findDates(text);
  if (dates.length === 0) {
    const always = /상시|연중|수시/.test(text);
    return { apply_period: text, dday: null, deadline_status: always ? "상시" : "확인필요" };
  }

  const end = dates[dates.length - 1];
  const dday = Math.round((end.getTime() - todayKst().getTime()) / DAY);
  const period =
    dates.length >= 2 ? `${formatDate(dates[0])} ~ ${formatDate(end)}` : `~ ${formatDate(end)}`;
  const deadline_status: DeadlineStatus = dday < 0 ? "마감" : dday <= URGENT_DAYS ? "임박" : "진행중";
  return { apply_period: period, dday, deadline_status };
}
