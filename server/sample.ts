import { formatDate, parseDeadline, todayKst } from "./deadline.ts";
import type { BenefitRecord } from "./record.ts";
import type { BenefitSource } from "../src/types.ts";

// API 키가 없거나 호출에 실패했을 때 화면을 확인할 수 있도록 보여주는 샘플.
// 마감일은 오늘 기준 며칠 뒤로 잡아 항상 "진행중"처럼 보이게 한다.
interface Seed {
  id: string;
  source: BenefitSource;
  name: string;
  summary: string;
  category: string;
  agency: string;
  target: string;
  support: string;
  apply_method: string;
  contact: string;
  url: string;
  endOffset: number | null; // null이면 상시
  regions: string[];
  keywords: string;
  ageMin?: number;
  ageMax?: number;
}

const SEEDS: Seed[] = [
  {
    id: "SAMPLE-W1",
    source: "보조금24",
    name: "청년월세 한시 특별지원",
    summary: "부모와 떨어져 사는 무주택 청년에게 월세를 월 최대 20만원씩 12개월 지원해요.",
    category: "주거·자립",
    agency: "국토교통부",
    target: "만 19~34세, 부모와 별도 거주하는 무주택 청년 (중위소득 60% 이하)",
    support: "월 최대 20만원, 최대 12개월 (총 240만원)",
    apply_method: "복지로 온라인 신청 또는 주민센터 방문",
    contact: "마이홈 콜센터 1600-1004",
    url: "https://www.gov.kr/portal/rcvfvrSvc/main",
    endOffset: 5,
    regions: [],
    keywords: "청년 주거 월세",
    ageMin: 19,
    ageMax: 34,
  },
  {
    id: "SAMPLE-W2",
    source: "보조금24",
    name: "서울시 청년 마음건강 지원사업",
    summary: "심리상담이 필요한 서울 거주 청년에게 전문 상담을 무료로 제공해요.",
    category: "보건·의료",
    agency: "서울특별시",
    target: "서울시 거주 만 19~39세 청년",
    support: "1:1 전문 심리상담 최대 10회 무료",
    apply_method: "서울시 청년몽땅정보통 온라인 신청",
    contact: "120 다산콜센터",
    url: "https://youth.seoul.go.kr",
    endOffset: 12,
    regions: ["서울특별시"],
    keywords: "청년 건강 상담",
    ageMin: 19,
    ageMax: 39,
  },
  {
    id: "SAMPLE-W3",
    source: "보조금24",
    name: "부모급여",
    summary: "만 0~1세 아동을 키우는 가정에 매월 현금을 지원해요.",
    category: "임신·출산",
    agency: "보건복지부",
    target: "만 0~1세 아동을 양육하는 부모",
    support: "만 0세 월 100만원, 만 1세 월 50만원",
    apply_method: "복지로 온라인 신청 또는 주민센터 방문",
    contact: "보건복지상담센터 129",
    url: "https://www.bokjiro.go.kr",
    endOffset: null,
    regions: [],
    keywords: "육아 아동 영아 출산 신혼",
  },
  {
    id: "SAMPLE-W4",
    source: "보조금24",
    name: "신혼부부 전세자금 대출 이자 지원",
    summary: "신혼부부의 전세자금 대출 이자 일부를 지원해 주거비 부담을 덜어줘요.",
    category: "주거·자립",
    agency: "경기도",
    target: "혼인 7년 이내 경기도 거주 무주택 신혼부부",
    support: "대출 잔액의 연 최대 1.2%p 이자 지원 (최대 2년)",
    apply_method: "경기도 주거복지포털 온라인 신청",
    contact: "경기도 주택정책과",
    url: "https://www.gg.go.kr",
    endOffset: 20,
    regions: ["경기도"],
    keywords: "신혼 혼인 전세 대출 금융",
  },
  {
    id: "SAMPLE-W5",
    source: "보조금24",
    name: "국민취업지원제도 구직촉진수당",
    summary: "취업을 준비하는 구직자에게 취업지원 서비스와 생활 지원 수당을 줘요.",
    category: "고용·창업",
    agency: "고용노동부",
    target: "만 15~69세 구직자 (가구 중위소득 60% 이하)",
    support: "월 50만원 x 6개월 + 부양가족 1인당 10만원 추가",
    apply_method: "고용24 온라인 신청 또는 고용센터 방문",
    contact: "고용노동부 고객상담센터 1350",
    url: "https://www.work24.go.kr",
    endOffset: null,
    regions: [],
    keywords: "구직 취업 실업 청년",
    ageMin: 15,
    ageMax: 69,
  },
  {
    id: "SAMPLE-W6",
    source: "보조금24",
    name: "기초연금",
    summary: "만 65세 이상 소득 하위 70% 어르신께 매월 연금을 드려요.",
    category: "생활안정",
    agency: "보건복지부",
    target: "만 65세 이상, 소득인정액이 선정기준액 이하인 어르신",
    support: "월 최대 약 34만원 (단독가구 기준)",
    apply_method: "주민센터 또는 국민연금공단 지사 방문, 복지로 온라인 신청",
    contact: "국민연금공단 1355",
    url: "https://basicpension.mohw.go.kr",
    endOffset: null,
    regions: [],
    keywords: "고령 노인 어르신 연금",
    ageMin: 65,
  },
  {
    id: "SAMPLE-B1",
    source: "기업마당",
    name: "소상공인 스마트상점 기술보급 사업",
    summary: "키오스크·서빙로봇 등 스마트기술 도입 비용을 최대 70%까지 지원해요.",
    category: "기술",
    agency: "중소벤처기업부",
    target: "소상공인",
    support: "기술 도입비의 70%, 최대 500만원",
    apply_method: "소상공인24 온라인 접수",
    contact: "소상공인시장진흥공단 1533-0100",
    url: "https://www.bizinfo.go.kr",
    endOffset: 1,
    regions: [],
    keywords: "소상공인 기술 스마트",
  },
  {
    id: "SAMPLE-B2",
    source: "기업마당",
    name: "예비창업패키지 추가 모집",
    summary: "혁신적인 아이디어를 가진 예비창업자에게 사업화 자금과 교육을 지원해요.",
    category: "창업",
    agency: "중소벤처기업부",
    target: "사업자 등록이 없는 예비창업자",
    support: "사업화 자금 최대 1억원 + 창업 교육·멘토링",
    apply_method: "K-Startup 온라인 접수",
    contact: "창업진흥원 1357",
    url: "https://www.k-startup.go.kr",
    endOffset: 9,
    regions: [],
    keywords: "창업 예비창업자 청년",
  },
  {
    id: "SAMPLE-B3",
    source: "기업마당",
    name: "소상공인 정책자금 (일반경영안정자금)",
    summary: "경영 애로를 겪는 소상공인에게 저금리 운영자금을 직접 대출해줘요.",
    category: "금융",
    agency: "중소벤처기업부",
    target: "상시근로자 5인 미만 소상공인",
    support: "업체당 최대 7천만원, 정책자금 기준금리 적용",
    apply_method: "소상공인정책자금 누리집 온라인 신청",
    contact: "소상공인시장진흥공단 1533-0100",
    url: "https://ols.semas.or.kr",
    endOffset: 30,
    regions: [],
    keywords: "소상공인 대출 금융 자금",
  },
  {
    id: "SAMPLE-B4",
    source: "기업마당",
    name: "[서울] 청년 창업 공간 입주기업 모집",
    summary: "서울 청년 창업가에게 사무 공간과 투자 연계 프로그램을 제공해요.",
    category: "창업",
    agency: "서울특별시",
    target: "서울 소재 창업 3년 이내 청년 기업",
    support: "사무공간 최대 2년 무상 입주, 투자 IR·멘토링",
    apply_method: "서울창업허브 온라인 접수",
    contact: "서울경제진흥원",
    url: "https://seoulstartuphub.com",
    endOffset: 3,
    regions: ["서울특별시"],
    keywords: "청년 창업 소상공인",
  },
];

const DAY = 24 * 60 * 60 * 1000;

export function sampleRecords(source: BenefitSource): BenefitRecord[] {
  const base = todayKst().getTime();
  return SEEDS.filter((s) => s.source === source).map((s) => {
    const period =
      s.endOffset === null
        ? "상시신청"
        : `${formatDate(new Date(base - 20 * DAY))} ~ ${formatDate(new Date(base + s.endOffset * DAY))}`;
    return {
      service_id: s.id,
      name: s.name,
      summary: s.summary,
      category: s.category,
      agency: s.agency,
      target: s.target,
      support: s.support,
      apply_method: s.apply_method,
      contact: s.contact,
      detail_url: s.url,
      source: s.source,
      ...parseDeadline(period),
      match: {
        regions: s.regions,
        sigungu: null,
        ageMin: s.ageMin ?? null,
        ageMax: s.ageMax ?? null,
        text: [s.name, s.summary, s.target, s.keywords].join(" "),
      },
    };
  });
}
