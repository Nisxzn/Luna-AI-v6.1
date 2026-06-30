# Luna AI

Production-grade AI assistant platform built with a monorepo architecture.

## Architecture

This is a monorepo using pnpm workspaces and TurboRepo for efficient development and builds.

### Structure

```
luna-ai/
├── apps/              # Application entry points
│   ├── desktop/       # Electron desktop application
│   ├── backend/       # Express backend API
│   └── website/       # React + Vite web application
├── packages/          # Shared packages
│   ├── ui/            # Reusable UI components
│   ├── shared/        # Shared utilities and helpers
│   ├── editor/        # Editor components
│   ├── types/         # TypeScript type definitions
│   └── ai/            # AI integration utilities
├── services/          # Microservices
│   ├── chat/          # Chat service
│   ├── rag/           # RAG (Retrieval-Augmented Generation) service
│   ├── memory/        # Memory management service
│   ├── workspace/     # Workspace management service
│   ├── tools/         # Tools service
│   └── agents/        # AI agents service
├── docs/              # Documentation
├── scripts/           # Build and utility scripts
└── .lovable/          # Lovable integration
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### Installation

```bash
# Install dependencies
pnpm install
```

### Development

```bash
# Run all apps in development mode
pnpm dev

# Run specific app
pnpm --filter @luna-ai/website dev
pnpm --filter @luna-ai/backend dev
pnpm --filter @luna-ai/desktop dev
```

### Build

```bash
# Build all packages and apps
pnpm build

# Build specific package
pnpm --filter @luna-ai/ui build
```

### Linting & Type Checking

```bash
# Lint all packages
pnpm lint

# Type check all packages
pnpm typecheck

# Format code
pnpm format
```

## Environment Variables

Copy `.env.example` to `.env` and configure the required environment variables for each service.

## Technology Stack

- **Package Manager**: pnpm
- **Build System**: TurboRepo
- **Language**: TypeScript
- **Frontend**: React + Vite
- **Desktop**: Electron
- **Backend**: Express
- **Styling**: TailwindCSS (planned)
- **Linting**: ESLint
- **Formatting**: Prettier

## License

Private - All rights reserved
