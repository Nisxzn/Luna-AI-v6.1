# 02-project-structure.md

# Luna AI

## Project Structure & Repository Organization

**Version:** 1.0
**Status:** Architecture Draft

---

# 1. Purpose

This document defines the official repository structure for Luna AI.

The goal is to organize the project into independent modules that can evolve without tightly coupling unrelated features.

The architecture follows a **feature-first, modular monorepo approach**.

---

# 2. Design Principles

The repository should follow these principles:

* Feature-first organization
* Clear separation of frontend and backend
* Shared code extracted into reusable packages
* Independent AI modules
* Scalable workspace architecture
* Plugin-ready
* Easily testable
* Production maintainable

---

# 3. Repository Structure

```text
code-weaver-ai/

├── apps/
│
│   ├── desktop/
│   ├── backend/
│
├── packages/
│
│   ├── ui/
│   ├── shared/
│   ├── ai/
│   ├── memory/
│   ├── rag/
│   ├── git/
│   ├── terminal/
│   ├── workspace/
│   ├── agents/
│   ├── database/
│
├── docs/
│
├── scripts/
│
├── .github/
│
├── package.json
└── turbo.json
```

---

# 4. Desktop Application

```text
apps/desktop/

src/

assets/

components/

features/

layouts/

pages/

router/

services/

stores/

hooks/

utils/

types/

styles/

constants/

providers/

contexts/

workers/

main/

preload/

renderer/
```

---

# 5. Component Organization

```text
components/

ui/

common/

layout/

editor/

explorer/

chat/

terminal/

git/

search/

command-palette/

settings/

notifications/

dialogs/

forms/

landing/

authentication/
```

---

# 6. Feature Modules

Each feature owns everything related to itself.

```text
features/

workspace/

editor/

explorer/

chat/

terminal/

search/

git/

memory/

rag/

agents/

authentication/

settings/

extensions/

notifications/
```

Each feature contains:

```text
index.ts

components/

hooks/

services/

stores/

types/

utils/

constants/
```

---

# 7. Shared Package

```text
packages/shared/

types/

constants/

validators/

errors/

helpers/

utils/

hooks/

models/
```

Everything inside this package should remain framework independent.

---

# 8. UI Package

```text
packages/ui/

buttons/

cards/

dialogs/

inputs/

tables/

modals/

sidebar/

toolbar/

tabs/

badges/

tooltips/

icons/

animations/
```

Shared reusable UI components.

---

# 9. AI Package

```text
packages/ai/

providers/

router/

prompts/

streaming/

planner/

reasoning/

tools/

completion/

embeddings/

chat/

context/

```

Responsibilities:

* AI Providers
* Prompt Engine
* Tool Calling
* Streaming
* Context Building

---

# 10. Memory Package

```text
packages/memory/

session/

workspace/

long-term/

cache/

summaries/

retrieval/

storage/
```

---

# 11. RAG Package

```text
packages/rag/

chunking/

embeddings/

retrieval/

ranking/

indexing/

documents/

vector-db/
```

---

# 12. Workspace Package

```text
packages/workspace/

file-system/

watcher/

indexer/

search/

metadata/

events/

project/

tabs/

navigation/
```

---

# 13. Terminal Package

```text
packages/terminal/

pty/

sessions/

commands/

history/

output/

parser/

ai/

```

---

# 14. Git Package

```text
packages/git/

repository/

branches/

commits/

history/

diff/

merge/

stash/

pull-request/
```

---

# 15. Agent Package

```text
packages/agents/

planner/

executor/

tasks/

tools/

memory/

coordination/

workflows/

```

---

# 16. Database Package

```text
packages/database/

prisma/

repositories/

models/

migrations/

seed/

queries/
```

---

# 17. Backend Structure

```text
apps/backend/

src/

controllers/

services/

repositories/

routes/

middlewares/

validators/

database/

config/

ai/

memory/

rag/

workspace/

git/

terminal/

agents/

events/

websocket/

utils/
```

---

# 18. Documentation Structure

```text
docs/

architecture/

api/

database/

frontend/

backend/

deployment/

security/

ai/

rag/

memory/

agents/

roadmap/

contributing/

```

---

# 19. Assets

```text
assets/

icons/

images/

illustrations/

logos/

fonts/

animations/
```

---

# 20. Configuration

```text
config/

environment/

models/

workspace/

editor/

terminal/

git/

theme/
```

---

# 21. Testing Structure

```text
tests/

unit/

integration/

e2e/

fixtures/

mocks/

performance/

```

---

# 22. Naming Conventions

Folders:

* kebab-case

Files:

* kebab-case.ts

React Components:

* PascalCase.tsx

Hooks:

* useSomething.ts

Stores:

* something.store.ts

Services:

* something.service.ts

Repositories:

* something.repository.ts

Controllers:

* something.controller.ts

Routes:

* something.routes.ts

Types:

* something.types.ts

Constants:

* something.constants.ts

Validators:

* something.validator.ts

---

# 23. Import Rules

Allowed:

```
Feature

↓

Shared

↓

UI
```

Not Allowed:

```
Feature A

↓

Feature B

↓

Circular Dependency
```

Features should communicate through services, events, or shared abstractions.

---

# 24. Dependency Flow

```text
UI

↓

Features

↓

Services

↓

Repositories

↓

Database

↓

External APIs
```

No layer may directly bypass another without a justified architectural decision.

---

# 25. Scalability Strategy

The repository is designed to support:

* Multiple desktop platforms
* Multiple AI providers
* Plugin marketplace
* Team collaboration
* Cloud synchronization
* Enterprise features
* Multi-agent workflows
* Future mobile companion application

New features should be introduced as isolated feature modules without impacting existing functionality.

---

# 26. Refactoring Strategy (Current Lovable Export)

The exported UI should be reorganized gradually:

* Move reusable UI components into `packages/ui`
* Convert workspace sections into feature modules
* Extract AI logic into `packages/ai`
* Separate desktop-specific code into `apps/desktop`
* Introduce backend as an independent application under `apps/backend`
* Centralize shared types and utilities into `packages/shared`

This refactoring should be incremental, preserving functionality while improving maintainability and scalability.

---

# 27. Success Criteria

The repository structure is successful when:

* Every feature is independently maintainable.
* Shared code is reused instead of duplicated.
* New modules can be added without restructuring the repository.
* Frontend and backend evolve independently.
* AI providers, tools, and agents remain loosely coupled.
* The codebase supports long-term product growth with minimal architectural friction.
