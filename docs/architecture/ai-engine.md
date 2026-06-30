# 05-ai-engine.md

# Luna AI

## AI Engine Architecture

**Version:** 1.0
**Status:** Architecture Draft
**Application:** Luna AI – AI Native Code Editor

---

# 1. Purpose

This document defines the AI Engine architecture of Luna AI.

The AI Engine is the core intelligence layer responsible for understanding the workspace, reasoning about developer intent, orchestrating AI providers, executing tools, maintaining memory, retrieving project knowledge, and coordinating autonomous agents.

Unlike traditional chatbots, Luna AI operates as an **AI Operating System for software development**.

---

# 2. Objectives

The AI Engine must:

* Understand the entire project.
* Support multiple AI providers.
* Build intelligent context automatically.
* Stream responses in real time.
* Edit multiple files safely.
* Execute developer tools.
* Retrieve project knowledge.
* Maintain persistent memory.
* Coordinate autonomous agents.
* Optimize latency and cost.

---

# 3. High-Level Architecture

```text
                      User Prompt
                           │
                           ▼
                  Prompt Orchestrator
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
   Context Builder   Memory Engine     RAG Engine
          │                │                │
          └────────────────┼────────────────┘
                           ▼
                    Prompt Composer
                           ▼
                     Model Router
                           ▼
 ┌────────────┬─────────────┬─────────────┬─────────────┐
 │            │             │             │
Claude     OpenAI       Gemini      Ollama/OpenRouter
 │            │             │             │
 └────────────┴─────────────┴─────────────┘
                           ▼
                  Tool Calling Engine
                           ▼
                 Streaming Response Engine
                           ▼
                       Luna AI UI
```

---

# 4. AI Engine Components

The AI Engine consists of:

* Prompt Orchestrator
* Context Builder
* Prompt Composer
* Model Router
* Memory Engine
* RAG Engine
* Tool Calling Engine
* Streaming Engine
* Agent Coordinator
* Cost Optimizer
* Token Manager

Each component has a single responsibility.

---

# 5. Prompt Orchestrator

Responsibilities:

* Receive user requests.
* Identify developer intent.
* Determine required context.
* Select AI workflow.
* Trigger tool execution when required.
* Route requests to specialized agents.

The Prompt Orchestrator acts as the entry point for every AI interaction.

---

# 6. Context Builder

The Context Builder constructs the prompt context automatically.

Sources include:

* Current file
* Selected code
* Open editor tabs
* Workspace files
* Git diff
* Terminal output
* Diagnostics
* User preferences
* Session memory
* Long-term memory
* RAG documents

The objective is to maximize relevance while minimizing token usage.

---

# 7. Prompt Composer

The Prompt Composer converts structured context into a final prompt.

Responsibilities:

* System prompt generation
* User prompt insertion
* Context ordering
* Token optimization
* Prompt compression
* Safety instructions

The composer ensures consistent prompting across all providers.

---

# 8. Model Router

The Model Router dynamically selects the most appropriate AI provider.

Supported providers:

* Anthropic Claude
* OpenAI GPT
* Google Gemini
* Ollama
* OpenRouter

Selection criteria:

* Task complexity
* Context size
* Response speed
* Token cost
* Model availability
* User preference

---

# 9. Provider Responsibilities

## Claude

Best suited for:

* Architecture
* Refactoring
* Large repositories
* Reasoning
* Documentation

---

## OpenAI

Best suited for:

* Code generation
* Tool usage
* Fast chat
* Function calling

---

## Gemini

Best suited for:

* Long context
* Documentation
* Code explanation

---

## Ollama

Best suited for:

* Offline development
* Privacy-first workflows
* Local inference

---

## OpenRouter

Best suited for:

* Model experimentation
* Automatic provider fallback
* Cost optimization

---

# 10. Streaming Engine

Responsibilities:

* Token streaming
* Partial rendering
* Incremental updates
* Interrupt handling
* Retry logic

Streaming begins immediately after the first token is available.

---

# 11. Tool Calling Engine

The Tool Calling Engine allows the AI to interact with the development environment.

Available tools:

* Read File
* Write File
* Edit File
* Search Files
* Search Symbols
* Search Workspace
* Run Terminal Command
* Git Status
* Git Diff
* Git Commit
* Create File
* Delete File
* Rename File
* Open Documentation
* Update Memory
* Query RAG

Every tool execution requires validation before execution.

---

# 12. AI Workflows

Supported workflows:

* Chat
* Explain Code
* Refactor Code
* Fix Bugs
* Generate Tests
* Generate Documentation
* Review Pull Request
* Optimize Performance
* Generate Components
* Multi-file Editing

Each workflow uses a dedicated prompt template.

---

# 13. Context Prioritization

Context priority:

1. Selected code
2. Current file
3. Open editor tabs
4. Recent edits
5. Git changes
6. Workspace memory
7. Session memory
8. RAG documents
9. Project configuration

Lower-priority information is discarded first when token limits are reached.

---

# 14. Token Management

The Token Manager is responsible for:

* Context trimming
* Compression
* Duplicate removal
* Token estimation
* Provider limit awareness

The goal is to maximize useful information within model constraints.

---

# 15. AI Memory Integration

The AI Engine interacts with:

* Session Memory
* Workspace Memory
* Long-Term Memory

Memory is queried before every AI request and updated after meaningful interactions.

---

# 16. RAG Integration

The AI Engine requests:

* Project documentation
* README files
* API references
* Design documents
* Technical notes

Retrieved documents are ranked before inclusion in the prompt.

---

# 17. Multi-file Editing

Workflow:

```text
User Request
      │
      ▼
Planner
      │
Identify Files
      │
Generate Diffs
      │
Review
      │
User Approval
      │
Apply Changes
```

AI never modifies multiple files without presenting a review.

---

# 18. AI Agent Coordinator

The Agent Coordinator manages specialized agents.

Initial agents:

* Coding Agent
* Refactoring Agent
* Testing Agent
* Documentation Agent
* Git Agent
* Terminal Agent
* Review Agent

Future agents can be added without modifying existing workflows.

---

# 19. Error Recovery

If an AI request fails:

* Retry if appropriate.
* Switch provider if configured.
* Preserve conversation state.
* Notify the user gracefully.
* Log diagnostics.

No user context should be lost.

---

# 20. Cost Optimization

Strategies:

* Reuse cached responses.
* Compress context.
* Select smaller models for simple tasks.
* Avoid duplicate embeddings.
* Cache workspace metadata.

---

# 21. AI Safety

The AI Engine must:

* Respect workspace trust.
* Prevent prompt injection.
* Restrict dangerous tool execution.
* Validate generated edits.
* Protect secrets and API keys.

Every tool invocation passes through a permission layer.

---

# 22. Extensibility

The AI Engine supports:

* Additional providers
* Custom prompts
* Custom tools
* Community agents
* Enterprise models
* Future MCP servers

No architectural changes should be required to integrate new providers.

---

# 23. Performance Targets

* First streamed token < 700 ms
* Context building < 200 ms
* Tool execution < 100 ms (local)
* Prompt composition < 50 ms
* Model routing < 20 ms

The engine should remain responsive even with large repositories.

---

# 24. Engineering Principles

* Provider-agnostic architecture
* Context-first reasoning
* Tool-driven execution
* Streaming by default
* Memory-aware interactions
* Safe file modification
* Modular AI services
* Observable workflows

---

# 25. Success Criteria

The AI Engine architecture is successful when:

* AI understands the user's workspace without excessive manual context.
* Models can be switched dynamically with no UI changes.
* Tool execution is safe, auditable, and extensible.
* Multi-file edits are reliable and reviewable.
* Memory and RAG improve answer quality over time.
* New providers, tools, and agents can be integrated with minimal engineering effort.
