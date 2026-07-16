import { AgentManager } from './core/AgentManager';
import { AgentRegistry } from './core/AgentRegistry';
import { AgentOrchestrator } from './core/AgentOrchestrator';
import { AgentRouter } from './core/AgentRouter';
import { TaskQueue } from './core/TaskQueue';
import { TaskPlanner } from './core/TaskPlanner';
import { AgentEventBus } from './core/AgentEventBus';
import { AgentLogger } from './core/AgentLogger';
import { AgentMemoryAdapter } from './core/AgentMemoryAdapter';
import { AgentToolAdapter } from './core/AgentToolAdapter';
import { TaskManager } from './core/TaskManager';
import { AgentCommunicationBus } from './core/AgentCommunicationBus';

// ---- AI agents -------------------------------------------------------------
import { ChatAgent } from './agents/ai/ChatAgent';
import { MemoryAgent } from './agents/ai/MemoryAgent';
import { RAGAgent } from './agents/ai/RAGAgent';

// ---- Development agents ----------------------------------------------------
import { CodingAgent } from './agents/development/CodingAgent';
import { RefactoringAgent } from './agents/development/RefactoringAgent';
import { DebuggingAgent } from './agents/development/DebuggingAgent';
import { DocumentationAgent } from './agents/development/DocumentationAgent';
import { TestingAgent } from './agents/development/TestingAgent';
import { ReviewAgent } from './agents/development/ReviewAgent';

// ---- Workspace agents ------------------------------------------------------
import { WorkspaceAgent } from './agents/workspace/WorkspaceAgent';

// ---- Canonical agent configurations ----------------------------------------
import {
  CHAT_AGENT_CONFIG,
  MEMORY_AGENT_CONFIG,
  RAG_AGENT_CONFIG,
  CODING_AGENT_CONFIG,
  REFACTORING_AGENT_CONFIG,
  DEBUGGING_AGENT_CONFIG,
  DOCUMENTATION_AGENT_CONFIG,
  TESTING_AGENT_CONFIG,
  REVIEW_AGENT_CONFIG,
  WORKSPACE_AGENT_CONFIG,
} from './agents/AgentConfigs';

import type { BaseAgent, AgentConfig } from '@luna-ai/types';

export class AgentsService {
  private logger: AgentLogger;
  private eventBus: AgentEventBus;
  private commBus: AgentCommunicationBus;
  private registry: AgentRegistry;
  private taskQueue: TaskQueue;
  private taskPlanner: TaskPlanner;
  private router: AgentRouter;
  private manager: AgentManager;
  private orchestrator: AgentOrchestrator;
  private memoryAdapter: AgentMemoryAdapter;
  private toolAdapter: AgentToolAdapter;
  private taskManager: TaskManager;

  constructor(memoryManager?: any) {
    // Initialize core infrastructure
    this.logger = new AgentLogger('[AgentsService]');
    this.eventBus = new AgentEventBus();
    this.commBus = new AgentCommunicationBus(this.eventBus, this.logger);
    this.registry = new AgentRegistry();
    this.taskQueue = new TaskQueue();
    this.taskPlanner = new TaskPlanner();
    this.router = new AgentRouter(this.registry);
    this.manager = new AgentManager(this.logger);
    this.orchestrator = new AgentOrchestrator(
      this.manager,
      this.router,
      this.taskQueue,
      this.taskPlanner,
      this.eventBus,
      this.logger,
      this.commBus,     // ← Phase 6.4: typed communication bus
    );
    this.memoryAdapter = new AgentMemoryAdapter(memoryManager);
    this.toolAdapter = new AgentToolAdapter();
    this.taskManager = new TaskManager();
  }

  async initialize(): Promise<void> {
    this.logger.info('service', 'Initializing Agents Service', 'initialization');

    await this.taskManager.initialize();
    await this.registerAgents();
    this.setupToolPermissions();
    this.setupEventHandlers();

    this.logger.info('service', 'Agents Service initialized successfully', 'initialization');
  }

  // ---------------------------------------------------------------------------
  // Agent registration
  // ---------------------------------------------------------------------------

  private async registerAgents(): Promise<void> {
    this.logger.info('service', 'Registering specialized agents', 'registration');

    // Each entry is [agent instance, config].  Order determines startup sequence
    // and has no effect on routing (routing is purely capability-based).
    const agents: Array<[BaseAgent, AgentConfig]> = [
      // AI agents
      [new ChatAgent(CHAT_AGENT_CONFIG),           CHAT_AGENT_CONFIG],
      [new MemoryAgent(MEMORY_AGENT_CONFIG),       MEMORY_AGENT_CONFIG],
      [new RAGAgent(RAG_AGENT_CONFIG),             RAG_AGENT_CONFIG],
      // Development agents
      [new CodingAgent(CODING_AGENT_CONFIG),                   CODING_AGENT_CONFIG],
      [new RefactoringAgent(REFACTORING_AGENT_CONFIG),         REFACTORING_AGENT_CONFIG],
      [new DebuggingAgent(DEBUGGING_AGENT_CONFIG),             DEBUGGING_AGENT_CONFIG],
      [new DocumentationAgent(DOCUMENTATION_AGENT_CONFIG),     DOCUMENTATION_AGENT_CONFIG],
      [new TestingAgent(TESTING_AGENT_CONFIG),                 TESTING_AGENT_CONFIG],
      [new ReviewAgent(REVIEW_AGENT_CONFIG),                   REVIEW_AGENT_CONFIG],
      // Workspace agents
      [new WorkspaceAgent(WORKSPACE_AGENT_CONFIG), WORKSPACE_AGENT_CONFIG],
    ];

    for (const [agent, config] of agents) {
      // Register with AgentManager → AgentRegistry (lifecycle + execution)
      await this.manager.registerAgent(agent, config);

      // Register with TaskManager → TaskRouter (capability-based routing)
      this.taskManager.registerAgent(agent, config);

      this.logger.info('service', `Registered agent: ${config.id} (${config.category})`, 'registration');
    }

    this.logger.info(
      'service',
      `${agents.length} specialized agents registered successfully`,
      'registration',
    );
  }

  // ---------------------------------------------------------------------------
  // Tool permissions
  // ---------------------------------------------------------------------------

  private setupToolPermissions(): void {
    // Development agents — file I/O + static analysis
    const devAgentIds = [
      CODING_AGENT_CONFIG.id,
      REFACTORING_AGENT_CONFIG.id,
      DEBUGGING_AGENT_CONFIG.id,
      DOCUMENTATION_AGENT_CONFIG.id,
      TESTING_AGENT_CONFIG.id,
      REVIEW_AGENT_CONFIG.id,
    ];
    for (const id of devAgentIds) {
      this.toolAdapter.setAgentPermissions(id, ['file_read', 'file_write', 'code_analyze']);
    }

    // Workspace agent — file system + search
    this.toolAdapter.setAgentPermissions(WORKSPACE_AGENT_CONFIG.id, [
      'file_read',
      'file_write',
      'file_search',
      'search',
    ]);

    // AI agents — memory + RAG retrieval
    const aiAgentIds = [
      CHAT_AGENT_CONFIG.id,
      MEMORY_AGENT_CONFIG.id,
      RAG_AGENT_CONFIG.id,
    ];
    for (const id of aiAgentIds) {
      this.toolAdapter.setAgentPermissions(id, [
        'memory_retrieve',
        'memory_store',
        'memory_search',
        'rag_retrieve',
        'rag_search',
      ]);
    }
  }

  // ---------------------------------------------------------------------------
  // Event subscriptions (typed — Phase 6.4)
  // ---------------------------------------------------------------------------

  private setupEventHandlers(): void {
    // Agent lifecycle events
    this.commBus.subscribe('agent_started', (event) => {
      this.logger.info('service', `Agent started: ${event.sourceAgentId}`, 'agent_started');
    });

    this.commBus.subscribe('agent_completed', (event) => {
      this.logger.info('service', `Agent completed: ${event.sourceAgentId}`, 'agent_completed');
    });

    this.commBus.subscribe('agent_failed', (event) => {
      this.logger.error(
        'service',
        `Agent failed: ${event.sourceAgentId}`,
        'agent_failed',
        undefined,
        { data: event.data },
      );
    });

    this.commBus.subscribe('agent_cancelled', (event) => {
      this.logger.warn(
        'service',
        `Agent cancelled: ${event.sourceAgentId}`,
        'agent_cancelled',
        { data: event.data },
      );
    });

    // Task events
    this.commBus.subscribe('task_created', (event) => {
      this.logger.info('service', `Task created: ${event.taskId}`, 'task_created');
    });

    this.commBus.subscribe('task_completed', (event) => {
      this.logger.info('service', `Task completed: ${event.taskId}`, 'task_completed');
    });

    this.commBus.subscribe('task_failed', (event) => {
      this.logger.error(
        'service',
        `Task failed: ${event.taskId}`,
        'task_failed',
        undefined,
        { data: event.data },
      );
    });

    // Error events from any agent
    this.commBus.subscribe('error', (event) => {
      const data = event.data as { message: string; stack?: string };
      this.logger.error(
        'service',
        `Communication error from ${event.sourceAgentId ?? 'unknown'}: ${data.message}`,
        'comm_error',
      );
    });

    // Global message listener — logs all direct agent-to-agent messages
    this.commBus.onMessage((message) => {
      this.logger.info(
        'service',
        `Message: ${message.from} → ${message.to}`,
        'agent_message',
        { content: message.content },
      );
    });
  }

  // ---------------------------------------------------------------------------
  // Public accessors
  // ---------------------------------------------------------------------------

  getManager(): AgentManager {
    return this.manager;
  }

  getOrchestrator(): AgentOrchestrator {
    return this.orchestrator;
  }

  getEventBus(): AgentEventBus {
    return this.eventBus;
  }

  /** Phase 6.4 — returns the typed communication bus. */
  getCommunicationBus(): AgentCommunicationBus {
    return this.commBus;
  }

  getTaskQueue(): TaskQueue {
    return this.taskQueue;
  }

  getMemoryAdapter(): AgentMemoryAdapter {
    return this.memoryAdapter;
  }

  getToolAdapter(): AgentToolAdapter {
    return this.toolAdapter;
  }

  getTaskManager(): TaskManager {
    return this.taskManager;
  }

  // ---------------------------------------------------------------------------
  // Shutdown
  // ---------------------------------------------------------------------------

  async shutdown(): Promise<void> {
    this.logger.info('service', 'Shutting down Agents Service', 'shutdown');

    await this.taskManager.shutdown();
    this.commBus.dispose();
    this.eventBus.clear();
    this.taskQueue.clear();

    this.logger.info('service', 'Agents Service shut down successfully', 'shutdown');
  }
}
