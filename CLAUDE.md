# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# subsidy-finder (지원금 찾기)

앱인토스(토스 미니앱) 웹 앱. 내 조건(나이·지역·대상)에 맞는 정부·지자체 지원금을 마감 임박순으로 보여준다.
데이터는 보조금24(개인·복지)와 기업마당(기업·소상공인) 공공 API → 자체 서버(`server/`) → 앱(`src/`).

사용자와는 한국어로 대화하고, 코드 주석·UI 문구도 한국어(해요체)로 쓴다.

## 명령어

Windows PowerShell은 실행 정책 때문에 `npm`이 막히므로 **`npm.cmd` / `npx.cmd`** 를 쓴다.

```bash
npm.cmd run server   # 지원금 서버 http://localhost:8787 (--watch, server/.env 자동 로드)
npm.cmd run dev      # 앱 http://localhost:5173 (/api → 8787 프록시, vite.config.ts)
npx.cmd tsc -b       # 타입 검사 (앱 + server/)
npx.cmd oxlint src server
npm.cmd run build    # tsc + vite build + ait build → subsidy-finder.ait
```

테스트 러너는 없다. 바꾼 뒤에는 `tsc -b`, `oxlint`, `build`를 돌리고, 화면 변경은 브라우저에서 모바일 크기(375×812, 작은 폰 320×640)로 확인한다.
서버 로직만 따로 확인할 때는 `server/*.ts`를 직접 import하는 스크립트를 `node`로 실행하고, `globalThis.fetch`를 가짜 응답으로 바꿔 API 변환을 시험한다(키 없이 가능).
서버 API는 `curl "http://localhost:8787/api/benefits?age=29&sido=서울특별시&targets=청년"`처럼 바로 호출해 볼 수 있다.

## 구조

- `src/types.ts` — 앱·서버가 같이 쓰는 타입(`Benefit`, `BenefitDetail`, `Profile`, 응답 형식). 서버는 `../src/types.ts`를 type-only로 가져온다.
- `src/api/benefits.ts` — 서버 호출 함수. 화면은 이 파일만 통해 데이터를 받는다. 배포 시 `VITE_API_BASE_URL`로 서버 주소 지정.
- `src/screens/` — 맞춤(Home), 검색(Search), 마감임박(Deadline), 내 조건(Profile), 상세(Detail). 라우터 없이 `App.tsx`의 상태로 탭/상세를 전환한다.
- `src/useRequest.ts` — key 기반 비동기 요청 훅(로딩·에러·재시도). 새 화면도 이걸 쓴다.
- `src/profile.ts` — 내 조건은 localStorage에만 저장(서버로 보내지 않음, 조회 시 쿼리로만 전달).
- `server/index.ts` — Node 기본 `http` 서버, 외부 의존성 없음. 라우트: `/api/benefits`(맞춤, `q`로 키워드 추가 필터), `/api/search`, `/api/benefits/{source}/{id}`, `/api/briefing`, `/api/status`.
- `server/store.ts` — 두 API 전체 목록을 메모리에 캐시(시작 시 + 6시간마다), 지역·나이·대상·분야 매칭.
- `server/gov24.ts`, `server/bizinfo.ts` — 각 API 응답 → `BenefitRecord` 변환. `server/deadline.ts` — 신청기한 문장 → D-day.
- `server/sample.ts` — 키가 없거나 호출 실패 시 쓰는 샘플 데이터(화면에는 따로 안내하지 않음, `/api/status`로 확인).

### 데이터 흐름에서 놓치기 쉬운 점

- 서버 내부 레코드(`server/record.ts`의 `BenefitRecord`)는 매칭용 `match`(regions, sigungu, ageMin/Max, text)를 갖는다. 응답 전에 `toBenefit`(목록용, 상세 필드도 제거)·`toDetail`로 떼어낸다. 새 필드를 추가하면 `src/types.ts`, 레코드를 만드는 세 곳(`gov24.ts`·`bizinfo.ts`·`sample.ts`), `record.ts`의 제거 목록을 같이 고친다.
- 출처별 상태 `live | sample | error`: 키가 없으면 sample, 호출 실패 시 이전 live 데이터가 있으면 유지하고 없을 때만 error(샘플로 대체). 모든 목록 응답에 `status`가 붙는다.
- 마감 상태 `임박(D-7 이내) | 진행중 | 상시 | 마감 | 확인필요`. 보조금24 신청기한은 대부분 문장이라 날짜가 없으면 상시/확인필요가 되고, D-day가 붙는 건 주로 기업마당이다. 정렬은 D-day 오름차순, 날짜 없는 건 뒤(상시가 확인필요보다 앞).
- 매칭 규칙(`store.ts`): 지역 빈 배열 = 전국. 시군구 사업은 사용자가 시군구를 입력했을 때만 이름 비교. 대상은 `TARGET_WORDS` 단어가 공고 문장에 있는지로 판단. 기업마당은 소상공인이 아니면 창업 분야만 남긴다. 화면의 분야 칩 → 두 API 분야명 매핑은 `CATEGORY_WORDS`.
- `useRequest(key, load)`는 key가 바뀔 때만 다시 요청한다. 요청에 영향을 주는 값(프로필·분야·검색어·토글)은 전부 key에 넣는다(보통 `JSON.stringify([...])`). 맞춤 화면 검색어는 `useDebounced`(300ms)를 거친다.
- `/api` 프록시는 vite 개발 서버에만 있다. 빌드된 앱은 `VITE_API_BASE_URL`이 없으면 같은 출처의 `/api`를 부른다.

## 서버 코드 규칙

- Node 24의 TypeScript 타입 제거로 빌드 없이 실행한다. 그래서 `server/`에서는:
  - import 경로에 **`.ts` 확장자를 붙인다** (`./store.ts`).
  - enum, 생성자 parameter property 등 지울 수 없는 TS 문법 금지(`erasableSyntaxOnly`).
- API 키는 `server/.env`에만 둔다(`GOV24_SERVICE_KEY`, `BIZINFO_API_KEY`, git 제외). `src/`에 키를 넣지 않는다.
- 보조금24 필드명(한글 키)과 기업마당 `jsonArray.item` 구조는 공개 프로젝트·안내 페이지 기준이라 **실제 키로 아직 검증되지 않았다**. 응답이 다르면 `gov24.ts`/`bizinfo.ts`의 `str(...)` 후보 키를 고친다.

## 디자인 규칙 (토스 느낌 디자인 시스템)

- 토큰은 `src/index.css`의 `:root` 변수만 쓴다: `--primary #0064FF`, `--ink #191F28`, `--gray-700 #4E5968`, `--neutral #F2F4F6`, 둥글기 `--rounded-sm/md/lg` 8/16/28px, 간격 `--space-sm/md/lg` 8/16/28px, 좌우 여백 `--gutter`, 앱 폭 `--app-max`.
- 글꼴 Pretendard. 제목 24px·700·-0.4px, 본문 16px·500·1.6.
- **파란색(primary)은 화면당 하단 고정 CTA(`.bottom-cta .btn-primary`) 하나에만.** 칩 선택·스위치·검색 버튼은 잉크색, 보조 행동은 `.link` 텍스트 링크.
- 숫자 강조는 `FinanceCard`(값 크게 + 회색 설명), 항목:값 줄은 `AmountRow`(`components.tsx`).
- 반응형: 기본은 폰 기준, `max-width: 359px`(작은 폰), `max-height: 700px`(짧은 화면), 가로 모드, `min-width: 768px`(목록 2열)을 `App.css` 하단에서 처리. 고정 요소는 `--app-max`와 safe-area 변수를 쓴다.
- 토스 로고·일러스트·슬로건은 쓰지 않는다.

## 참고

- PlayMCP의 지원금봇 MCP는 Claude용 도구라 앱에서 직접 호출할 수 없다. 응답 형식만 참고해 `types.ts`를 맞췄다.
- 화면 왼쪽 위 "AIT" 버튼은 `@apps-in-toss/devtools` 개발용 패널로, 배포 앱에는 없다.
- 외부 링크는 `Device.openURL`(앱인토스)로 열고, 실패하면 `window.open`으로 대신한다.
