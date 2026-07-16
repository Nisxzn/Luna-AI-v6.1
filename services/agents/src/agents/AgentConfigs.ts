/**
 * AgentConfigs — canonical AgentConfig definitions for all 10 specialized agents.
 *
 * Each config declares the agent's identity, category, capabilities, and the
 * tool names it is allowed to invoke.  No AI logic lives here; these objects
 * are pure data used by the registry, router, and lifecycle manager.
 */

import type { AgentConfig } from '@luna-ai/types';

// ---------------------------------------------------------------------------
// AI Agents
// ---------------------------------------------------------------------------

export const CHAT_AGENT_CONFIG: AgentConfig = {
  id: 'chat-agent',
  name: 'Chat Agent',
  description:
    'Manages conversational interactions with the user. Handles chat sessions, ' +
    'message history, and routes requests to specialized agents when needed.',
  category: 'ai',
  capabilities: [
    {
      name: 'chat',
      description: 'Process and respond to natural-language chat messages.',
      inputTypes: ['chat_request', 'general'],
      outputTypes: ['chat_response'],
    },
    {
      name: 'general_processing',
      description: 'Handle general-purpose requests that do not map to a specific agent.',
      inputTypes: ['general'],
      outputTypes: ['general_response'],
    },
  ],
  supportedTools: ['memory_retrieve', 'memory_store', 'rag_retrieve'],
  maxRetries: 2,
  timeout: 30_000,
  enabled: true,
};

export const MEMORY_AGENT_CONFIG: AgentConfig = {
  id: 'memory-agent',
  name: 'Memory Agent',
  description:
    'Manages short-term and long-term memory for the AI system. Stores, retrieves, ' +
    'and organises contextual information across sessions.',
  category: 'ai',
  capabilities: [
    {
      name: 'memory_store',
      description: 'Persist information to the memory store.',
      inputTypes: ['memory_store_request', 'general'],
      outputTypes: ['memory_store_response'],
    },
    {
      name: 'memory_retrieve',
      description: 'Retrieve relevant memories given a query.',
      inputTypes: ['memory_retrieve_request', 'general'],
      outputTypes: ['memory_retrieve_response'],
    },
    {
      name: 'memory_search',
      description: 'Semantic search over stored memories.',
      inputTypes: ['memory_search_request', 'search'],
      outputTypes: ['memory_search_response'],
    },
    {
      name: 'general_processing',
      description: 'Handle general memory-management requests.',
      inputTypes: ['general'],
      outputTypes: ['general_response'],
    },
  ],
  supportedTools: ['memory_retrieve', 'memory_store', 'memory_search', 'rag_retrieve'],
  maxRetries: 3,
  timeout: 20_000,
  enabled: true,
};

export const RAG_AGENT_CONFIG: AgentConfig = {
  id: 'rag-agent',
  name: 'RAG Agent',
  description:
    'Performs Retrieval-Augmented Generation by searching indexed knowledge bases ' +
    'and constructing context-enriched prompts for the language model.',
  category: 'ai',
  capabilities: [
    {
      name: 'rag_retrieve',
      description: 'Retrieve relevant documents from the vector store.',
      inputTypes: ['rag_retrieve_request', 'search', 'general'],
      outputTypes: ['rag_retrieve_response'],
    },
    {
      name: 'rag_search',
      description: 'Semantic similarity search over the knowledge base.',
      inputTypes: ['rag_search_request', 'search'],
      outputTypes: ['rag_search_response'],
    },
    {
      name: 'search',
      description: 'Full-text and semantic search over indexed content.',
      inputTypes: ['search'],
      outputTypes: ['search_response'],
    },
    {
      name: 'general_processing',
      description: 'Handle general retrieval requests.',
      inputTypes: ['general'],
      outputTypes: ['general_response'],
    },
  ],
  supportedTools: ['rag_retrieve', 'rag_search', 'memory_retrieve'],
  maxRetries: 3,
  timeout: 30_000,
  enabled: true,
};

// ---------------------------------------------------------------------------
// Development Agents
// ---------------------------------------------------------------------------

export const CODING_AGENT_CONFIG: AgentConfig = {
  id: 'coding-agent',
  name: 'Coding Agent',
  description:
    'Generates, completes, and edits source code based on natural-language ' +
    'descriptions and existing code context.',
  category: 'development',
  capabilities: [
    {
      name: 'code_generation',
      description: 'Generate new code from a specification or prompt.',
      inputTypes: ['code_generation', 'general'],
      outputTypes: ['code_generation_response'],
    },
    {
      name: 'file_write',
      description: 'Write generated code to the workspace filesystem.',
      inputTypes: ['code_generation', 'general'],
      outputTypes: ['file_write_response'],
    },
    {
      name: 'file_read',
      description: 'Read existing source files for context.',
      inputTypes: ['code_generation', 'analysis'],
      outputTypes: ['file_read_response'],
    },
  ],
  supportedTools: ['file_read', 'file_write', 'code_analyze'],
  maxRetries: 2,
  timeout: 60_000,
  enabled: true,
};

export const REFACTORING_AGENT_CONFIG: AgentConfig = {
  id: 'refactoring-agent',
  name: 'Refactoring Agent',
  description:
    'Analyses existing code and applies structural transformations to improve ' +
    'readability, performance, and maintainability without changing behaviour.',
  category: 'development',
  capabilities: [
    {
      name: 'code_analysis',
      description: 'Analyse source code structure and identify refactoring opportunities.',
      inputTypes: ['refactoring', 'analysis'],
      outputTypes: ['code_analysis_response'],
    },
    {
      name: 'code_transformation',
      description: 'Apply automated refactoring transformations to code.',
      inputTypes: ['refactoring'],
      outputTypes: ['code_transformation_response'],
    },
    {
      name: 'file_read',
      description: 'Read source files targeted for refactoring.',
      inputTypes: ['refactoring', 'analysis'],
      outputTypes: ['file_read_response'],
    },
    {
      name: 'file_write',
      description: 'Write refactored code back to the filesystem.',
      inputTypes: ['refactoring'],
      outputTypes: ['file_write_response'],
    },
  ],
  supportedTools: ['file_read', 'file_write', 'code_analyze'],
  maxRetries: 2,
  timeout: 90_000,
  enabled: true,
};

export const DEBUGGING_AGENT_CONFIG: AgentConfig = {
  id: 'debugging-agent',
  name: 'Debugging Agent',
  description:
    'Diagnoses runtime errors, logic bugs, and unexpected behaviour. ' +
    'Produces root-cause analysis and suggested fixes.',
  category: 'development',
  capabilities: [
    {
      name: 'code_analysis',
      description: 'Analyse code to locate defects and error sources.',
      inputTypes: ['debugging', 'analysis'],
      outputTypes: ['code_analysis_response'],
    },
    {
      name: 'error_detection',
      description: 'Detect and classify errors from stack traces and logs.',
      inputTypes: ['debugging'],
      outputTypes: ['error_detection_response'],
    },
    {
      name: 'file_read',
      description: 'Read source files and log output for debugging context.',
      inputTypes: ['debugging', 'analysis'],
      outputTypes: ['file_read_response'],
    },
  ],
  supportedTools: ['file_read', 'code_analyze'],
  maxRetries: 3,
  timeout: 90_000,
  enabled: true,
};

export const DOCUMENTATION_AGENT_CONFIG: AgentConfig = {
  id: 'documentation-agent',
  name: 'Documentation Agent',
  description:
    'Generates API docs, inline comments, README files, and architectural ' +
    'explanations from source code and design artefacts.',
  category: 'development',
  capabilities: [
    {
      name: 'documentation_generation',
      description: 'Generate documentation artefacts from code and context.',
      inputTypes: ['documentation'],
      outputTypes: ['documentation_response'],
    },
    {
      name: 'code_analysis',
      description: 'Analyse code to extract structure, types, and intent.',
      inputTypes: ['documentation', 'analysis'],
      outputTypes: ['code_analysis_response'],
    },
    {
      name: 'file_read',
      description: 'Read source files to extract documentation targets.',
      inputTypes: ['documentation', 'analysis'],
      outputTypes: ['file_read_response'],
    },
    {
      name: 'file_write',
      description: 'Write generated documentation files.',
      inputTypes: ['documentation'],
      outputTypes: ['file_write_response'],
    },
  ],
  supportedTools: ['file_read', 'file_write', 'code_analyze'],
  maxRetries: 2,
  timeout: 45_000,
  enabled: true,
};

export const TESTING_AGENT_CONFIG: AgentConfig = {
  id: 'testing-agent',
  name: 'Testing Agent',
  description:
    'Generates unit tests, integration tests, and test fixtures. ' +
    'Analyses code coverage and identifies untested paths.',
  category: 'development',
  capabilities: [
    {
      name: 'test_execution',
      description: 'Run and evaluate test suites.',
      inputTypes: ['testing'],
      outputTypes: ['test_execution_response'],
    },
    {
      name: 'code_analysis',
      description: 'Analyse source code to identify test targets and coverage gaps.',
      inputTypes: ['testing', 'analysis'],
      outputTypes: ['code_analysis_response'],
    },
    {
      name: 'file_read',
      description: 'Read source files and existing test suites.',
      inputTypes: ['testing', 'analysis'],
      outputTypes: ['file_read_response'],
    },
    {
      name: 'file_write',
      description: 'Write generated test files.',
      inputTypes: ['testing'],
      outputTypes: ['file_write_response'],
    },
  ],
  supportedTools: ['file_read', 'file_write', 'code_analyze'],
  maxRetries: 2,
  timeout: 120_000,
  enabled: true,
};

export const REVIEW_AGENT_CONFIG: AgentConfig = {
  id: 'review-agent',
  name: 'Review Agent',
  description:
    'Reviews pull-requests and changed files for correctness, style, security, ' +
    'and adherence to project conventions. Produces structured feedback.',
  category: 'development',
  capabilities: [
    {
      name: 'code_analysis',
      description: 'Analyse code changes for quality and correctness.',
      inputTypes: ['analysis', 'general'],
      outputTypes: ['code_analysis_response'],
    },
    {
      name: 'pattern_recognition',
      description: 'Identify anti-patterns, security issues, and style violations.',
      inputTypes: ['analysis'],
      outputTypes: ['pattern_recognition_response'],
    },
    {
      name: 'file_read',
      description: 'Read source files and diffs under review.',
      inputTypes: ['analysis', 'general'],
      outputTypes: ['file_read_response'],
    },
  ],
  supportedTools: ['file_read', 'code_analyze'],
  maxRetries: 2,
  timeout: 60_000,
  enabled: true,
};

// ---------------------------------------------------------------------------
// Workspace Agents
// ---------------------------------------------------------------------------

export const WORKSPACE_AGENT_CONFIG: AgentConfig = {
  id: 'workspace-agent',
  name: 'Workspace Agent',
  description:
    'Manages workspace-level operations: file navigation, project structure ' +
    'analysis, dependency inspection, and workspace state management.',
  category: 'workspace',
  capabilities: [
    {
      name: 'file_read',
      description: 'Read files and directories from the workspace.',
      inputTypes: ['search', 'analysis', 'general'],
      outputTypes: ['file_read_response'],
    },
    {
      name: 'file_write',
      description: 'Create, update, and delete workspace files.',
      inputTypes: ['general'],
      outputTypes: ['file_write_response'],
    },
    {
      name: 'file_search',
      description: 'Search for files by name, content, or pattern.',
      inputTypes: ['search'],
      outputTypes: ['file_search_response'],
    },
    {
      name: 'search',
      description: 'Full-text and glob search across the workspace.',
      inputTypes: ['search'],
      outputTypes: ['search_response'],
    },
    {
      name: 'general_processing',
      description: 'Handle general workspace management requests.',
      inputTypes: ['general'],
      outputTypes: ['general_response'],
    },
  ],
  supportedTools: ['file_read', 'file_write', 'file_search', 'search'],
  maxRetries: 2,
  timeout: 30_000,
  enabled: true,
};

// ---------------------------------------------------------------------------
// Aggregated export
// ---------------------------------------------------------------------------

/** All 10 agent configs, in registration order. */
export const ALL_AGENT_CONFIGS: AgentConfig[] = [
  // AI agents
  CHAT_AGENT_CONFIG,
  MEMORY_AGENT_CONFIG,
  RAG_AGENT_CONFIG,
  // Development agents
  CODING_AGENT_CONFIG,
  REFACTORING_AGENT_CONFIG,
  DEBUGGING_AGENT_CONFIG,
  DOCUMENTATION_AGENT_CONFIG,
  TESTING_AGENT_CONFIG,
  REVIEW_AGENT_CONFIG,
  // Workspace agents
  WORKSPACE_AGENT_CONFIG,
];
