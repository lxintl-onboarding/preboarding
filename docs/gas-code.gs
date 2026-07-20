/** ================= 설정 ================= */
var BASE_URL = 'https://lxintl-onboarding.github.io/preboarding/';

/** 시트 헤더(1행) 텍스트 — 여기 이름을 열 위치 찾는 기준으로 사용.
 *  열 순서가 바뀌거나 새 열이 추가돼도 이 이름들만 유지되면 스크립트는 안 깨짐. */
var COL = {
  NAME: '입사자',
  START_DATE: '출근일',
  EMAIL: '이메일',
  TOKEN: '토큰',
  LINK: '링크',
  SUBMITTED: '제출여부',
  RECEIVER: '받는분성함',
  PHONE: '연락처',
  CONTACT_NAME: '담당자',
  CONTACT_PHONE: '담당자연락처',
  HIRE_TYPE: '입사구분',
  ZIP: '우편번호',
  ADDR1: '주소',
  ADDR2: '상세주소',
  SIZE: '사이즈',
  MEMO: '메모'
};
/* 시트 헤더 쪽과 비교할 때 항상 같은 방식으로 비교되도록, 여기 값도 미리 정규화해둠
   (앞뒤 공백 제거 + 한글 자모 결합 방식 통일 — 눈엔 똑같아 보여도 다르게 저장되는 경우 방지) */
Object.keys(COL).forEach(function (k) { COL[k] = normalizeHeader_(COL[k]); });

function normalizeHeader_(s) {
  return String(s).trim().normalize('NFC');
}

function getSheet() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
}

/** 헤더(1행)에서 "열 이름 → 열 번호(1부터)" 매핑 생성 */
function getHeaderMap(sheet) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var map = {};
  headers.forEach(function (h, i) { map[normalizeHeader_(h)] = i + 1; });
  return map;
}

/** COL에 정의된 이름 중, 실제 시트 1행에 없는 게 있는지 확인.
 *  하나라도 비면 그 함수는 getRange(number, null, ...) 같은 에러를 냄. */
function assertHeaders_(map) {
  var missing = [];
  Object.keys(COL).forEach(function (key) {
    if (!map[COL[key]]) missing.push('"' + COL[key] + '"');
  });
  if (missing.length) {
    throw new Error('시트 1행에서 다음 헤더를 찾지 못했습니다: ' + missing.join(', ') +
      ' — 실제 시트의 헤더 텍스트와 정확히 같은지(공백·오타 포함) 확인해 주세요.');
  }
}

/** 진단용: 실행 로그에 시트 1행의 실제 헤더 vs 스크립트가 찾는 헤더를 정규화해서 비교.
 *  함수 목록에서 debugHeaders 선택 후 ▶ 실행 → 상단 "실행 로그"에서 결과 확인. */
function debugHeaders() {
  var sheet = getSheet();
  var map = getHeaderMap(sheet); // 정규화(trim + NFC)까지 적용된 맵
  Logger.log('정규화된 실제 헤더 목록: ' + JSON.stringify(Object.keys(map)));

  var missing = [];
  Object.keys(COL).forEach(function (key) {
    var found = !!map[COL[key]];
    Logger.log((found ? '✅ 찾음: ' : '❌ 못찾음: ') + '"' + COL[key] + '" (길이 ' + COL[key].length + ')');
    if (!found) missing.push(COL[key]);
  });
  Logger.log(missing.length ? '누락된 헤더: ' + JSON.stringify(missing) : '모든 헤더 정상 매칭됨');
}

/** ================= 메뉴: 새 입사자 링크 생성 =================
 * 입사자만 입력돼 있고 토큰이 비어있는 행을 찾아, 토큰·링크를 고정값으로 채움.
 * (RANDBETWEEN 수식과 달리 한 번 계산되면 이후 재계산되지 않음 — 이미 보낸 링크가 깨지지 않음)
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('온보딩 관리')
    .addItem('새 입사자 링크 생성', 'generateTokensAndLinks')
    .addToUi();
}

function generateTokensAndLinks() {
  var sheet = getSheet();
  var map = getHeaderMap(sheet);
  assertHeaders_(map);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  var nameCol = map[COL.NAME];
  var startDateCol = map[COL.START_DATE];
  var tokenCol = map[COL.TOKEN];
  var linkCol = map[COL.LINK];

  var names = sheet.getRange(2, nameCol, lastRow - 1, 1).getValues();
  var startDates = sheet.getRange(2, startDateCol, lastRow - 1, 1).getValues();
  var tokens = sheet.getRange(2, tokenCol, lastRow - 1, 1).getValues();

  var created = 0;
  for (var i = 0; i < names.length; i++) {
    var hasName = names[i][0] !== '';
    var hasToken = tokens[i][0] !== '';
    if (hasName && !hasToken) {
      var row = i + 2;
      var token = Utilities.getUuid().replace(/-/g, '').substring(0, 16);
      sheet.getRange(row, tokenCol).setValue(token);
      /* name·출근일을 링크에 같이 실어서, 페이지 로드 시 GAS 응답을 기다리지 않고
         즉시 표시할 수 있게 함(그 사이 기본값(FIRST_DAY)이 실제 날짜처럼 보여 혼동을
         주는 문제 방지) — 제출여부·담당자는 계속 GAS 조회로 받아옴 */
      var link = BASE_URL + '#t=' + token + '&name=' + encodeURIComponent(names[i][0]);
      var startDate = toIsoDate_(startDates[i][0]);
      if (startDate) link += '&date=' + encodeURIComponent(startDate);
      sheet.getRange(row, linkCol).setValue(link);
      created++;
    }
  }
  SpreadsheetApp.getUi().alert(created + '명의 링크를 생성했습니다.');
}

/** ================= 조회 =================
 * 입사자가 링크(#t=토큰)로 접속하면, 페이지의 JS가 이 doGet을
 * ?t=토큰 쿼리스트링으로 호출해서 입사자·출근일·제출여부·담당자 정보를 받아감.
 */
function doGet(e) {
  var token = e.parameter.t;
  if (!token) return jsonResponse({ found: false, error: 'missing token' });

  var sheet = getSheet();
  var map = getHeaderMap(sheet);
  try { assertHeaders_(map); } catch (err) { return jsonResponse({ found: false, error: err.message }); }
  var row = findRowByToken(sheet, map, token);
  if (!row) return jsonResponse({ found: false });

  var data = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  var get = function (name) { return data[map[name] - 1]; };

  return jsonResponse({
    found: true,
    name: get(COL.NAME),
    startDate: toIsoDate_(get(COL.START_DATE)),
    submitted: get(COL.SUBMITTED) === true || get(COL.SUBMITTED) === 'TRUE',
    contactName: get(COL.CONTACT_NAME),
    contactPhone: get(COL.CONTACT_PHONE)
  });
}

/** ================= 저장 =================
 * 입사자가 배송지 폼 "저장하기"를 누르면, 페이지의 JS가 이 doPost로
 * { token, name, phone, type, zip, addr1, addr2, size, memo } 를 전송.
 */
function doPost(e) {
  var body = JSON.parse(e.postData.contents);
  var token = body.token;
  if (!token) return jsonResponse({ ok: false, error: 'missing token' });

  var sheet = getSheet();
  var map = getHeaderMap(sheet);
  try { assertHeaders_(map); } catch (err) { return jsonResponse({ ok: false, error: err.message }); }
  var row = findRowByToken(sheet, map, token);
  if (!row) return jsonResponse({ ok: false, error: 'invalid token' });

  var set = function (name, value) {
    if (map[name]) sheet.getRange(row, map[name]).setValue(value);
  };

  set(COL.RECEIVER, body.name);
  set(COL.PHONE, body.phone);
  set(COL.HIRE_TYPE, body.type);
  set(COL.ZIP, body.zip);
  set(COL.ADDR1, body.addr1);
  set(COL.ADDR2, body.addr2);
  set(COL.SIZE, body.size);
  set(COL.MEMO, body.memo);
  set(COL.SUBMITTED, true);

  return jsonResponse({ ok: true });
}

/** ================= 공통 유틸 ================= */
function findRowByToken(sheet, map, token) {
  var tokenCol = map[COL.TOKEN];
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  var tokens = sheet.getRange(2, tokenCol, lastRow - 1, 1).getValues();
  for (var i = 0; i < tokens.length; i++) {
    if (tokens[i][0] === token) return i + 2;
  }
  return null;
}

/* 화면에 보여줄 한글 날짜 포맷은 HTML 쪽(initDday)에서 통일해서 처리하도록,
   여기서는 YYYY-MM-DD 원본 형태로만 돌려줌 */
function toIsoDate_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]') {
    var y = value.getFullYear();
    var m = ('0' + (value.getMonth() + 1)).slice(-2);
    var d = ('0' + value.getDate()).slice(-2);
    return y + '-' + m + '-' + d;
  }
  return value;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
