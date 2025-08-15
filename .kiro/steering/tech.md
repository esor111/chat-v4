# Technology Stack

## Backend Stack

- **Framework**: NestJS (Node.js framework)
- **Language**: TypeScript
- **Database**: PostgreSQL with TypeORM
- **Caching**: Redis with ioredis client
- **Authentication**: JWT with Passport.js
- **WebSockets**: Socket.IO for real-time communication
- **Validation**: class-validator and class-transformer
- **Testing**: Jest
- **API Documentation**: Swagger/OpenAPI

## Frontend Stack

- **Framework**: React 19
- **Language**: TypeScript
- **Build Tool**: Vite
- **HTTP Client**: Axios
- **WebSocket Client**: Socket.IO Client

## Development Tools

- **Package Manager**: npm
- **Linting**: ESLint
- **Formatting**: Prettier
- **Process Manager**: Concurrently (for running multiple services)

## Common Commands

### Backend Development
```bash
# Install dependencies
npm install

# Development server with hot reload
npm run start:dev

# Build for production
npm run build

# Run tests
npm run test
npm run test:cov

# Database migrations
npm run migration:generate -- -n MigrationName
npm run migration:run
npm run migration:revert

# Linting and formatting
npm run lint
npm run format
```

### Frontend Development
```bash
# Install frontend dependencies
npm run install:all

# Run frontend only
npm run dev:frontend

# Run both backend and frontend
npm run dev:all

# Build both projects
npm run build:all
```

### Environment Setup

- Copy `.env.example` to `.env` and configure:
  - Database connection (PostgreSQL)
  - Redis connection
  - JWT secrets
  - External service URLs and tokens

## Path Aliases

The project uses TypeScript path aliases for clean imports:
- `@domain/*` → `src/domain/*`
- `@application/*` → `src/application/*`
- `@infrastructure/*` → `src/infrastructure/*`
- `@presentation/*` → `src/presentation/*`