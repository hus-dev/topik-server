# TOPIK Server

A NestJS-based backend API for TOPIK (Test of Proficiency in Korean) learning platform.

## Tech Stack

- **Framework**: NestJS 11.x with TypeScript
- **Database**: MySQL 8.0 via Prisma ORM with MariaDB adapter
- **Authentication**: JWT with Passport.js
- **Caching/Sessions**: Redis
- **Validation**: class-validator + class-transformer
- **Documentation**: Swagger/OpenAPI (available at `/api`)

## Project Structure

```
src/
├── auth/              # Authentication module (JWT, guards, strategies)
├── bookmarks/         # User bookmarks functionality
├── common/            # Shared utilities and pipes
├── config/            # Configuration module
├── explanation-videos/ # Video explanations for questions
├── grammar/           # Grammar learning features
├── mock-exams/        # Mock exam functionality
├── offline/           # Offline content support
├── practice-sessions/ # Practice session management
├── prisma/            # Prisma service and module
├── question-sets/     # Question set management
├── questions/         # Question CRUD operations
├── redis/             # Redis module
├── topik-exam-schedules/ # Exam schedule information
├── users/             # User management
└── vocabulary/        # Vocabulary learning features
```

## Development

### Setup

```bash
# Install dependencies
npm install

# Run with Docker (includes MySQL and Redis)
docker compose up --build

# Development server
npm run start:dev
```

### Database

- Database runs on MySQL 8.0 (exposed on port 3307)
- Prisma schema: `prisma/schema.prisma`
- Seed files in `prisma/seed/`

```bash
# Run seed
npm run db:seed

# Other seed/import commands available:
npm run seed:dev
npm run seed:reading-photos
npm run import:reading-content
npm run import:listening-content
npm run import:writing-content
npm run import:vocabulary-content
npm run import:grammar-content
```

### Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Common Tasks

### Running the Application

```bash
# Development mode
npm run start:dev

# Production mode
npm run start:prod

# Debug mode
npm run start:debug
```

### Code Quality

```bash
# Format code
npm run format

# Lint and fix
npm run lint
```

## API Endpoints

- API base: `http://localhost:3000`
- Swagger docs: `http://localhost:3000/api`

## Docker Services

| Service | Port | Description |
|---------|------|-------------|
| MySQL   | 3307 | Database (connection: `mysql://topik_user:topik_password@localhost:3307/topik_smart_academy`) |
| Redis   | 6379 | Cache/Sessions |
| API     | 3000 | NestJS server |

## Module Patterns

- Each feature module follows NestJS conventions: `*.module.ts`, `*.service.ts`, `*.controller.ts`
- DTOs are in `dto/` subdirectories within each module
- Guards are in `guards/` subdirectories
- Global validation pipe with `whitelist`, `forbidNonWhitelisted`, and `transform` enabled