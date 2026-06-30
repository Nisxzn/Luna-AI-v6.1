# 01-system-overview.md

# Luna AI

## System Overview & Software Architecture

**Version:** 1.0
**Status:** Architecture Draft
**Owner:** Luna AI Engineering

---

# 1. Purpose

This document defines the complete high-level architecture of Luna AI. It describes the system vision, major software modules, communication flow, responsibilities, technology stack, engineering principles, and scalability strategy.

This document serves as the primary reference for all future implementation decisions.

---

# 2. Vision

Luna AI is a desktop-first AI-native development environment designed to help developers build software faster by combining an intelligent code editor, autonomous AI agents, workspace understanding, Retrieval-Augmented Generation (RAG), integrated terminal, Git tools, and multi-model AI support into a single application.

Unlike traditional IDEs where AI is an extension, AI is treated as a first-class component deeply integrated into every developer workflow.

---

# 3. Objectives

The platform must:

* Understand the entire workspace.
* Edit multiple files safely.
* Maintain long-term project memory.
* Retrieve contextual information from documentation.
* Execute terminal commands intelligently.
* Support multiple LLM providers.
* Provide extensible agent workflows.
* Operate efficiently on large repositories.
* Be modular and maintainable.

---

# 4. High-Level Architecture

```text
                           ┌────────────────────────────┐
                           │     Electron Desktop       │
                           └─────────────┬──────────────┘
                                         │
                           React + TypeScript Frontend
                                         │
      ┌──────────────────────────────────┼──────────────────────────────────┐
      │                                  │                                  │
 Workspace Engine                  AI Engine                        System Services
      │                                  │                                  │
      │                                  │                                  │
Explorer                    Prompt Engine                    Authentication
Editor                      Context Builder                  Settings
Search                      Memory Engine                    Notifications
Terminal                    Model Router                     Logging
Git                          Tool Calling                    Updates
      │                                  │
      └──────────────────────────┬───────┘
                                 │
                           Backend Services
                                 │
      ┌──────────────┬──────────────┬──────────────┬──────────────┐
      │              │              │              │
 PostgreSQL     Vector DB      Local Files      Git Repository
```

---

# 5. System Layers

## Presentation Layer

Responsible for all user interaction.

Includes:

* Landing
* Authentication
* Workspace
* Editor
* Explorer
* AI Chat
* Terminal
* Search
* Git
* Settings

Responsibilities

* Display data
* Handle user interaction
* Render UI
* Manage local UI state

---

## Application Layer

Contains business logic.

Responsible for:

* Project lifecycle
* Workspace state
* File operations
* AI orchestration
* User workflows

---

## AI Layer

Responsible for all AI operations.

Modules:

* Prompt Builder
* Context Builder
* Memory Engine
* Model Router
* Tool Calling
* Streaming Engine
* Agent Coordinator

---

## Infrastructure Layer

Responsible for:

* Local filesystem
* Database
* Vector storage
* Git
* Terminal
* Authentication
* Configuration

---

# 6. Core Modules

## Workspace

Responsible for:

* Opening projects
* Managing sessions
* File indexing
* Search
* Navigation

---

## Editor

Responsible for:

* File editing
* Tabs
* Split editors
* Diagnostics
* AI inline actions

---

## Explorer

Responsible for:

* Folder tree
* File operations
* Git decorations
* Search
* Drag & Drop

---

## AI Chat

Responsible for:

* Conversations
* Streaming
* Workspace context
* AI actions
* Multi-file edits

---

## Terminal

Responsible for:

* Command execution
* Terminal sessions
* AI-assisted debugging
* Shell integration

---

## Git

Responsible for:

* Branch management
* Commits
* Diff visualization
* Pull requests
* Merge conflict handling

---

## Search

Responsible for:

* Global search
* Symbol search
* Workspace search
* Documentation search

---

## Memory

Responsible for:

* Session memory
* Workspace memory
* Long-term memory
* User preferences

---

## RAG

Responsible for:

* Documentation indexing
* Embedding generation
* Semantic retrieval
* Context enrichment

---

## AI Agents

Responsible for:

* Multi-step planning
* Autonomous workflows
* Tool execution
* Multi-file operations

---

# 7. Request Flow

```text
Developer

↓

Editor

↓

Context Builder

↓

Workspace Analysis

↓

Memory Retrieval

↓

RAG Retrieval

↓

Prompt Builder

↓

Model Router

↓

Selected LLM

↓

Streaming Engine

↓

Editor
```

---

# 8. Startup Flow

```text
Launch Application

↓

Electron Bootstrap

↓

Initialize React

↓

Load User Preferences

↓

Restore Previous Workspace

↓

Initialize Workspace

↓

Initialize AI Engine

↓

Initialize Memory

↓

Initialize Git

↓

Initialize Terminal

↓

Application Ready
```

---

# 9. Workspace Opening Flow

```text
Open Project

↓

Validate Workspace

↓

Read Configuration

↓

Start File Watcher

↓

Index Files

↓

Read Git Repository

↓

Generate Workspace Metadata

↓

Initialize Search Index

↓

Ready
```

---

# 10. AI Request Flow

```text
User Prompt

↓

Collect Current File

↓

Collect Selected Code

↓

Collect Workspace Context

↓

Collect Git Diff

↓

Collect Memory

↓

Collect RAG Documents

↓

Prompt Builder

↓

Model Router

↓

AI Provider

↓

Streaming Response

↓

User
```

---

# 11. Multi-file Editing Flow

```text
Prompt

↓

Planning Agent

↓

Identify Files

↓

Generate Changes

↓

Diff Generator

↓

Review Screen

↓

User Approval

↓

Apply Changes

↓

Save Files
```

---

# 12. Workspace Services

* Workspace Manager
* Session Manager
* File Watcher
* File Indexer
* Search Engine
* Explorer Service
* Metadata Cache
* Recent Projects
* Project Templates

---

# 13. AI Services

* Model Router
* Prompt Builder
* Context Builder
* Memory Manager
* Embedding Engine
* Tool Executor
* Agent Coordinator
* Streaming Service

---

# 14. Backend Services

* Authentication
* User Management
* Workspace Management
* Chat Service
* Memory Service
* RAG Service
* Agent Service
* Git Service
* Terminal Service
* Configuration Service

---

# 15. External Integrations

AI Providers

* OpenAI
* Anthropic Claude
* Google Gemini
* Ollama
* OpenRouter

Developer Services

* GitHub
* GitLab
* Bitbucket

Infrastructure

* PostgreSQL
* Qdrant
* Local Filesystem

---

# 16. Non-Functional Requirements

Performance

* Startup < 3 seconds
* File search < 100 ms
* AI response streaming < 500 ms
* Workspace indexing in background

Scalability

* 100k+ files
* Multi-million token contexts
* Large Git repositories
* Multiple workspaces

Reliability

* Auto recovery
* Session restore
* Crash protection
* Auto-save

Security

* Local-first
* Encrypted secrets
* Workspace trust
* Sandboxed terminal

---

# 17. Engineering Principles

* Feature-first architecture
* Modular design
* Separation of concerns
* SOLID principles
* Dependency inversion
* Service-oriented architecture
* Plugin-ready modules
* Offline-first capabilities
* Type safety
* Testability

---

# 18. Technology Stack

## Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* shadcn/ui
* Monaco Editor
* Zustand
* TanStack Query
* TanStack Router

## Desktop

* Electron

## Backend

* Node.js
* Express
* TypeScript

## Database

* PostgreSQL
* Prisma ORM

## AI

* OpenAI
* Anthropic Claude
* Google Gemini
* Ollama
* OpenRouter

## RAG

* LangChain
* Qdrant

## Terminal

* node-pty

## Git

* simple-git

---

# 19. Future Roadmap

Phase 1

* AI IDE MVP

Phase 2

* Multi-Agent System

Phase 3

* Plugin Marketplace

Phase 4

* Cloud Workspace

Phase 5

* Real-time Collaboration

Phase 6

* Enterprise Management

Phase 7

* Workflow Automation

Phase 8

* MCP Ecosystem Integration

---

# 20. Success Criteria

The architecture is considered successful when:

* Modules remain independently maintainable.
* AI providers can be swapped without affecting the UI.
* New tools and agents can be added without major refactoring.
* Large repositories remain performant.
* Features can be developed in parallel by multiple engineers.
* The system supports long-term scalability without architectural redesign.
