export type BenefitSource = "보조금24" | "기업마당";

// 확인필요: 신청기한이 "연초 공고에 따름"처럼 날짜가 아닌 문장이라 마감일을 알 수 없는 경우
export type DeadlineStatus = "임박" | "진행중" | "상시" | "마감" | "확인필요";

export interface Benefit {
  service_id: string;
  name: string;
  summary: string;
  category: string;
  agency: string;
  target: string;
  apply_period: string;
  apply_method: string;
  detail_url: string;
  source: BenefitSource;
  dday: number | null;
  deadline_status: DeadlineStatus;
}

export interface BenefitDetail extends Benefit {
  support: string;
  contact: string;
  criteria?: string;
  documents?: string;
  apply_url?: string;
}

export interface Profile {
  age: number | null;
  region_sido: string;
  region_sigungu: string;
  targets: string[];
  interests: string[];
}

// live: 실제 API 데이터 / sample: API 키가 없어 샘플 데이터 / error: API 호출 실패로 샘플 데이터
export type SourceState = "live" | "sample" | "error";

export interface SourceStatus {
  보조금24: SourceState;
  기업마당: SourceState;
  updated_at: string | null;
}

export interface BenefitListResponse {
  count: number;
  benefits: Benefit[];
  status: SourceStatus;
}

export interface DeadlineBriefing {
  briefing_date: string;
  headline: string;
  urgent: Benefit[];
  also_open: Benefit[];
  status: SourceStatus;
}
