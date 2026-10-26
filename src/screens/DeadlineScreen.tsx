import { useState } from "react";
import { getDeadlineBriefing } from "../api/benefits";
import { BenefitList, FinanceCard } from "../components";
import type { Benefit, Profile } from "../types";
import { useRequest } from "../useRequest";

const DAY_OPTIONS = [7, 14, 30];

export function DeadlineScreen({ profile, onSelect }: { profile: Profile | null; onSelect: (b: Benefit) => void }) {
  const [days, setDays] = useState(14);
  const { data: briefing, loading, error, retry } = useRequest(JSON.stringify([profile, days]), () =>
    getDeadlineBriefing(profile, days),
  );

  return (
    <section className="screen">
      <header className="screen-header">
        <h1 className="title">마감 임박</h1>
        <p className="subtitle">
          {profile ? "내 조건에 맞는 지원금 중 " : "전체 지원금 중 "}
          마감이 가까운 순서로 모았어요.
        </p>
      </header>

      <div className="segmented" role="tablist" aria-label="마감 기준">
        {DAY_OPTIONS.map((d) => (
          <button
            key={d}
            type="button"
            role="tab"
            aria-selected={days === d}
            className={days === d ? "on" : ""}
            onClick={() => setDays(d)}
          >
            D-{d} 이내
          </button>
        ))}
      </div>

      <FinanceCard
        label={`D-${days} 안에 마감되는 지원금`}
        value={loading || !briefing ? "—" : `${briefing.urgent.length}건`}
        tone={briefing && briefing.urgent.length > 0 ? "danger" : undefined}
        desc={
          briefing && briefing.urgent.length === 0
            ? "기간을 늘리거나 상시 접수 지원금을 확인해 보세요"
            : "놓치기 전에 신청 기간을 확인하세요"
        }
      />

      <BenefitList
        items={briefing?.urgent ?? []}
        loading={loading}
        error={error}
        onRetry={retry}
        onSelect={onSelect}
        empty={null}
      />

      {briefing && briefing.also_open.length > 0 && (
        <>
          <p className="section-label">언제든 신청할 수 있어요</p>
          <BenefitList items={briefing.also_open} loading={false} onSelect={onSelect} empty={null} />
        </>
      )}
    </section>
  );
}
