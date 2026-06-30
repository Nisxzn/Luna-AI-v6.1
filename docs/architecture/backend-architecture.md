# 04-backend-architecture.md

# Luna AI

## Backend Architecture

**Version:** 1.0
**Status:** Architecture Draft
**Application:** Luna AI – AI Native Code Editor

---

# 1. Purpose

This document defines the backend architecture of Luna AI.

The backend acts as the orchestration layer between the desktop application, AI providers, local workspace, database, Git repository, terminal, memory engine, and Retrieval-Augmented Generation (RAG).

Unlike a traditional CRUD backend, Luna AI's backend is an **AI orchestration platform** responsible for intelligent decision-making, streaming, and tool execution.

---

# 2. Goals

The backend must:

* Provide secure APIs.
* Orchestrate AI providers.
* Stream responses in real time.
* Manage workspaces.
* Execute tools safely.
* Support multi-agent workflows.
* Handle RAG retrieval.
* Manage long-term memory.
* Scale independently of the frontend.

---

# 3. High-Level Architecture

```text
                     Desktop Application
                              │
                              ▼
                      Express API Server
                              │
      ┌──────────────┬──────────────┬──────────────┐
      │              │              │              │
 Authentication   Workspace      AI Engine      Git Engine
      │              │              │              │
      └──────────────┴──────┬───────┴──────────────┘
                             │
                      Service Layer
                             │
      ┌──────────────┬──────────────┬──────────────┐
      │              │              │              │
 PostgreSQL      Vector DB      Local Files     node-pty
```

---

# 4. Backend Responsibilities

The backend is responsible for:

* Authentication
* User management
* Workspace management
* AI orchestration
* Model routing
* Memory management
* RAG retrieval
* File operations
* Git operations
* Terminal execution
* Agent execution
* Settings management
* Logging
* Notifications
* API validation

---

# 5. Technology Stack

## Runtime

* Node.js
* TypeScript

---

## Framework

* Express.js

---

## ORM

* Prisma

---

## Database

* PostgreSQL

---

## AI

* OpenAI
* Anthropic Claude
* Google Gemini
* Ollama
* OpenRouter

---

## Vector Database

* Qdrant

---

## Git

* simple-git

---

## Terminal

* node-pty

---

## Authentication

* Better Auth

---

## Validation

* Zod

---

# 6. Folder Structure

```text
apps/backend/

src/

config/

controllers/

routes/

middlewares/

services/

repositories/

database/

validators/

ai/

memory/

rag/

workspace/

terminal/

git/

agents/

events/

websocket/

jobs/

utils/

types/
```

---

# 7. API Layer

The API layer exposes REST endpoints and streaming endpoints.

Responsibilities:

* Request validation
* Authentication
* Authorization
* Error handling
* Response formatting

No business logic should exist inside controllers.

---

# 8. Controller Layer

Controllers receive requests and delegate work to services.

Examples:

```text
AuthController

WorkspaceController

EditorController

AIController

ChatController

GitController

TerminalController

SettingsController

MemoryController

RAGController
```

Controllers remain thin.

---

# 9. Service Layer

Business logic lives here.

Services:

```text
AuthService

WorkspaceService

EditorService

AIService

PromptService

MemoryService

RAGService

GitService

TerminalService

SearchService

NotificationService

SettingsService

AgentService
```

Services may communicate with each other but should avoid circular dependencies.

---

# 10. Repository Layer

Repositories abstract database access.

Examples:

```text
UserRepository

WorkspaceRepository

ChatRepository

MemoryRepository

DocumentRepository

SettingsRepository

AgentRepository
```

Repositories never contain business logic.

---

# 11. Middleware

Global middleware includes:

Authentication

Authorization

Logging

Request Validation

Error Handling

Rate Limiting

Request Timing

Workspace Context

---

# 12. Authentication Flow

```text
User Login

↓

Better Auth

↓

Access Token

↓

Refresh Token

↓

Authenticated Session

↓

Protected APIs
```

All protected endpoints validate user identity before processing requests.

---

# 13. Workspace API

Responsibilities:

* Open Workspace
* Close Workspace
* Recent Projects
* Workspace Metadata
* File Watchers
* Workspace Configuration

---

# 14. AI API

Endpoints include:

* Chat
* Streaming
* Inline Completion
* Explain Code
* Refactor
* Generate Tests
* Generate Documentation
* Multi-file Edit
* Tool Execution

Supports Server-Sent Events (SSE) for real-time streaming.

---

# 15. Memory API

Responsibilities:

* Store Session Memory
* Store Workspace Memory
* Retrieve Context
* Summarize Sessions
* Delete Memory
* Export Memory

---

# 16. RAG API

Responsibilities:

* Index Documents
* Update Index
* Delete Documents
* Semantic Search
* Retrieve Context
* Embedding Generation

---

# 17. Git API

Supports:

* Status
* Commit
* Push
* Pull
* Fetch
* Branches
* Diff
* History
* Merge
* Rebase
* Stash

---

# 18. Terminal API

Supports:

* Create Session
* Execute Command
* Stream Output
* Kill Process
* Restart Session
* Terminal History

Terminal output is streamed to the frontend.

---

# 19. WebSocket & Streaming

Real-time events include:

* AI streaming
* Terminal output
* Git updates
* Workspace indexing
* Notifications
* Agent progress

Streaming should be non-blocking and support reconnection.

---

# 20. Background Jobs

Background workers handle:

* Workspace indexing
* Embedding generation
* Memory summarization
* AI caching
* Git synchronization
* Cleanup tasks

These jobs should not block user interactions.

---

# 21. Error Handling

Errors are categorized into:

* Validation
* Authentication
* Authorization
* Workspace
* AI
* Git
* Terminal
* Database
* Network

Every error returns a standardized response format.

---

# 22. Logging Strategy

Log:

* API requests
* AI requests
* Terminal commands
* Git actions
* Authentication events
* Errors
* Performance metrics

Sensitive information must never be logged.

---

# 23. Security Principles

* Validate every request.
* Sanitize all user input.
* Never expose API keys.
* Encrypt sensitive data.
* Restrict terminal execution.
* Apply least-privilege access.
* Verify workspace trust before executing actions.

---

# 24. Performance Strategy

The backend should support:

* Streaming AI responses
* Large repositories
* Concurrent users
* Background indexing
* Cached AI context
* Efficient database queries
* Asynchronous processing

---

# 25. Scalability

The backend is designed to scale by separating services:

* AI Service
* Memory Service
* RAG Service
* Agent Service
* Workspace Service

Future deployments may run these services independently.

---

# 26. Engineering Standards

* Thin Controllers
* Rich Service Layer
* Repository Pattern
* Dependency Injection
* Strict TypeScript
* Centralized Error Handling
* Modular Services
* Testable Business Logic

---

# 27. Future Expansion

Planned backend capabilities:

* Multi-user collaboration
* Cloud workspaces
* AI usage analytics
* Plugin APIs
* Enterprise administration
* Team memory
* Distributed agents
* MCP (Model Context Protocol) support

---

# 28. Success Criteria

The backend architecture is successful when:

* Business logic remains isolated from transport layers.
* AI providers can be replaced without affecting the frontend.
* Services remain modular and independently testable.
* Streaming interactions are responsive and reliable.
* New backend capabilities can be introduced without major architectural changes.
* The system supports long-term growth while maintaining clean separation of concerns.
