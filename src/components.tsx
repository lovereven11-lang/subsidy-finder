import type { ReactNode } from "react";
import type { Benefit } from "./types";

export function DdayBadge({ benefit }: { benefit: Benefit }) {
  const { dday, deadline_status } = benefit;
  if (deadline_status === "상시") return <span className="badge badge-gray">상시</span>;
  if (deadline_status === "마감") return <span className="badge badge-gray">마감</span>;
  if (deadline_status === "확인필요") return <span className="badge badge-gray">기간 확인</span>;
  const label = dday === 0 ? "D-DAY" : `D-${dday}`;
  return <span className={`badge ${deadline_status === "임박" ? "badge-red" : "badge-blue"}`}>{label}</span>;
}

export function BenefitCard({ benefit, onClick }: { benefit: Benefit; onClick: () => void }) {
  return (
    <button type="button" className="benefit-card" onClick={onClick}>
      <div className="benefit-card-top">
        <DdayBadge benefit={benefit} />
        <span className="benefit-card-meta">
          {benefit.category} · {benefit.agency}
        </span>
      </div>
      <p className="benefit-card-title">{benefit.name}</p>
      {benefit.summary && <p className="benefit-card-summary">{benefit.summary}</p>}
    </button>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="empty" role="alert">
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn-text" onClick={onRetry}>
          다시 시도
        </button>
      )}
    </div>
  );
}

export function BenefitList({
  items,
  loading,
  error,
  onRetry,
  empty,
  onSelect,
}: {
  items: Benefit[];
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
  empty: ReactNode;
  onSelect: (b: Benefit) => void;
}) {
  if (loading) {
    return (
      <div className="list">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton" />
        ))}
      </div>
    );
  }
  if (error) return <ErrorBox message={error} onRetry={onRetry} />;
  if (items.length === 0) return empty ? <div className="empty">{empty}</div> : null;
  return (
    <div className="list">
      {items.map((b) => (
        <BenefitCard key={`${b.source}:${b.service_id}`} benefit={b} onClick={() => onSelect(b)} />
      ))}
    </div>
  );
}

// 한 카드에 숫자 하나: 값은 크게, 설명은 아래 회색
export function FinanceCard({
  label,
  value,
  desc,
  tone,
}: {
  label: string;
  value: ReactNode;
  desc?: ReactNode;
  tone?: "accent" | "danger";
}) {
  return (
    <div className="finance-card">
      <span className="finance-card-label">{label}</span>
      <span className={`finance-card-value ${tone ?? ""}`}>{value}</span>
      {desc && <p className="finance-card-desc">{desc}</p>}
    </div>
  );
}

// 항목명 왼쪽, 값 오른쪽 끝
export function AmountRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="amount-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function ChipGroup({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="chips">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          className={`chip ${selected.includes(o) ? "chip-on" : ""}`}
          aria-pressed={selected.includes(o)}
          onClick={() => onToggle(o)}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}
