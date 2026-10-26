# subsidy-finder (지원금 찾기)

내 조건에 맞는 정부·지자체 지원금을 마감 임박순으로 보여주는 앱인토스 미니앱이에요.
데이터는 보조금24(개인·복지)와 기업마당(기업·소상공인) 공공 API에서 가져와요.

```
앱 화면 (src/)  →  지원금 서버 (server/, API 키 보관)  →  보조금24 API / 기업마당 API
```

## 실행

터미널 두 개에서 각각 실행해요. (Windows PowerShell에서는 `npm` 대신 `npm.cmd`)

```bash
npm run server   # 지원금 서버 http://localhost:8787
npm run dev      # 앱 화면 http://localhost:5173 (/api 요청은 서버로 넘겨줘요)
```

API 키가 없어도 샘플 데이터로 화면을 확인할 수 있어요. 이때 화면 위쪽에 "샘플 데이터" 안내가 떠요.

## API 키 설정

1. `server/.env.example`을 복사해 `server/.env`로 저장해요.
2. 아래 두 곳에서 키를 발급받아 채워요.
   - `GOV24_SERVICE_KEY`: 공공데이터포털 [행정안전부_대한민국 공공서비스(혜택) 정보](https://www.data.go.kr/data/15113968/openapi.do) 활용신청 → 마이페이지의 **일반 인증키(Decoding)**
   - `BIZINFO_API_KEY`: 기업마당 [지원사업정보 API](https://www.bizinfo.go.kr/apiDetail.do?id=bizinfoApi) 사용신청 → 발급된 인증키
3. 서버를 다시 시작하면 터미널에 `[보조금24] N건 불러옴`처럼 표시돼요.

`server/.env`는 git에 올라가지 않아요. 키를 앱 코드(src/)에 넣지 마세요. 앱 번들은 누구나 열어볼 수 있어요.

## 서버 API

| 주소 | 지원금봇 도구 | 설명 |
|---|---|---|
| `GET /api/benefits?age=&sido=&sigungu=&targets=청년,구직&category=&onlyOpen=` | find_benefits | 내 조건에 맞는 지원금, 마감 임박순 |
| `GET /api/search?q=&onlyOpen=` | search_benefits | 키워드 검색 |
| `GET /api/benefits/{보조금24\|기업마당}/{id}` | benefit_detail | 상세 (보조금24는 구비서류·온라인 신청 주소 추가 조회) |
| `GET /api/briefing?days=14&...내 조건` | deadline_briefing | D-n 이내 마감 + 상시 접수 |
| `GET /api/status` | | 출처별 상태 (live / sample / error) |

- 서버는 시작할 때와 6시간마다 두 API 전체 목록을 받아 메모리에 두고 거기서 걸러요.
- 보조금24의 신청기한은 대부분 "상시신청", "연초 공고에 따름" 같은 문장이라, 날짜가 없으면 "상시" 또는 "기간 확인"으로 표시해요.
- 나이는 보조금24 지원조건(JA0110~JA0111)으로, 대상(청년·육아 등)은 공고 문장 속 단어로 걸러요. 기업마당은 지역 해시태그와 분야로만 걸러서 정확도가 낮을 수 있어요.

## 배포

- 서버: Node.js 22.18 이상이 돌아가는 곳(Render, Railway, Fly.io, 직접 운영 서버 등)에 `server/`를 올리고 환경변수로 키를 넣어요. 실행 명령은 `node server/index.ts`예요.
- 앱: `.env.production`에 `VITE_API_BASE_URL=https://내-서버-주소`를 넣고 `npm run build` → `npm run deploy`.
- 서버 주소가 정해지면 `ALLOWED_ORIGINS`에 앱 주소를 넣어 다른 곳에서의 호출을 막을 수 있어요.
- 앱인토스에서 외부 서버를 부를 때의 규칙(HTTPS, 도메인 등록 등)은 [앱인토스 개발자센터](https://developers-apps-in-toss.toss.im)에서 확인해 주세요.

플랫폼 설정은 `apps-in-toss.config.ts`에서 관리해요.
