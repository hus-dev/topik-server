# TopikGo - Backend Server (topik-server)

TopikGo 애플리케이션의 백엔드 서버입니다. NestJS 기반의 RESTful API를 제공하며, MySQL과 Redis를 활용하여 효율적이고 확장 가능한 아키텍처를 구성하고 있습니다.

## 🛠 기술 스택 (Tech Stack)

- **Framework**: [NestJS](https://nestjs.com/) (Node.js / TypeScript)
- **Database**: MySQL 8.0
- **ORM**: [Prisma](https://www.prisma.io/)
- **Caching & Session**: Redis
- **Authentication**: JWT (JSON Web Token), OAuth (Google, Kakao)
- **API Documentation**: Swagger (OpenAPI)
- **Infrastructure**: Docker & Docker Compose

## 🏗 아키텍처 (Architecture)

TopikGo 백엔드는 전형적인 Controller-Service-Repository 패턴(Prisma)을 따르고 있습니다.

- **Controller**: 클라이언트(Flutter 앱)의 HTTP 요청을 처리하고 응답을 반환합니다.
- **Service**: 비즈니스 로직을 담당하며, 데이터베이스나 외부 API(Social Login 등)와 통신합니다.
- **Prisma**: MySQL 데이터베이스와의 상호작용을 담당합니다.
- **Redis**: 캐싱, Refresh Token 관리, 임시 데이터 저장 등에 사용됩니다.

## ✨ 주요 기능 (Key Features)

1. **인증 및 인가 (Auth)**
   - 이메일/비밀번호 기반 로컬 로그인 및 회원가입
   - Google 및 Kakao 소셜 로그인 연동
   - JWT 기반의 Access Token 및 Refresh Token 관리 (보안 강화)

2. **사용자 관리 (Users)**
   - 사용자 프로필 조회 및 수정
   - 비밀번호 변경 기능

3. **TOPIK 학습 콘텐츠 제공**
   - 사용자 레벨(Target Level)에 맞춘 학습 모드 지원

4. **성능 최적화**
   - Redis를 활용한 빈번한 데이터 조회 캐싱 (`scanStream` 기반의 안전한 키 관리 적용)
   - BigInt 직렬화 처리 등 안전한 데이터 핸들링

## 💾 데이터베이스 구조 (Database Schema)

Prisma ORM을 통해 아래와 같은 주요 엔티티를 관리합니다 (상세 스키마는 `prisma/schema.prisma` 참고):

- **User**: 사용자 인증 정보, 프로필, 설정 (학습 레벨, 언어, 타임존 등)

## 🚀 설치 및 실행 방법 (Installation & Running)

### 1. 패키지 설치
```bash
$ yarn install
```

### 2. Docker를 이용한 인프라 실행 (MySQL, Redis 등)
로컬 개발 환경에서는 Docker Compose를 사용하여 데이터베이스와 캐시 서버를 쉽게 띄울 수 있습니다.
```bash
# .env.docker.example 파일을 참고하여 환경변수 파일 생성
$ cp .env.docker.example .env.docker

# Docker 컨테이너 실행
$ docker compose up -d
```

### 3. Prisma 마이그레이션 적용
```bash
# 데이터베이스 스키마 동기화 및 Prisma Client 생성
$ yarn prisma migrate dev
$ yarn prisma generate
```

### 4. 서버 실행
```bash
# 개발 모드 (코드가 변경되면 자동 재시작)
$ yarn run start:dev

# 프로덕션 모드 빌드 및 실행
$ yarn run build
$ yarn run start:prod
```

## ⚙️ 환경 변수 설정 (Environment Variables)

프로젝트 루트에 `.env` 파일을 생성하고 다음 변수들을 설정해야 합니다:

```env
# Database (Prisma)
DATABASE_URL="mysql://topik_user:topik_password@localhost:3307/topik_smart_academy"

# Redis
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD=""

# JWT Auth
JWT_SECRET="your_jwt_secret_key_here"

# Social Login (Google)
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_IDS="your_google_client_id_1,your_google_client_id_2"
```

## 📚 API 문서 (API Documentation)

서버가 실행된 후, 아래 URL에 접속하여 Swagger UI를 통해 모든 API 명세를 확인하고 테스트할 수 있습니다.

- **Swagger UI**: `http://localhost:3000/api`
- **Base URL**: `http://localhost:3000`

---
*이 프로젝트는 TopikGo 모바일 앱과 통신하기 위한 백엔드 서비스입니다.*
