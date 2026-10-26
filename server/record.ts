import type { BenefitDetail } from "../src/types.ts";

// 서버 안에서만 쓰는 지원금 레코드. 화면에 보내기 전에 매칭용 필드는 떼어낸다.
export interface BenefitRecord extends BenefitDetail {
  match: {
    // 시/도 이름(정식 명칭). 빈 배열이면 전국 대상.
    regions: string[];
    // 시/군/구 단위 사업이면 그 이름 (예: "안양시")
    sigungu: string | null;
    ageMin: number | null;
    ageMax: number | null;
    // 검색·대상 매칭에 쓰는 전체 텍스트
    text: string;
  };
}

export function toDetail(r: BenefitRecord): BenefitDetail {
  const { match: _match, ...detail } = r;
  return detail;
}

export function toBenefit(r: BenefitRecord) {
  const { match: _m, support: _s, contact: _c, criteria: _cr, documents: _d, apply_url: _u, ...benefit } = r;
  return benefit;
}
