# 07-database.md

# Luna AI

## Database Architecture

**Version:** 1.0
**Status:** Architecture Draft
**Application:** Luna AI – AI Native Code Editor

---

# 1. Purpose

This document defines the database architecture of Luna AI.

The database stores all persistent application data while keeping workspace source code inside the user's local filesystem. The database is optimized for metadata, AI conversations, memory, settings, indexing information, and synchronization.

Luna AI follows a **Local-First Architecture** where source code is never stored inside the primary database.

---

# 2. Objectives

The database must:

* Store user data
* Store application settings
* Store AI conversations
* Store project metadata
* Store memories
* Store workspace metadata
* Store embeddings metadata
* Support synchronization
* Scale to enterprise workloads

---

# 3. Database Architecture

```text
                        Luna AI
                           │
                           ▼
                     Service Layer
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
   PostgreSQL         Qdrant Vector DB    Local File System
        │                  │                  │
        │                  │                  │
 Users & Metadata     Embeddings        Source Code
 Settings             Semantic Search   Assets
 Conversations        Memory Search     Project Files
 Workspace Data       Documentation
```

---

# 4. Storage Strategy

## PostgreSQL

Stores:

* Users
* Workspaces
* Conversations
* Messages
* Settings
* Preferences
* Metadata
* Sessions
* Notifications

---

## Vector Database (Qdrant)

Stores:

* Embeddings
* Documentation vectors
* Workspace vectors
* Memory vectors
* Semantic search index

---

## Local File System

Stores:

* Source code
* Images
* Assets
* Build files
* Logs
* Git repositories

---

# 5. Entity Relationship Overview

```text
User
 │
 ├── Workspaces
 │      │
 │      ├── Conversations
 │      ├── Memory
 │      ├── Documents
 │      ├── Settings
 │      ├── Sessions
 │      └── Git Metadata
 │
 └── Preferences
```

---

# 6. Core Tables

## users

Stores:

* Profile
* Email
* Authentication
* Subscription
* Avatar
* Preferences

---

## workspaces

Stores:

* Workspace ID
* Name
* Path
* Git Repository
* Last Opened
* Status
* Created Date

---

## conversations

Stores:

* Chat Title
* Workspace
* AI Provider
* Model
* Timestamp
* Token Usage

---

## messages

Stores:

* Conversation ID
* Role
* Content
* Attachments
* References
* Streaming Status

---

## workspace_memory

Stores:

* Workspace Summary
* Important Files
* Architecture Notes
* Coding Preferences
* Frequently Used Components

---

## session_memory

Stores:

* Current Context
* Recent Files
* Active Tasks
* AI State
* Temporary Notes

---

## long_term_memory

Stores:

* Developer Preferences
* Coding Style
* Frequently Used Commands
* AI Learning

---

## documents

Stores:

* Documentation Metadata
* File Type
* Chunk Count
* Index Status

---

## embeddings

Stores metadata for:

* Chunk IDs
* Document IDs
* Embedding Model
* Index Version

Vectors themselves remain inside Qdrant.

---

## notifications

Stores:

* Title
* Type
* Read Status
* Timestamp
* Action URL

---

## settings

Stores:

* Theme
* AI Model
* Editor Preferences
* Terminal Preferences
* Workspace Defaults

---

## recent_projects

Stores:

* Workspace ID
* Last Opened
* Open Count
* Favorite Status

---

## extensions

Stores:

* Installed Extensions
* Version
* Enabled Status
* Configuration

---

# 7. Database Relationships

```text
User

↓

Workspace

↓

Conversation

↓

Message

↓

Memory

↓

Documents

↓

Embeddings
```

Each entity references its parent through foreign keys.

---

# 8. Indexing Strategy

Create indexes on:

* User ID
* Workspace ID
* Conversation ID
* Message Timestamp
* Document ID
* Workspace Path
* Git Repository

Full-text indexes should be created for searchable fields.

---

# 9. Transactions

Transactions are required for:

* Workspace creation
* Conversation creation
* Memory updates
* AI response persistence
* Settings updates
* Project deletion

Partial writes are not permitted.

---

# 10. Workspace Metadata

Metadata includes:

* Project Name
* Framework
* Package Manager
* Language
* Dependencies
* Git Status
* Last Indexed
* Symbol Count
* File Count

Source code is not duplicated in the database.

---

# 11. AI Conversation Storage

Each AI conversation stores:

* Prompt
* Response
* Model
* Context References
* Token Usage
* Cost Estimate
* Execution Time

Streaming responses are persisted incrementally.

---

# 12. Memory Storage

Memory is divided into three levels:

Session Memory

Workspace Memory

Long-Term Memory

Each level has independent lifecycle and retention policies.

---

# 13. RAG Metadata

Metadata stored:

* Source Document
* Chunk Count
* Embedding Model
* Last Indexed
* Retrieval Score
* Workspace Reference

Actual vectors remain inside Qdrant.

---

# 14. Audit Logging

Critical operations recorded:

* Login
* Workspace Open
* Workspace Delete
* AI Requests
* Tool Execution
* Git Actions
* Settings Changes

Audit logs are append-only.

---

# 15. Backup Strategy

Database backups:

* Daily snapshots
* Incremental backups
* Version retention
* Encrypted storage

Workspace source code remains the responsibility of the local filesystem and Git.

---

# 16. Security

Sensitive fields:

* API Keys
* Tokens
* Refresh Tokens
* OAuth Credentials

Must be encrypted at rest.

Passwords are never stored directly.

---

# 17. Performance Strategy

Optimize using:

* Proper indexing
* Pagination
* Lazy loading
* Query caching
* Connection pooling
* Batched inserts

Database operations should never block AI streaming.

---

# 18. Scalability

Designed to support:

* Millions of messages
* Thousands of workspaces
* Large enterprise deployments
* Cloud synchronization
* Multi-device users

The schema supports horizontal scaling through service separation.

---

# 19. Migration Strategy

Schema changes are managed using Prisma Migrations.

Rules:

* Backward compatible changes first
* Destructive migrations require backups
* Every migration is versioned
* Rollback plans are mandatory

---

# 20. Engineering Standards

* UUID primary keys
* Foreign key constraints
* Soft deletes where appropriate
* Immutable audit logs
* Consistent naming conventions
* Timestamp fields on every entity
* Optimized indexes
* Strict relational integrity

---

# 21. Future Expansion

Planned additions:

* Team workspaces
* Organization management
* Shared memories
* Collaborative editing
* AI usage analytics
* Billing records
* Plugin storage
* Workspace snapshots

---

# 22. Success Criteria

The database architecture is successful when:

* Source code remains outside the database.
* Metadata retrieval is fast and reliable.
* AI conversations and memories are efficiently stored.
* Schema changes are manageable through migrations.
* Vector search integrates seamlessly with relational data.
* The system scales from individual developers to enterprise teams without redesign.
