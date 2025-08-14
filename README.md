# Chat Backend - Scalable NestJS Microservice

A scalable chat microservice system built with NestJS, featuring real-time messaging capabilities, PostgreSQL database, Redis caching, and JWT authentication.

## Architecture

This project follows a clean architecture with clear separation of concerns:

- **Domain Layer**: Contains entities, value objects, and business logic
- **Application Layer**: Contains use cases and application services
- **Infrastructure Layer**: Contains external concerns (database, auth, logging)
- **Presentation Layer**: Contains controllers and API endpoints

## Features

- 🏗️ **Clean Architecture**: Layered architecture with dependency inversion
- 🔐 **JWT Authentication**: Secure authentication with refresh tokens
- 📊 **PostgreSQL Database**: Robust relational database with TypeORM
- ⚡ **Redis Caching**: High-performance caching and real-time features
- 📝 **Structured Logging**: Comprehensive logging with correlation IDs
- 🧪 **Testing**: Unit tests with Jest
- 🔄 **Database Migrations**: Version-controlled database schema changes
- 📡 **Real-time Ready**: WebSocket support for real-time features

## Project Structure

```
src/
├── domain/                 # Domain layer (entities, value objects)
│   ├── entities/          # Domain entities
│   └── value-objects/     # Value objects
├── application/           # Application layer (use cases, services)
├── infrastructure/        # Infrastructure layer
│   ├── auth/             # Authentication services and strategies
│   ├── config/           # Configuration and validation
│   ├── database/         # Database configuration and migrations
│   └── logging/          # Logging services and middleware
└── presentation/         # Presentation layer
    ├── auth/             # Authentication endpoints
    ├── chat/             # Chat endpoints
    ├── users/            # User endpoints
    └── conversations/    # Conversation endpoints
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v13 or higher)
- Redis (v6 or higher)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment configuration:
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your database and Redis configurations

5. Run database migrations:
   ```bash
   npm run migration:run
   ```

### Development

Start the development server:
```bash
npm run start:dev
```

The API will be available at `http://localhost:3000`

### Testing

Run unit tests:
```bash
npm run test
```

Run tests with coverage:
```bash
npm run test:cov
```

### Building

Build for production:
```bash
npm run build
```

Start production server:
```bash
npm run start:prod
```

## API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh tokens

### Chat
- `GET /chat/health` - Health check (authenticated)

### Users
- `GET /users/profile` - Get user profile (authenticated)

### Conversations
- `GET /conversations` - Get user conversations (authenticated)

## Environment Variables

See `.env.example` for all available configuration options.

Key variables:
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` - Database configuration
- `REDIS_HOST`, `REDIS_PORT` - Redis configuration
- `JWT_SECRET`, `JWT_REFRESH_SECRET` - JWT secrets
- `KAHA_MAIN_V3_BASE_URL`, `KAHA_MAIN_V3_SERVICE_TOKEN` - External service integration

## Database Migrations

Generate a new migration:
```bash
npm run migration:generate -- -n MigrationName
```

Run migrations:
```bash
npm run migration:run
```

Revert last migration:
```bash
npm run migration:revert
```

## Contributing

1. Follow the established architecture patterns
2. Write tests for new features
3. Use structured logging for important events
4. Follow TypeScript best practices
5. Update documentation as needed

## License

MIT

offload
history
relfelaction


problem we have user in the diffrent project


