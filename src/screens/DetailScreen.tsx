import { Device } from "@apps-in-toss/web-framework";
import { DISCLAIMER, getBenefitDetail } from "../api/benefits";
import { AmountRow, DdayBadge, ErrorBox, FinanceCard } from "../components";
import { BackIcon } from "../icons";
import type { BenefitDetail, BenefitSource } from "../types";
import { useRequest } from "../useRequest";

async function openOriginal(url: string) {
  try {
    await Device.openURL(url);
  } catch {
    // 토스 앱 밖(PC 브라우저 개발 환경)에서는 새 창으로 연다.
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

function deadlineCard(d: BenefitDetail) {
  switch (d.deadline_status) {
    case "상시":
      return { value: "상시 접수", desc: "언제든 신청할 수 있어요", tone: "accent" as const };
    case "마감":
      return { value: "마감", desc: "신청 기간이 끝났어요" };
    case "확인필요":
      return { value: "기간 확인", desc: d.apply_period };
    default:
      return {
        value: d.dday === 0 ? "오늘 마감" : `D-${d.dday}`,
        desc: d.deadline_status === "임박" ? "곧 마감돼요. 서둘러 신청하세요" : "마감까지 남은 기간이에요",
        tone: d.deadline_status === "임박" ? ("danger" as const) : ("accent" as const),
      };
  }
}

export function DetailScreen({
  source,
  serviceId,
  onBack,
}: {
  source: BenefitSource;
  serviceId: string;
  onBack: () => void;
}) {
  const { data: detail, loading, error, retry } = useRequest(`${source}:${serviceId}`, () =>
    getBenefitDetail(source, serviceId),
  );

  const sections: [string, string | undefined][] = detail
    ? [
        ["지원 내용", detail.support],
        ["지원 대상", detail.target],
        ["선정 기준", detail.criteria],
        ["신청 방법", detail.apply_method],
        ["구비 서류", detail.documents],
        ["문의", detail.contact],
      ]
    : [];

  return (
    <section className="screen detail">
      <button type="button" className="back" onClick={onBack} aria-label="뒤로 가기">
        <BackIcon />
      </button>

      {loading && <div className="skeleton tall" />}

      {error && <ErrorBox message={error} onRetry={retry} />}

      {detail && (
        <>
          <header className="screen-header">
            <div className="detail-badges">
              <DdayBadge benefit={detail} />
              <span className="badge badge-gray">{detail.category}</span>
            </div>
            <h1 className="title">{detail.name}</h1>
            {detail.summary && <p className="subtitle">{detail.summary}</p>}
          </header>

          <FinanceCard label="신청 마감" {...deadlineCard(detail)} />

          <dl className="rows">
            <AmountRow label="신청 기간" value={detail.apply_period} />
            <AmountRow label="소관 기관" value={detail.agency} />
            <AmountRow label="출처" value={detail.source} />
          </dl>

          {sections
            .filter(([, text]) => text)
            .map(([heading, text]) => (
              <div key={heading} className="text-section">
                <h2>{heading}</h2>
                <p>{text}</p>
              </div>
            ))}

          <p className="disclaimer">{DISCLAIMER}</p>

          <div className="bottom-cta">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => openOriginal(detail.apply_url || detail.detail_url)}
            >
              {detail.apply_url ? "온라인으로 신청하기" : "원문 보고 신청하기"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
