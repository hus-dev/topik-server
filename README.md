# TopikGo - Backend Server (topik-server)

<p align="center">
  <img src="https://damqug77a9y1r.cloudfront.net/assets/logo.png" alt="TopikGo Logo" width="120" onerror="this.style.display='none'"/>
</p>

<p align="center">
  <strong>TopikGo 모바일 서비스를 위한 엔터프라이즈급 NestJS 백엔드 API & AI 엔진</strong><br>
  Google Gemini Flash Lite AI | 다계층 Redis 캐싱 | TOPIK I & II 기출 파이프라인 | AWS CloudFront CDN | Docker & EC2 CI/CD
</p>

<p align="center">
  <img src="https://img.shields.io/badge/NestJS-11.x-E0234E?style=flat&logo=nestjs&logoColor=white" alt="NestJS"/>
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Prisma-7.x-2D3748?style=flat&logo=prisma&logoColor=white" alt="Prisma"/>
  <img src="https://img.shields.io/badge/MySQL-8.0-4479A1?style=flat&logo=mysql&logoColor=white" alt="MySQL"/>
  <img src="https://img.shields.io/badge/Redis-7.x-DC382D?style=flat&logo=redis&logoColor=white" alt="Redis"/>
  <img src="https://img.shields.io/badge/Google_Gemini-Flash_Lite-FFA116?style=flat&logo=googlegemini&logoColor=white" alt="Gemini"/>
  <img src="https://img.shields.io/badge/AWS-S3_%26_CloudFront_%26_EC2-FF9900?style=flat&logo=amazonwebservices&logoColor=white" alt="AWS"/>
</p>

---

## 📌 목차 (Table of Contents)

1. [서버 소개 (Overview)](#-서버-소개-overview)
2. [핵심 기능 및 모듈 (Key Features & Modules)](#-핵심-기능-및-모듈-key-features--modules)
   - [1. 🤖 Google Gemini AI 엔진 (Flash Lite)](#1--google-gemini-ai-엔진-flash-lite)
   - [2. ⚡ 초고속 다계층 Redis 캐싱 아키텍처](#2--초고속-다계층-redis-캐싱-아키텍처)
   - [3. 📚 TOPIK I & TOPIK II 기출 데이터 파이프라인](#3--topik-i--topik-ii-기출-데이터-파이프라인)
   - [4. 🛡️ 보안, 인증 & Play Store 규정 준수](#4--보안-인증--play-store-규정-준수)
   - [5. ☁️ AWS S3 & CloudFront CDN 미디어 전송](#5--aws-s3--cloudfront-cdn-미디어-전송)
   - [6. 🔄 오프라인 동기화 큐 & 다운로드 관리](#6--오프라인-동기화-큐--다운로드-관리)
3. [기술 스택 (Tech Stack)](#-기술-스택-tech-stack)
4. [아키텍처 및 디렉토리 구조 (Architecture & Directory Structure)](#-아키텍처-및-디렉토리-구조-architecture--directory-structure)
5. [데이터베이스 스키마 (Database Schema - Prisma)](#-데이터베이스-스키마-database-schema---prisma)
6. [주요 API 명세 (API Endpoints Overview)](#-주요-api-명세-api-endpoints-overview)
7. [환경 변수 설정 (.env Guide)](#-환경-변수-설정-env-guide)
8. [설치 및 로컬 실행 (Installation & Local Setup)](#-설치-및-로컬-실행-installation--local-setup)
9. [데이터 시딩 및 콘텐츠 임포트 (Data Seeding & Import)](#-데이터-시딩-및-콘텐츠-임포트-data-seeding--import)
10. [배포 및 CI/CD (Deployment & AWS EC2)](#-배포-및-cicd-deployment--aws-ec2)

---

## 🚀 서버 소개 (Overview)

**TopikGo Backend Server (`topik-server`)**는 TopikGo 모바일 클라이언트와 연동되어 고성능 학습 콘텐츠 제공, 1:1 맞춤형 AI 분석, 보안 인증, 오프라인 데이터 동기화를 전담하는 NestJS 기반 마이크로서비스 백엔드입니다.

최신 **Google Gemini AI 모델(`gemini-flash-lite-latest`)**을 결합하여 실시간 오답 분석 및 쓰기 첨삭을 초고속으로 제공하며, **MySQL 8.0**과 **Redis** 다계층 캐시를 활용해 트래픽 폭증에도 0.1초 미만의 응답 속도를 유지합니다.

---

## ✨ 핵심 기능 및 모듈 (Key Features & Modules)

### 1. 🤖 Google Gemini AI 엔진 (Flash Lite)

- **1:1 맞춤형 AI 오답 해설 (`POST /questions/:id/ai-explain`)**:
  - 학생이 선택한 오답과 정답을 분석하여 모국어(한국어, 영어, 우즈베크어, 러시아어, 베트남어 등 9개 언어)로 1:1 맞춤 과외식 해설 생성.
  - JSON Schema 검증을 통과한 구조화된 데이터 반환:
    - `wrongReason`: 사용자가 오답을 고르게 된 원인 분석
    - `correctReason`: 정답이 도출되는 명확한 근거
    - `keyVocabulary`: 문제 속 핵심 한국어 단어 및 번역
    - `tip`: 실전 유형 정복 팁
- **1:1 맞춤형 AI 쓰기(작문) 정밀 첨삭 (`POST /questions/:id/ai-writing-feedback`)**:
  - TOPIK II 서술형/작문(51번, 52번 빈칸 완성, 53번 소작문, 54번 장작문) 답안 정밀 분석.
  - 실제 채점 지표 기반 예상 점수대(`scoreEstimate`), 문법/철자 교정 목록(`grammarCorrections`), 감점 요인(`deductionPoints`), 원어민 모범 답안(`polishedVersion`), 종합 피드백(`nativeFeedback`) 제공.
- **실전 TOPIK AI 예문 생성기 (`POST /vocabulary/ai-example`)**:
  - 단어 학습 시 실전 TOPIK 문맥 태그(일상 대화, TOPIK 실전, 사회·문화 등)에 맞춘 자연스러운 고품질 예문과 사용자 모국어 번역 실시간 생성.

---

### 2. ⚡ 초고속 다계층 Redis 캐싱 아키텍처

- **AI 분석 결과 캐싱**:
  - 문제 오답 해설: `Redis (12시간 TTL)` + `MySQL (question_ai_explanations 테이블 영구 저장)`.
  - 쓰기 피드백: `SHA-256(questionId + userAnswer + langCode)` 해시 키로 `Redis (6시간 TTL)` 캐싱.
  - AI 예문: `Redis (24시간 TTL)` 캐싱.
- **보안 세션 & 토큰 관리**:
  - Refresh Token 회전(Rotation) 및 로그아웃 시 Access Token 블랙리스트 관리.
- **안전한 패턴 무효화**:
  - Redis 단일 스레드 차단을 방지하기 위해 `KEYS` 명령 대신 `scanStream`을 활용한 점진적 키 스캔 & 배치 삭제(`unlink`) 적용.

---

### 3. 📚 TOPIK I & TOPIK II 기출 데이터 파이프라인

- **TOPIK I (102회) & TOPIK II (102회, 83회) 완벽 지원**:
  - 듣기·읽기·쓰기 전 문항의 프롬프트, 지문(Passage), 선지(Options), 음성(Media MP3), 이미지 스캔본 데이터 관리.
- **OCR 텍스트 추출 및 정제 스크립트**:
  - Python/Swift 기반 OCR 파이프라인을 구축하여 기출 시험지로부터 깨짐 없는 텍스트와 좌표 추출 및 HTML 태그 정제.
- **듣기 문항 분할 최적화**:
  - TOPIK 1 특유의 Q1~24(단독 문항)과 Q25~30(2문항 묶음 세트) 구조를 완벽하게 분할하여 서빙.

---

### 4. 🛡️ 보안, 인증 & Play Store 규정 준수

- **다양한 인증 전략 (Passport + JWT + OAuth)**:
  - 이메일/비밀번호 로컬 인증 (bcrypt 암호화).
  - Google ID 토큰 검증 (Google Auth Library) 및 Kakao Access Token 검증.
- **Google Play 스토어 규정 준수 회원 탈퇴 (`DELETE /users/profile`)**:
  - 계정 삭제 시 MySQL 외래키 제약조건에 종속된 모든 학습 기록(`exam_sessions`, `answers`, `user_vocabulary`, `user_grammar_items`, `user_questions`, `user_downloads`, `sync_queue`)을 **Cascading 안전 삭제**.
- **법적 고지 정적 HTML 서빙**:
  - 별도 외부 웹서버 없이 모바일 앱 및 웹뷰에서 즉시 조회 가능한 공식 문서 엔드포인트 제공:
    - `GET /privacy-policy` (개인정보처리방침)
    - `GET /terms` (서비스 이용약관)

---

### 5. ☁️ AWS S3 & CloudFront CDN 미디어 전송

- 대용량 시험 듣기 음성 파일(MP3)과 고해상도 문제 지문 이미지를 AWS S3 버킷에 안전하게 업로드.
- 전 세계 엣지 로케이션을 보유한 AWS CloudFront CDN(`https://damqug77a9y1r.cloudfront.net`)을 연동하여 밀리초 단위 초고속 전송 보장.
- S3 업로드 및 DB 미디어 URL을 CDN 도메인으로 일괄 마이그레이션하는 전용 스크립트 내장.

---

### 6. 🔄 오프라인 동기화 큐 & 다운로드 관리

- 모바일 클라이언트가 오프라인 환경에서 기록한 학습 세션, 답안, 북마크를 `sync_queue` 엔티티로 일괄 수신 및 비동기 동기화 처리.
- 사용자별 오프라인 다운로드 리소스 상태 추적 (`user_downloads`).

---

## 🛠 기술 스택 (Tech Stack)

| 레이어 | 기술 | 설명 |
| :--- | :--- | :--- |
| **Framework** | **NestJS 11.x** | 엔터프라이즈급 모듈형 TypeScript Node.js 프레임워크 |
| **Language** | **TypeScript 5.x** | 정적 타입 시스템 및 강력한 컴파일 안정성 |
| **ORM** | **Prisma 7.x** | 선언적 스키마 기반 Type-Safe ORM |
| **Database** | **MySQL 8.0** | 관계형 데이터베이스 (InnoDB) |
| **Cache & Store** | **Redis 7.x (ioredis)**| AI 캐싱, Refresh Token 저장, 토큰 블랙리스트 |
| **AI LLM** | **Google Gemini Flash Lite** | `gemini-flash-lite-latest` 기반 1:1 해설, 첨삭, 예문 생성 |
| **Cloud Media** | **AWS S3 + CloudFront CDN** | 음성/이미지 미디어 고속 전송 |
| **Documentation**| **Swagger (OpenAPI 3.0)** | 대화형 REST API 명세서 (`/api`) |
| **Container** | **Docker & Docker Compose** | 컨테이너화된 로컬 및 서버 운영 환경 |
| **CI / CD** | **GitHub Actions + AWS EC2**| 자동화된 빌드, 테스트 및 SSH 무중단 배포 |

---

## 📂 아키텍처 및 디렉토리 구조 (Architecture & Directory Structure)

도메인별로 완벽하게 캡슐화된 모듈 구조를 따릅니다:

```text
src/
├── app.controller.ts              # 헬스체크 및 법적 고지 (/privacy-policy, /terms)
├── app.module.ts                  # 루트 모듈 (전역 설정, 모듈 등록)
├── app.service.ts                 # 법적 문서 HTML 렌더링
├── common/                        # 공통 데코레이터, 필터, 인터셉터, BigInt 직렬화 유틸
├── prisma/                        # PrismaService (DB 커넥션 라이프사이클 관리)
├── redis/                         # RedisService (ioredis 기반 캐싱 및 키 스캔)
├── auth/                          # JWT, Google/Kakao 소셜 인증, 토큰 회전
├── users/                         # 사용자 프로필, 비밀번호 변경, 회원 탈퇴(Cascade)
├── questions/                     # 문제 조회, 1:1 AI 오답 해설 및 AI 쓰기 피드백
├── question-sets/                 # 문제 세트(기출/연습) 카탈로그
├── mock-exams/                    # 실전 모의고사 세션 메타데이터
├── practice-sessions/             # 영역별 풀이 세션 및 답안 채점
├── vocabulary/                    # 어휘 CRUD, Gemini AI 예문 생성
├── grammar/                       # 마스터 문법 데이터 조회, 검색/필터링
├── bookmarks/                     # 영역별(문제/단어/문법) 북마크
├── offline/                       # 오프라인 동기화 큐 및 다운로드 관리
├── explanation-videos/            # 해설 동영상 메타데이터
└── topik-exam-schedules/          # TOPIK 공식 시험 일정
```

---

## 💾 데이터베이스 스키마 (Database Schema - Prisma)

Prisma ORM을 통해 16개의 핵심 테이블을 유기적으로 관리합니다:

- **`users`**: 사용자 계정, 소셜 로그인 프로바이더, 목표 레벨, 모국어 언어 코드, 테마/레이아웃 설정
- **`questions`**: 문제 본문, 정답, 공식 해설, 난이도, 영역, 제한시간
- **`question_ai_explanations`**: AI 오답 해설 캐시 테이블 (`question_id`, `selected_option`, `language_code` 복합 유니크 키)
- **`question_options`**: 문제 보기 선지 (1~4번)
- **`question_passages`**: 문제 지문 텍스트 및 번역
- **`question_media`**: 듣기 음성 MP3 및 문제 이미지 CDN URL, 대본(Transcript)
- **`question_sets`**: 시험 회차 및 문제 세트 (TOPIK I / II, 기출/연습, 제한시간, 문항수)
- **`exam_sessions` & `answers`**: 시험 풀이 세션, 남은 시간, 선택한 답안, 정답 여부, 소요 시간
- **`vocabulary` & `user_vocabulary`**: 어휘 마스터 데이터 및 사용자 저장 단어장/북마크
- **`grammar_items` & `user_grammar_items`**: 문법 마스터 데이터 (9개 언어 다국어 설명, 접속 규칙, 예문 JSON) 및 사용자 북마크
- **`topik_exam_schedules`**: 시험일, 접수기간, 성적발표일, 공식 접수 URL
- **`sync_queue` & `user_downloads`**: 오프라인 동기화 큐 및 로컬 다운로드 상태

---

## 📚 주요 API 명세 (API Endpoints Overview)

상세 API 스펙은 서버 구동 후 **`http://localhost:3000/api` (Swagger UI)**에서 확인 가능합니다.

### 1. 인증 및 사용자 (Auth & Users)
| Method | Endpoint | 설명 | 인증 |
| :--- | :--- | :--- | :---: |
| `POST` | `/auth/register` | 이메일 회원가입 | - |
| `POST` | `/auth/login` | 이메일 로그인 (Access/Refresh Token 반환) | - |
| `POST` | `/auth/google` | Google ID Token 소셜 로그인 | - |
| `POST` | `/auth/kakao` | Kakao Access Token 소셜 로그인 | - |
| `POST` | `/auth/refresh` | Refresh Token으로 신규 Access Token 재발급 | - |
| `POST` | `/auth/logout` | 로그아웃 (토큰 블랙리스트 등록) | JWT |
| `GET` | `/users/profile` | 현재 로그인 사용자 프로필 조회 | JWT |
| `PATCH`| `/users/profile` | 프로필 설정(언어, 테마, 목표 등) 변경 | JWT |
| `DELETE`| `/users/profile` | **회원 탈퇴 (모든 연관 데이터 Cascade 영구 삭제)** | JWT |

### 2. 문제 및 AI 어시스턴트 (Questions & AI)
| Method | Endpoint | 설명 | 인증 |
| :--- | :--- | :--- | :---: |
| `GET` | `/questions` | 문제 목록 및 필터 검색 | JWT |
| `GET` | `/questions/:id` | 특정 문제 상세 및 보기/미디어 조회 | JWT |
| `POST` | `/questions/:id/ai-explain` | **1:1 맞춤형 AI 오답 분석 과외 (다국어)** | JWT |
| `POST` | `/questions/:id/ai-writing-feedback` | **1:1 맞춤형 AI 쓰기(작문) 정밀 첨삭 및 모범답안** | JWT |

### 3. 어휘 및 문법 (Vocabulary & Grammar)
| Method | Endpoint | 설명 | 인증 |
| :--- | :--- | :--- | :---: |
| `GET` | `/vocabulary` | 필수 어휘 목록 조회 및 검색 | JWT |
| `PATCH`| `/vocabulary/:id` | 사용자 단어 뜻/메모 수정 | JWT |
| `DELETE`| `/vocabulary/:id` | 단어 삭제 | JWT |
| `POST` | `/vocabulary/ai-example` | **TOPIK 실전 문맥 AI 예문 실시간 생성** | JWT |
| `GET` | `/grammar` | 마스터 문법 목록 조회 및 레벨별 필터 | JWT |
| `GET` | `/grammar/:id` | 문법 상세 (접속 규칙, 예문, 다국어 설명) | JWT |

### 4. 법적 문서 & 공개 엔드포인트 (Public Legal Documents)
| Method | Endpoint | 설명 | 인증 |
| :--- | :--- | :--- | :---: |
| `GET` | `/privacy-policy` | 개인정보 처리방침 (HTML) | - |
| `GET` | `/terms` | 서비스 이용약관 (HTML) | - |

---

## ⚙️ 환경 변수 설정 (.env Guide)

`.env` 파일에 아래 필수 항목들을 구성합니다:

```env
# 포트 및 환경
PORT=3000
NODE_ENV=development

# MySQL 데이터베이스 URL (Prisma)
DATABASE_URL="mysql://topik_user:topik_password@localhost:3306/topik_db"

# Redis 커넥션
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD=""

# JWT 보안 키
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="15m"
REFRESH_TOKEN_EXPIRES_IN="7d"

# Google Gemini AI API 키
GEMINI_API_KEY="your-google-gemini-api-key"

# 소셜 로그인 클라이언트 ID
GOOGLE_CLIENT_IDS="your-android-client-id,your-web-client-id"
KAKAO_CLIENT_ID="your-kakao-native-app-key"

# AWS S3 및 CloudFront CDN (선택)
AWS_REGION="ap-northeast-2"
AWS_S3_BUCKET="topik-media"
CDN_BASE_URL="https://damqug77a9y1r.cloudfront.net"
```

---

## 🚀 설치 및 로컬 실행 (Installation & Local Setup)

### 1. 패키지 설치
```bash
$ yarn install
```

### 2. Docker를 활용한 인프라 실행 (MySQL 8.0 & Redis)
```bash
# Docker 컨테이너(MySQL, Redis) 백그라운드 구동
$ docker compose up -d
```

### 3. Prisma 마이그레이션 & 클라이언트 생성
```bash
$ yarn prisma migrate dev
$ yarn prisma generate
```

### 4. 서버 실행
```bash
# 개발 모드 (Watch & Hot-Reload)
$ yarn start:dev

# 프로덕션 빌드 및 실행
$ yarn build
$ yarn start:prod
```

서버가 가동되면 `http://localhost:3000/api`에서 Swagger 대화형 API 문서를 이용할 수 있습니다.

---

## 📦 데이터 시딩 및 콘텐츠 임포트 (Data Seeding & Import)

TopikGo에는 실제 기출 데이터와 학습 자료를 DB에 즉시 적재할 수 있는 풍부한 스크립트가 내장되어 있습니다:

```bash
# 1. 기본 마스터 데이터 시딩 (어휘, 문법, 관리자 계정 등)
$ yarn db:seed

# 2. TOPIK 1 102회 기출 데이터 임포트
$ yarn import:topik1-mock-exams

# 3. TOPIK 2 102회 기출 데이터 임포트
$ yarn import:102-mock-exam

# 4. TOPIK 2 83회 기출 데이터 임포트
$ yarn import:mock-exams

# 5. 미디어 파일 S3 업로드 및 CloudFront CDN URL 동기화
$ yarn media:upload
$ yarn media:migrate-urls
```

---

## 🌐 배포 및 CI/CD (Deployment & AWS EC2)

프로젝트는 AWS EC2 환경에 최적화된 **무중단 자동 배포 파이프라인**을 갖추고 있습니다:

- **`dev` 브랜치**:
  - GitHub Actions (`.github/workflows/ci.yml`)에서 린트 검사, 단위 테스트, Prisma 스키마 검증 수행.
- **`main` 브랜치**:
  - GitHub Actions (`.github/workflows/deploy-ec2.yml`)가 트리거되어 AWS EC2 서버에 SSH 접속 후:
    1. 최신 코드 풀 (`git pull origin main`)
    2. 의존성 갱신 및 Prisma 클라이언트 빌드
    3. Docker Compose (`docker-compose.ec2.yml`) 컨테이너 무중단 재빌드
    4. 기출 데이터 최신 시드 반영
