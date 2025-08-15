# Project Structure

## Clean Architecture Layers

The project follows Clean Architecture principles with clear separation of concerns across four main layers:

### Domain Layer (`src/domain/`)
- **Entities**: Core business objects with identity
- **Value Objects**: Immutable objects that describe aspects of the domain
- **Repository Interfaces**: Contracts for data access
- **Business Logic**: Core domain rules and validations

### Application Layer (`src/application/`)
- **Use Cases**: Application-specific business rules
- **Services**: Application services that orchestrate domain objects
- **DTOs**: Data Transfer Objects for application boundaries

### Infrastructure Layer (`src/infrastructure/`)
- **Database**: TypeORM configuration, entities, and repositories
- **Auth**: Authentication strategies, guards, and decorators
- **Config**: Environment configuration and validation
- **Logging**: Structured logging with correlation IDs
- **Profile**: External service integrations and caching

### Presentation Layer (`src/presentation/`)
- **Controllers**: HTTP endpoints and request handling
- **DTOs**: Request/response data structures
- **Guards**: Route protection and authorization
- **Modules**: NestJS module organization

## Directory Structure

```
├── src/
│   ├── domain/                 # Domain layer
│   │   ├── entities/          # Domain entities
│   │   ├── value-objects/     # Value objects
│   │   └── repositories/      # Repository interfaces
│   ├── application/           # Application layer
│   │   └── services/          # Application services
│   ├── infrastructure/        # Infrastructure layer
│   │   ├── auth/             # Authentication & authorization
│   │   ├── config/           # Configuration management
│   │   ├── database/         # Database setup & migrations
│   │   ├── logging/          # Logging infrastructure
│   │   └── profile/          # Profile services & caching
│   └── presentation/         # Presentation layer
│       ├── auth/             # Auth endpoints
│       ├── chat/             # Chat endpoints
│       ├── users/            # User endpoints
│       ├── conversations/    # Conversation endpoints
│       └── api/              # API modules
├── chat-frontend/            # React frontend application
├── scripts/                  # Database and setup scripts
└── dist/                     # Compiled output
```

## Naming Conventions

### Files and Directories
- Use kebab-case for file and directory names
- Add appropriate suffixes: `.service.ts`, `.controller.ts`, `.entity.ts`, `.vo.ts` (value object)
- Group related files in feature directories

### Classes and Interfaces
- Use PascalCase for classes and interfaces
- Prefix interfaces with `I` (e.g., `IConversationRepository`)
- Use descriptive names that reflect domain concepts

### Methods and Variables
- Use camelCase for methods and variables
- Use descriptive names that express intent
- Prefer explicit over abbreviated names

## Module Organization

Each feature should be organized as a NestJS module with:
- Controller for HTTP endpoints
- Service for business logic
- Module file for dependency injection
- DTOs for request/response validation
- Tests in `__tests__` directories

## Testing Structure

- Unit tests: `*.spec.ts` files alongside source code
- Integration tests: `src/__tests__/` directory
- Test configuration: `jest.config.js`
- Coverage reports: `coverage/` directory

## Configuration Management

- Environment variables in `.env` files
- Validation schemas in `src/infrastructure/config/`
- Type-safe configuration using `@nestjs/config`