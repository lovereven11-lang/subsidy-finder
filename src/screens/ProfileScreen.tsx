import { useState } from "react";
import { ChipGroup } from "../components";
import { INTEREST_OPTIONS, SIDO_LIST, TARGET_OPTIONS } from "../profile";
import type { Profile } from "../types";

const EMPTY: Profile = { age: null, region_sido: "", region_sigungu: "", targets: [], interests: [] };

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function ProfileScreen({ profile, onSave }: { profile: Profile | null; onSave: (p: Profile) => void }) {
  const [draft, setDraft] = useState<Profile>(profile ?? EMPTY);
  const [ageText, setAgeText] = useState(profile?.age != null ? String(profile.age) : "");

  const canSave = draft.region_sido !== "" && draft.targets.length > 0;

  function save() {
    const age = ageText.trim() === "" ? null : Number(ageText);
    onSave({ ...draft, age: Number.isFinite(age) ? age : null, region_sigungu: draft.region_sigungu.trim() });
  }

  return (
    <section className="screen">
      <header className="screen-header">
        <h1 className="title">내 조건</h1>
        <p className="subtitle">입력한 조건으로 받을 수 있는 지원금만 골라 드려요. 정보는 이 기기에만 저장돼요.</p>
      </header>

      <div className="form">
        <label className="field">
          <span className="field-label">나이 (만)</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={120}
            placeholder="예: 29"
            value={ageText}
            onChange={(e) => setAgeText(e.target.value.replace(/[^0-9]/g, ""))}
          />
        </label>

        <label className="field">
          <span className="field-label">
            사는 곳 (시·도) <em>필수</em>
          </span>
          <select value={draft.region_sido} onChange={(e) => setDraft({ ...draft, region_sido: e.target.value })}>
            <option value="">선택해 주세요</option>
            {SIDO_LIST.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">시·군·구</span>
          <input
            type="text"
            placeholder="예: 강남구, 성남시"
            value={draft.region_sigungu}
            onChange={(e) => setDraft({ ...draft, region_sigungu: e.target.value })}
          />
        </label>

        <div className="field">
          <span className="field-label">
            나는 이런 상황이에요 <em>필수 · 여러 개 선택</em>
          </span>
          <ChipGroup
            options={TARGET_OPTIONS}
            selected={draft.targets}
            onToggle={(v) => setDraft({ ...draft, targets: toggle(draft.targets, v) })}
          />
        </div>

        <div className="field">
          <span className="field-label">관심 분야</span>
          <ChipGroup
            options={INTEREST_OPTIONS}
            selected={draft.interests}
            onToggle={(v) => setDraft({ ...draft, interests: toggle(draft.interests, v) })}
          />
        </div>
      </div>

      <div className="bottom-cta">
        <button type="button" className="btn btn-primary" disabled={!canSave} onClick={save}>
          {profile ? "조건 저장하기" : "저장하고 지원금 찾기"}
        </button>
      </div>
    </section>
  );
}
