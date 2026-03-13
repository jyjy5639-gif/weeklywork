# 화인파트너스 주간 업무일지 대시보드 v2

> Firebase Firestore 기반 팀 공유 대시보드

---

## 📁 파일 구조

```
├── index.html      # 메인 대시보드 (주간 실적 요약 + 실시간 업데이트)
├── input.html      # 데이터 입력 페이지 (전체 컬럼)
├── style.css       # 공통 스타일
├── db.js           # Firebase Firestore 데이터 레이어 (ES Module)
├── dashboard.js    # 대시보드 렌더링 로직
├── input.js        # 입력 폼 로직
└── README.md
```

---

## 🔥 Firebase 설정 (필수 — 배포 전 반드시 진행)

### 1단계: Firebase 프로젝트 생성

1. https://console.firebase.google.com 접속
2. **"프로젝트 추가"** 클릭 → 프로젝트 이름 입력 (예: `fp-dashboard`)
3. Google Analytics: 선택 사항 (없어도 됨)

### 2단계: Firestore 데이터베이스 생성

1. 좌측 메뉴 → **Firestore Database** → **데이터베이스 만들기**
2. 모드 선택: **"테스트 모드"** (30일 오픈, 이후 규칙 수정 필요)
3. 위치: `asia-northeast3 (서울)` 선택

### 3단계: 웹 앱 등록 및 설정값 복사

1. 프로젝트 개요 → **"웹"** (`</>`) 아이콘 클릭
2. 앱 닉네임 입력 → "앱 등록"
3. 표시되는 `firebaseConfig` 값을 복사

### 4단계: 코드에 설정값 붙여넣기

`index.html` 과 `input.html` 두 파일에서 아래 부분을 찾아 교체:

```javascript
// 이 부분을 교체하세요
const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};
```

---

## 🔐 Firestore 보안 규칙 (사내 전용)

Firebase Console → Firestore → **규칙** 탭에서 아래로 교체:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /weekly_entries/{docId} {
      // 읽기/쓰기 모두 허용 (사내 비공개 URL 사용 전제)
      allow read, write: if true;
    }
  }
}
```

> ⚠️ 추후 Firebase Authentication을 추가해 인증된 사용자만 접근하도록 강화를 권장합니다.

---

## 🚀 GitHub Pages 배포

### 1단계: GitHub 저장소 생성

1. https://github.com/new 에서 새 저장소 생성
2. Repository name: `fp-dashboard` (원하는 이름)
3. **Private** 선택 (사내 비공개)
4. "Create repository" 클릭

### 2단계: 파일 업로드

**방법 A — GitHub 웹에서 직접 업로드**
1. 저장소 페이지 → "Add file" → "Upload files"
2. 6개 파일 모두 드래그 앤 드롭
3. "Commit changes" 클릭

**방법 B — Git CLI**
```bash
git init
git add .
git commit -m "초기 대시보드 배포"
git remote add origin https://github.com/{username}/fp-dashboard.git
git push -u origin main
```

### 3단계: GitHub Pages 활성화

1. 저장소 → **Settings** → 좌측 **Pages**
2. Source: **"Deploy from a branch"**
3. Branch: **main** / **/ (root)**
4. "Save" 클릭
5. 약 1~2분 후 `https://{username}.github.io/fp-dashboard/` 접속 가능

> ⚠️ Private 저장소의 GitHub Pages는 **GitHub Pro** 이상 필요합니다.
> 무료 플랜이라면 저장소를 **Public**으로 설정하거나, **Netlify** 배포를 대신 사용하세요.

---

## 🌐 Netlify 배포 (대안, 무료)

1. https://netlify.com 가입
2. "Add new site" → "Deploy manually"
3. 파일 6개를 폴더째로 드래그 앤 드롭
4. 자동으로 URL 발급 (`https://xxxxx.netlify.app`)

---

## 📋 입력 컬럼 전체 목록

| 컬럼 | 필수 | 설명 |
|------|------|------|
| 부서 | ✅ | 투자1~3부, 관리부 |
| 구분 | ✅ | 작성중/신규/기존/기존★/관리자산/입출금/기타 |
| 업무구분 | | 투/자/업/무/부 |
| 주간시작일 | ✅ | 해당 주 월요일 날짜 |
| 금주/전주 | | 실적 구분 |
| 날짜 | | 업무 발생일 |
| 회사명/사업명 | ✅ | |
| 업종(상세) | | |
| 투자형태 및 주요조건 | | CB 조건, 지분율, Pre-Value 등 전체 |
| 목표 | | EXIT 방식 및 시기 |
| 총규모 | | 딜 전체 규모 |
| 검토금액 | ✅ | 당사 투자 예정 금액 |
| 진행상황 | | 작성중/검토중/심사중/투자완료/협의중/보류/종결 |
| Pre-Value | | |
| 지분율 | | |
| Coupon/YTP/YTC | | |
| IRR(목표) | | |
| MOIC(목표) | | |
| EXIT 방식 | | |
| EXIT 예정시기 | | |
| Put/Call 옵션 | | |
| Tag/Drag-along | | |
| 비고 | | |