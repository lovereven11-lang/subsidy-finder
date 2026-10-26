// 시/도 정식 명칭과, 공고·기관명에 흔히 쓰이는 줄임말
export const SIDO: { name: string; aliases: string[] }[] = [
  { name: "서울특별시", aliases: ["서울"] },
  { name: "부산광역시", aliases: ["부산"] },
  { name: "대구광역시", aliases: ["대구"] },
  { name: "인천광역시", aliases: ["인천"] },
  { name: "광주광역시", aliases: ["광주", "전남광주"] },
  { name: "대전광역시", aliases: ["대전"] },
  { name: "울산광역시", aliases: ["울산"] },
  { name: "세종특별자치시", aliases: ["세종"] },
  { name: "경기도", aliases: ["경기"] },
  { name: "강원특별자치도", aliases: ["강원", "강원도"] },
  { name: "충청북도", aliases: ["충북"] },
  { name: "충청남도", aliases: ["충남"] },
  { name: "전북특별자치도", aliases: ["전북", "전라북도"] },
  { name: "전라남도", aliases: ["전남", "전남광주"] },
  { name: "경상북도", aliases: ["경북"] },
  { name: "경상남도", aliases: ["경남"] },
  { name: "제주특별자치도", aliases: ["제주", "제주도"] },
];

// 기관명("경기도 안양시", "서울특별시 강남구")의 앞부분으로 시/도를 찾는다.
export function sidoFromAgency(agency: string): string | null {
  const head = agency.trim().split(/\s+/)[0] ?? "";
  for (const s of SIDO) {
    if (head === s.name || s.aliases.includes(head)) return s.name;
  }
  return null;
}

// 해시태그 목록("내수,대전,세종,...")에서 언급된 시/도를 모두 찾는다.
export function sidoFromTags(tags: string[]): string[] {
  const found = new Set<string>();
  for (const t of tags) {
    for (const s of SIDO) {
      if (t === s.name || s.aliases.includes(t)) found.add(s.name);
    }
  }
  return [...found];
}
