import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import "./App.css";
import { ClockIcon, HomeIcon, SearchIcon, UserIcon } from "./icons";
import { loadProfile, saveProfile } from "./profile";
import { DeadlineScreen } from "./screens/DeadlineScreen";
import { DetailScreen } from "./screens/DetailScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { SearchScreen } from "./screens/SearchScreen";
import type { Benefit, BenefitSource, Profile } from "./types";

type Tab = "home" | "search" | "deadline" | "profile";

const TABS: { id: Tab; label: string; Icon: () => ReactElement }[] = [
  { id: "home", label: "맞춤", Icon: HomeIcon },
  { id: "search", label: "검색", Icon: SearchIcon },
  { id: "deadline", label: "마감임박", Icon: ClockIcon },
  { id: "profile", label: "내 조건", Icon: UserIcon },
];

function App() {
  const [profile, setProfile] = useState<Profile | null>(loadProfile);
  const [tab, setTab] = useState<Tab>("home");
  const [selected, setSelected] = useState<{ source: BenefitSource; id: string } | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab, selected]);

  function openDetail(b: Benefit) {
    setSelected({ source: b.source, id: b.service_id });
  }

  function handleSaveProfile(p: Profile) {
    saveProfile(p);
    setProfile(p);
    setTab("home");
  }

  if (selected) {
    return (
      <main className="app">
        <DetailScreen source={selected.source} serviceId={selected.id} onBack={() => setSelected(null)} />
      </main>
    );
  }

  return (
    <main className="app has-tabbar">
      {tab === "home" && <HomeScreen profile={profile} onEditProfile={() => setTab("profile")} onSelect={openDetail} />}
      {tab === "search" && <SearchScreen onSelect={openDetail} />}
      {tab === "deadline" && <DeadlineScreen profile={profile} onSelect={openDetail} />}
      {tab === "profile" && <ProfileScreen profile={profile} onSave={handleSaveProfile} />}

      <nav className="tabbar" aria-label="메인 메뉴">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? "on" : ""}
            aria-current={tab === t.id ? "page" : undefined}
            onClick={() => setTab(t.id)}
          >
            <t.Icon />
            {t.label}
          </button>
        ))}
      </nav>
    </main>
  );
}

export default App;
