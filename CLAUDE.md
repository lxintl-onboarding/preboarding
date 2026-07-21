# LX인터내셔널 프리보딩(입사 전 온보딩) 웹앱

## 프로젝트 개요

신규 입사자에게 **URL로 전달**하는 모바일 우선 프리보딩 웹앱.
네이티브 앱 출시 없음. 정적 HTML 파일 하나로 동작하며, 폼 제출만 외부 연동.

**담당**: LX인터내셔널 인사팀
**현재 단계**: 프로토타입 (실서비스 전환 전)

## 파일 구조

```
lx-onboarding/
├── index.html          # 운영 버전(유일) — Red 히어로 + 화이트 반전 로고
├── assets/
│   ├── logo-white.png  # 한글 반전 로고 (index.html에서 사용)
│   ├── logo_front-square.png  # 파비콘
│   ├── 하이렉스.gif     # 마스코트 이미지
│   └── logo-color.png, logo_front.png  # 미사용 — index-ivory.html 삭제로 남은 것, 정리 대상
└── docs/
    ├── DECISIONS.md                    # 의사결정 기록 (왜 이렇게 만들었는가)
    ├── BACKLOG.md                      # 남은 작업
    ├── UX_IMPROVEMENT_PLAN.md          # ★ 다음 작업. 리서치 근거 포함
    ├── ARCHITECTURE_DECISION_RECORD.html  # GAS 연동 아키텍처 결정 기록 (다운로드 가능한 독립 파일)
    ├── ACCOUNT_OWNERSHIP_RECORD.html   # 계정 소유권 관리 방안 (GitHub Owner, GAS 무료/유료 계정 결정)
    └── gas-code.gs                     # Google Apps Script 백엔드 코드 (실제 배포본과 동일)
```

**다음 작업은 `docs/UX_IMPROVEMENT_PLAN.md`의 Phase 1부터 시작하세요.**

**A안/B안 중 B안(Red 히어로)으로 확정되어 `index-ivory.html`(구 A안)은 삭제되었습니다.**
`index.html`이 유일한 운영 버전입니다.

## 아키텍처

단일 HTML 파일에 CSS/JS 인라인. 빌드 도구 없음. 프레임워크 없음.
의존성은 외부 스크립트 1개(Daum 우편번호)뿐입니다.

```
입사자 ──URL(#t=토큰)──> GitHub Pages (lxintl-onboarding.github.io/preboarding)
                              │
                              ├─ GET  ──> Google Apps Script ──> Google Sheets
                              │           (토큰으로 이름·출근일·담당자·제출여부 조회)
                              ├─ POST ──> Google Apps Script ──> Google Sheets
                              │           (배송지 폼 저장)
                              └─ localStorage: 체크리스트 상태(토큰별로 분리)
```

**GAS_ENDPOINT는 이미 연동 완료 상태입니다** (`docs/gas-code.gs`가 실제 배포된 스크립트와 동일).
새 입사자 링크는 담당자가 Google Sheet에 행을 추가하고 시트 메뉴("온보딩 관리 → 새 입사자
링크 생성")를 실행하면 토큰과 링크가 자동 생성됩니다 — 자세한 건 아래
"새 입사자를 추가하려면" 참고.

## 화면 구성 (3탭)

1. **환영 인사** — CEO 영상(플레이스홀더), 웰컴 노트, 회사 소개
2. **입사 준비** — 첫 출근 안내 + D-Day, 7개 To-Do 체크리스트, 웰컴 기프트 배송지 폼
3. **사전 정보** — 5개 아코디언(첫날 가이드, 커뮤니케이션, 회의·보고, 동료관계, 보안), Do&Don't

## 브랜드 컬러 (CI 규정 · RGB 기준)

`:root`에 전부 변수로 선언되어 있습니다. **하드코딩 금지.**

| 변수 | 값 | 용도 |
|---|---|---|
| `--brand` | `#A72B2A` | LX Red (PANTONE 7627 C) |
| `--ink-sub` | `#746661` | LX Gray (PANTONE 410 C) |
| `--gold` | `#C6AB85` | LX Gold — **장식 전용** |
| `--sub-rose` / `--sub-gray` / `--sub-ochre` | `#D77F7E` / `#A6A49D` / `#A68447` | 보조 |

**LX Gold는 흰 배경 대비 2.2:1로 텍스트에 부적합합니다.** 테두리·불릿·아이콘에만 사용하세요.
텍스트에는 LX Red(6.95:1) 또는 LX Gray(5.5:1)를 씁니다. 모든 조합이 WCAG AA를 통과하도록 유지해야 합니다.

## 주요 JS 로직

| 위치 | 역할 |
|---|---|
| `personalizeHero()` (IIFE) | URL 토큰(`#t=`)으로 GAS를 조회해 이름·출근일·담당자·제출여부를 개인화 |
| `updateProgress(animate)` | 세그먼트 진행률 + 분수 표기 + NEXT 강조 + 100% 축하 트리거 |
| `highlightNext()` | 미완료 항목 중 첫 번째에 NEXT 뱃지 |
| `renderDday(dateStr)` | 주어진 날짜로 D-Day 계산·렌더. 토큰 조회 성공 시 실제 출근일로 재호출됨 |
| `initDocs()` | 구비서류 9종 ↔ 상위 To-Do 양방향 동기화 |
| `openPostcode()` | Daum 우편번호 서비스 팝업 |
| `giftForm` submit 핸들러 | 배송지 폼을 GAS로 POST 저장 (토큰 없으면 localStorage에만 임시 저장) |
| `celebrate()` | 컨페티 canvas + 축하 모달 |

### 주의사항

- `checkboxes` 셀렉터는 `.todo > input[data-key]`로 **직계 자식만** 잡습니다.
  하위 서류 체크박스(`data-doc`)가 진행률에 섞이면 안 됩니다.
- 구비서류 상위 항목(`#docsTodo`)은 `label`이 아니라 `div`입니다.
  `label` 중첩이 HTML 스펙 위반이라 클릭/키보드 핸들러를 직접 붙였습니다.
- localStorage 키: `lx-onboarding-todo`, `lx-onboarding-docs`, `lx-onboarding-gift` —
  토큰으로 접속한 경우 각각 `-토큰` 접미사가 붙어 입사자별로 분리됩니다.

## 새 입사자를 추가하려면 (실제 운영 방식)

담당자가 HTML을 직접 고칠 필요는 없습니다. Google Sheet에서 처리합니다.

1. Sheet에 입사자 행 추가 (이름·출근일 등 입력)
2. 시트 메뉴 **"온보딩 관리 → 새 입사자 링크 생성"** 실행
   (`docs/gas-code.gs`의 `generateTokensAndLinks()` — 이름은 있는데 토큰이 비어있는 행만 채움)
3. 자동 생성된 개인화 링크(`index.html#t=토큰&name=...&date=...`)를 입사자에게 전달
4. 입사자가 링크로 접속하면 페이지가 토큰으로 GAS를 조회해 이름·출근일·담당자 정보를
   자동으로 채우고, 배송지 제출 여부도 기기를 바꿔도 유지됩니다

**주의**: `docs/gas-code.gs`는 Sheet 1행(헤더)의 텍스트를 `COL` 매핑 기준으로 찾습니다
(`입사자`, `출근일`, `담당자`, `담당자연락처` 등). **Sheet에서 헤더 이름을 바꾸거나 열을
삭제하면 스크립트가 통째로 깨집니다.** 헤더를 바꿔야 한다면 `gas-code.gs`의 `COL` 값도
반드시 같이 수정하세요.

```javascript
var FIRST_DAY  = '2026-06-22';   // 미리보기(토큰 없이 접속 시) 기본값
var FIRST_TIME = '오전 9:00까지';
```

이 상수와 HTML의 `○○○ 책임 · 000-0000-0000`은 **토큰 없이 접속했을 때(미리보기 모드)의
기본값일 뿐**입니다. 실제 운영에서는 위 절차로 입사자별 값이 자동으로 채워지므로
평소에 이 값을 직접 고칠 일은 없습니다.

## 개발·확인 방법

빌드 불필요. 브라우저로 직접 열면 됩니다.

```bash
python3 -m http.server 8000   # http://localhost:8000
```

주소 검색 기능은 `file://` 프로토콜에서 동작하지 않으므로 로컬 서버가 필요합니다.

## 코드 스타일

- ES5 문법 (`var`, `function`). 구형 브라우저 호환 목적
- 인라인 CSS/JS 유지. 파일 분리하지 말 것 (단일 파일 배포가 요구사항)
- 한글 주석 사용
- `prefers-reduced-motion` 대응 유지
