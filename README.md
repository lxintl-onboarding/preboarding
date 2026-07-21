# LX인터내셔널 프리보딩 웹앱

신규 입사자에게 URL로 전달하는 입사 전 온보딩 페이지입니다.

## 실행

빌드 불필요. 로컬 서버만 띄우면 됩니다.

```bash
python3 -m http.server 8000
# http://localhost:8000
```

주소 검색 기능 때문에 `file://`이 아닌 로컬 서버가 필요합니다.
Windows에서 Python 없이 확인하려면 `.claude/serve.ps1`을 실행해도 동일하게 동작합니다.

## 파일

| 파일 | 설명 |
|---|---|
| `index.html` | 운영 버전(유일) — Red 헤더 + 반전 로고 |

A안(아이보리 헤더)/B안(Red 헤더) 중 B안으로 확정되어 `index-ivory.html`(구 A안)은
삭제되었습니다.

## 새 입사자를 추가하려면 (실제 운영 방법)

HTML을 직접 고칠 필요 없습니다. Google Sheet에서 처리합니다.

1. Sheet에 입사자 행 추가 (이름, 출근일 등)
2. 시트 메뉴 **"온보딩 관리 → 새 입사자 링크 생성"** 클릭
3. 자동 생성된 개인화 링크를 입사자에게 전달
4. 입사자가 접속하면 이름·출근일·담당자 정보가 자동으로 채워지고,
   배송지 제출 여부도 기기를 바꿔도 유지됩니다

동작 원리는 `docs/gas-code.gs`(Google Apps Script 백엔드 코드)와
`docs/ARCHITECTURE_DECISION_RECORD.html`에 정리돼 있습니다.

## 자주 바꾸는 값

**색상** — `:root`의 CSS 변수를 수정하세요. 하드코딩된 색은 없습니다.

**문구** — HTML 본문에 한글로 그대로 있습니다. 에디터에서 검색해 바꾸세요.

**미리보기 기본값** — 토큰 없이 `index.html`을 그냥 열었을 때만 보이는 값입니다.
실제 입사자에게는 위 "새 입사자를 추가하려면" 절차로 개인화된 값이 자동 채워지므로
평소엔 건드릴 일이 없습니다.
```javascript
var FIRST_DAY  = '2026-06-22';
var FIRST_TIME = '오전 9:00까지';
```

**폼 저장 연동** — `GAS_ENDPOINT`에 배포된 Google Apps Script 웹앱 URL이 연결돼 있습니다
(현재 연동 완료). 비워두면 미리보기 모드(로컬 저장만)로 동작합니다.
백엔드 코드 사본은 `docs/gas-code.gs`에 있습니다.

## 문서

- `CLAUDE.md` — 프로젝트 컨텍스트 (Claude Code가 읽습니다)
- `docs/DECISIONS.md` — 왜 이렇게 만들었는가
- `docs/BACKLOG.md` — 남은 작업
- `docs/UX_IMPROVEMENT_PLAN.md` — 다음 UX 개선 작업 (근거 포함)
- `docs/ARCHITECTURE_DECISION_RECORD.html` — GAS 연동 아키텍처 결정 기록
- `docs/ACCOUNT_OWNERSHIP_RECORD.html` — 계정 소유권 관리 방안
