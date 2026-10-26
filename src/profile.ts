import type { Profile } from "./types";

const KEY = "subsidy-finder:profile";

export const SIDO_LIST = [
  "서울특별시",
  "부산광역시",
  "대구광역시",
  "인천광역시",
  "광주광역시",
  "대전광역시",
  "울산광역시",
  "세종특별자치시",
  "경기도",
  "강원특별자치도",
  "충청북도",
  "충청남도",
  "전북특별자치도",
  "전라남도",
  "경상북도",
  "경상남도",
  "제주특별자치도",
];

export const TARGET_OPTIONS = ["청년", "소상공인", "육아", "신혼", "고령", "구직"];

export const INTEREST_OPTIONS = ["금융", "창업", "주거", "교육", "기술", "고용", "건강", "육아", "생활안정"];

export function loadProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

export function saveProfile(profile: Profile): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    // 저장소를 못 쓰는 환경이면 이번 실행 동안만 메모리에 유지된다.
  }
}

export function describeProfile(p: Profile): string {
  const parts = [
    p.age !== null ? `만 ${p.age}세` : null,
    [p.region_sido, p.region_sigungu].filter(Boolean).join(" ") || null,
    p.targets.length > 0 ? p.targets.join("·") : null,
  ];
  return parts.filter(Boolean).join(" · ");
}
