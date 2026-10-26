import { useState } from "react";
import { findBenefits } from "../api/benefits";
import { BenefitList, FinanceCard, Toggle } from "../components";
import { SearchIcon } from "../icons";
import { describeProfile } from "../profile";
import type { Benefit, Profile } from "../types";
import { useDebounced } from "../useDebounced";
import { useRequest } from "../useRequest";

const CATEGORIES = ["전체", "금융", "주거", "창업", "고용", "교육", "육아", "기술", "건강"];

export function HomeScreen({
  profile,
  onEditProfile,
  onSelect,
}: {
  profile: Profile | null;
  onEditProfile: () => void;
  onSelect: (b: Benefit) => void;
}) {
  const [category, setCategory] = useState("전체");
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [input, setInput] = useState("");
  const keyword = useDebounced(input.trim());
  const chip = category === "전체" ? "" : category;
  const { data, loading, error, retry } = useRequest(
    profile ? JSON.stringify([profile, chip, keyword, onlyOpen]) : null,
    () => findBenefits(profile!, { category: chip, keyword, onlyOpen }),
  );

  if (!profile) {
    return (
      <section className="screen">
        <header className="hero">
          <h1 className="display">
            받을 수 있는
            <br />
            지원금,
            <br />
            한 번에
          </h1>
          <p className="subtitle">나이와 지역, 상황만 알려주시면 정부·지자체 지원금을 찾아드려요.</p>
        </header>
        <ol className="feature-list">
          <li>
            <span className="feature-num">1</span>
            <span>
              <strong>내 조건</strong>을 한 번만 입력하면
            </span>
          </li>
          <li>
            <span className="feature-num">2</span>
            <span>
              보조금24·기업마당 지원금을 <strong>마감 임박순</strong>으로
            </span>
          </li>
          <li>
            <span className="feature-num">3</span>
            <span>
              신청 방법과 원문까지 <strong>한 화면</strong>에서
            </span>
          </li>
        </ol>
        <div className="bottom-cta">
          <button type="button" className="btn btn-primary" onClick={onEditProfile}>
            내 조건 등록하고 시작하기
          </button>
        </div>
      </section>
    );
  }

  const items = data?.benefits ?? [];
  const urgentCount = items.filter((b) => b.deadline_status === "임박").length;

  return (
    <section className="screen">
      <header className="screen-header">
        <h1 className="title">맞춤 지원금</h1>
        <div className="profile-line">
          <span>{describeProfile(profile) || "조건 미입력"}</span>
          <button type="button" className="link" onClick={onEditProfile}>
            조건 수정
          </button>
        </div>
      </header>

      <form className="search-bar" role="search" onSubmit={(e) => e.preventDefault()}>
        <SearchIcon />
        <input
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="내 지원금에서 검색 (예: 월세, 대출)"
          aria-label="맞춤 지원금 검색어"
          enterKeyHint="search"
        />
        {input && (
          <button type="button" className="search-clear" onClick={() => setInput("")} aria-label="검색어 지우기">
            ✕
          </button>
        )}
      </form>

      <FinanceCard
        label={
          keyword
            ? `'${keyword}' 검색 결과`
            : chip
              ? `${chip} 분야에서 신청할 수 있는 지원금`
              : "지금 신청할 수 있는 지원금"
        }
        value={loading || !data ? "—" : `${data.count.toLocaleString()}건`}
        tone="accent"
        desc={data && urgentCount > 0 ? `이 중 ${urgentCount}건은 7일 안에 마감돼요` : "마감이 가까운 순서로 보여드려요"}
      />

      <div className="chips chips-scroll">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            className={`chip ${category === c ? "chip-on" : ""}`}
            aria-pressed={category === c}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="list-toolbar">
        <span className="count">{loading ? "찾는 중..." : "마감 임박순"}</span>
        <Toggle checked={onlyOpen} onChange={setOnlyOpen} label="접수 중만" />
      </div>

      <BenefitList
        items={items}
        loading={loading}
        error={error}
        onRetry={retry}
        onSelect={onSelect}
        empty={
          keyword ? (
            <>
              <p>'{keyword}'에 맞는 지원금이 없어요.</p>
              <p className="muted">다른 단어로 찾아보거나, 검색 탭에서 전체 지원금을 찾아보세요.</p>
            </>
          ) : (
            <>
              <p>조건에 맞는 지원금이 없어요.</p>
              <p className="muted">분야를 바꾸거나 내 조건을 수정해 보세요.</p>
            </>
          )
        }
      />
    </section>
  );
}
