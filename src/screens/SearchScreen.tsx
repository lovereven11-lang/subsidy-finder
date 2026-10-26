import { useState } from "react";
import type { FormEvent } from "react";
import { searchBenefits } from "../api/benefits";
import { BenefitList, Toggle } from "../components";
import type { Benefit } from "../types";
import { useRequest } from "../useRequest";

const SUGGESTIONS = ["청년 월세", "소상공인 대출", "창업", "부모급여", "구직", "교육"];

export function SearchScreen({ onSelect }: { onSelect: (b: Benefit) => void }) {
  const [keyword, setKeyword] = useState("");
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [searched, setSearched] = useState<string | null>(null);
  const { data, loading, error, retry } = useRequest(searched === null ? null : JSON.stringify([searched, onlyOpen]), () =>
    searchBenefits(searched!, onlyOpen),
  );

  function run(word: string) {
    const q = word.trim();
    if (!q) return;
    setKeyword(q);
    setSearched(q);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    run(keyword);
  }

  return (
    <section className="screen">
      <header className="screen-header">
        <h1 className="title">지원금 검색</h1>
        <p className="subtitle">내 조건과 상관없이 키워드로 찾아봐요.</p>
      </header>

      <form className="search-bar" onSubmit={onSubmit} role="search">
        <input
          type="search"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="예: 청년 월세, 전기차 보조금"
          aria-label="검색어"
          enterKeyHint="search"
        />
        <button type="submit" className="search-submit" disabled={!keyword.trim()}>
          검색
        </button>
      </form>

      {searched === null ? (
        <div className="suggest">
          <p className="section-label">이런 검색어는 어때요?</p>
          <div className="chips">
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" className="chip" onClick={() => run(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="list-toolbar">
            <span className="count">{loading ? "검색 중..." : data ? `'${searched}' ${data.count}건` : ""}</span>
            <Toggle checked={onlyOpen} onChange={setOnlyOpen} label="접수 중만" />
          </div>
          <BenefitList
            items={data?.benefits ?? []}
            loading={loading}
            error={error}
            onRetry={retry}
            onSelect={onSelect}
            empty={
              <>
                <p>'{searched}' 검색 결과가 없어요.</p>
                <p className="muted">다른 단어로 검색하거나 '접수 중만'을 꺼 보세요.</p>
              </>
            }
          />
        </>
      )}
    </section>
  );
}
