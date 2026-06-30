# 08-rag.md

# Luna AI

## Retrieval-Augmented Generation (RAG) Architecture

**Version:** 1.0
**Status:** Architecture Draft
**Application:** Luna AI – AI Native Code Editor

---

# 1. Purpose

This document defines the Retrieval-Augmented Generation (RAG) architecture used by Luna AI.

The RAG Engine enables Luna AI to understand an entire project by retrieving relevant information from source code, documentation, technical notes, APIs, and workspace knowledge before generating AI responses.

Rather than relying solely on an LLM's context window, the RAG Engine dynamically retrieves the most relevant information for every request.

---

# 2. Objectives

The RAG Engine must:

* Understand large repositories.
* Retrieve relevant project context.
* Support semantic search.
* Reduce hallucinations.
* Improve AI accuracy.
* Minimize unnecessary tokens.
* Continuously update project knowledge.
* Scale to enterprise repositories.

---

# 3. High-Level Architecture

```text id="ai2mwb"
              Workspace Files
                     │
                     ▼
              Document Scanner
                     │
                     ▼
              Document Parser
                     │
                     ▼
               Chunk Generator
                     │
                     ▼
             Embedding Generator
                     │
                     ▼
              Vector Database
                     │
                     ▼
            Semantic Retriever
                     │
                     ▼
              Context Ranker
                     │
                     ▼
              Prompt Builder
                     │
                     ▼
                 AI Provider
```

---

# 4. Core Components

The RAG Engine consists of:

* Document Scanner
* File Parser
* Chunk Generator
* Embedding Generator
* Vector Store
* Semantic Retriever
* Context Ranker
* Context Compressor
* Prompt Integration Service

Each component performs a single responsibility.

---

# 5. Document Scanner

Responsibilities:

* Detect project files
* Ignore excluded folders
* Watch new files
* Detect deleted files
* Detect modified files
* Trigger re-indexing

Supported directories:

* src/
* docs/
* packages/
* apps/
* README
* API Docs
* Markdown
* Configuration

---

# 6. Supported File Types

Code

* TypeScript
* JavaScript
* Python
* Java
* Go
* Rust
* C#
* C++
* PHP

Documentation

* Markdown
* MDX
* PDF
* HTML
* TXT

Configuration

* JSON
* YAML
* TOML
* XML

---

# 7. Parsing Engine

The parser extracts meaningful information.

Extract:

* Functions
* Classes
* Interfaces
* Variables
* Comments
* Imports
* Exports
* Dependencies
* Documentation

Parser output becomes structured metadata.

---

# 8. Chunk Generation

Documents are divided into semantic chunks.

Chunking strategy:

* Function-based
* Class-based
* Documentation section
* Paragraph
* API endpoint
* Configuration block

Avoid arbitrary fixed-size chunks whenever possible.

---

# 9. Embedding Generation

Each chunk is converted into an embedding.

Embedding sources:

* Source code
* Documentation
* README
* API Docs
* Memory
* Git summaries

Embedding generation runs asynchronously.

---

# 10. Vector Database

Qdrant stores:

* Embeddings
* Chunk IDs
* Metadata
* Workspace references
* Language
* Document type

Source code is never duplicated.

Only embeddings and metadata are stored.

---

# 11. Semantic Search

Query flow:

```text id="tjlwm6"
User Question

↓

Embedding

↓

Vector Search

↓

Top Matching Chunks

↓

Ranking

↓

Context Builder

↓

Prompt
```

Semantic search replaces keyword matching.

---

# 12. Ranking Engine

Retrieved chunks are ranked using:

* Similarity score
* File importance
* Recent edits
* Current workspace
* Current file
* Git changes
* User activity
* Memory relevance

Highest-ranked chunks are selected.

---

# 13. Context Compression

If retrieved context exceeds token limits:

* Remove duplicates
* Merge related chunks
* Summarize documentation
* Compress repeated patterns

Maintain essential information while reducing token usage.

---

# 14. AI Integration

The RAG Engine provides context for:

* Chat
* Explain Code
* Refactor
* Bug Fixes
* Test Generation
* Documentation
* Repository Analysis
* Architecture Review

The AI Engine never queries the vector database directly.

---

# 15. Incremental Indexing

Only changed files are re-indexed.

Workflow:

```text id="rqu5lt"
File Saved

↓

File Watcher

↓

Detect Changes

↓

Reparse

↓

Generate Embeddings

↓

Update Vector Store
```

Full re-indexing occurs only when explicitly requested.

---

# 16. Retrieval Sources

Priority order:

1. Current file
2. Selected code
3. Open tabs
4. Workspace Memory
5. Documentation
6. Git Changes
7. API Docs
8. README
9. Long-Term Memory

---

# 17. Workspace Awareness

Each retrieved chunk contains:

* Workspace ID
* File Path
* Language
* Module
* Last Updated
* Git Branch
* Symbol Information

This enables AI to understand project structure.

---

# 18. Search Types

Supported searches:

* Semantic Search
* Documentation Search
* API Search
* Component Search
* Symbol Search
* Architecture Search
* Configuration Search
* Dependency Search

---

# 19. Performance Strategy

Target performance:

* Embedding Generation < 300 ms per file
* Retrieval < 100 ms
* Ranking < 30 ms
* Context Compression < 50 ms

Background indexing should never interrupt development.

---

# 20. Excluded Files

Never index:

* node_modules
* .git
* dist
* build
* coverage
* binaries
* temporary files
* generated assets

These paths are configurable.

---

# 21. Security

Never send:

* API keys
* Environment secrets
* Private certificates
* Ignored files
* Sensitive configuration

Sensitive content must be filtered before embedding generation.

---

# 22. Engineering Principles

* Incremental indexing
* Semantic retrieval
* Context-first AI
* Minimal token usage
* Metadata-driven retrieval
* Background processing
* Workspace awareness
* Secure indexing

---

# 23. Future Enhancements

Planned improvements:

* Hybrid keyword + semantic search
* Cross-workspace retrieval
* Team knowledge bases
* Cloud documentation sync
* Enterprise documentation portals
* Automatic architecture summarization
* Multi-repository retrieval
* External knowledge connectors

---

# 24. Success Criteria

The RAG architecture is successful when:

* AI consistently retrieves relevant project context.
* Repository indexing remains efficient for large codebases.
* Semantic retrieval improves response quality over keyword search.
* Token usage is optimized through intelligent ranking and compression.
* New documentation sources can be integrated without architectural changes.
* The RAG Engine scales seamlessly from personal projects to enterprise repositories.
