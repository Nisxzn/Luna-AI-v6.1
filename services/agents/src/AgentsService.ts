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

// Development Agents
import { CodingAgent } from './agents/development/CodingAgent';
import { RefactoringAgent } from './agents/development/RefactoringAgent';
import { DebuggingAgent } from './agents/development/DebuggingAgent';
import { TestingAgent } from './agents/development/TestingAgent';
import { DocumentationAgent } from './agents/development/DocumentationAgent';
import { CodeReviewAgent } from './agents/development/CodeReviewAgent';

// Workspace Agents
import { FileAgent } from './agents/workspace/FileAgent';
import { SearchAgent } from './agents/workspace/SearchAgent';
import { ProjectAnalysisAgent } from './agents/workspace/ProjectAnalysisAgent';

// AI Agents
import { ChatAgent } from './agents/ai/ChatAgent';
import { RAGAgent } from './agents/ai/RAGAgent';
import { MemoryAgent } from './agents/ai/MemoryAgent';

// Planning Agents
import { TaskPlanningAgent } from './agents/planning/TaskPlanningAgent';
import { WorkflowAgent } from './agents/planning/WorkflowAgent';

export class AgentsService {
  private logger: AgentLogger;
  private eventBus: AgentEventBus;
  private registry: AgentRegistry;
  private taskQueue: TaskQueue;
  private taskPlanner: TaskPlanner;
  private router: AgentRouter;
  private manager: AgentManager;
  private orchestrator: AgentOrchestrator;
  private memoryAdapter: AgentMemoryAdapter;
  private toolAdapter: AgentToolAdapter;

  constructor(memoryManager?: any) {
    // Initialize core components
    this.logger = new AgentLogger('[AgentsService]');
    this.eventBus = new AgentEventBus();
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
      this.logger
    );
    this.memoryAdapter = new AgentMemoryAdapter(memoryManager);
    this.toolAdapter = new AgentToolAdapter();
  }

  async initialize(): Promise<void> {
    this.logger.info('service', 'Initializing Agents Service', 'initialization');

    // Register all agents
    await this.registerAgents();

    // Setup tool permissions
    this.setupToolPermissions();

    // Setup event subscriptions
    this.setupEventHandlers();

    this.logger.info('service', 'Agents Service initialized successfully', 'initialization');
  }

  private async registerAgents(): Promise<void> {
    // Phase 6.1: Framework only - specialized agents will be updated in future phases
    // Development Agents
    // await this.manager.registerAgent(new CodingAgent(this.logger), CodingAgent.prototype.config);
    // await this.manager.registerAgent(new RefactoringAgent(this.logger), RefactoringAgent.prototype.config);
    // await this.manager.registerAgent(new DebuggingAgent(this.logger), DebuggingAgent.prototype.config);
    // await this.manager.registerAgent(new TestingAgent(this.logger), TestingAgent.prototype.config);
    // await this.manager.registerAgent(new DocumentationAgent(this.logger), DocumentationAgent.prototype.config);
    // await this.manager.registerAgent(new CodeReviewAgent(this.logger), CodeReviewAgent.prototype.config);

    // Workspace Agents
    // await this.manager.registerAgent(new FileAgent(this.logger), FileAgent.prototype.config);
    // await this.manager.registerAgent(new SearchAgent(this.logger), SearchAgent.prototype.config);
    // await this.manager.registerAgent(new ProjectAnalysisAgent(this.logger), ProjectAnalysisAgent.prototype.config);

    // AI Agents
    // await this.manager.registerAgent(new ChatAgent(this.logger), ChatAgent.prototype.config);
    // await this.manager.registerAgent(new RAGAgent(this.logger), RAGAgent.prototype.config);
    // await this.manager.registerAgent(new MemoryAgent(this.logger), MemoryAgent.prototype.config);

    // Planning Agents
    // await this.manager.registerAgent(new TaskPlanningAgent(this.logger), TaskPlanningAgent.prototype.config);
    // await this.manager.registerAgent(new WorkflowAgent(this.logger), WorkflowAgent.prototype.config);

    this.logger.info('service', 'Framework established - specialized agents to be registered in future phases', 'registration');
  }

  private setupToolPermissions(): void {
    // Development agents get file and code tools
    const devAgents = ['coding-agent', 'refactoring-agent', 'debugging-agent', 'testing-agent', 'documentation-agent', 'code-review-agent'];
    devAgents.forEach(agentId => {
      this.toolAdapter.setAgentPermissions(agentId, ['file_read', 'file_write', 'code_analyze']);
    });

    // Workspace agents get file and search tools
    const workspaceAgents = ['file-agent', 'search-agent', 'project-analysis-agent'];
    workspaceAgents.forEach(agentId => {
      this.toolAdapter.setAgentPermissions(agentId, ['file_read', 'file_write', 'file_search', 'search']);
    });

    // AI agents get memory and RAG tools
    const aiAgents = ['chat-agent', 'rag-agent', 'memory-agent'];
    aiAgents.forEach(agentId => {
      this.toolAdapter.setAgentPermissions(agentId, ['memory_retrieve', 'memory_store', 'rag_retrieve', 'rag_search']);
    });

    // Planning agents get analysis tools
    const planningAgents = ['task-planning-agent', 'workflow-agent'];
    planningAgents.forEach(agentId => {
      this.toolAdapter.setAgentPermissions(agentId, ['task_analyze', 'dependency_tracker', 'workflow_executor']);
    });
  }

  private setupEventHandlers(): void {
    this.eventBus.subscribe('agent_started', (event) => {
      this.logger.info('service', `Agent started: ${event.sourceAgentId}`, 'agent_started');
    });

    this.eventBus.subscribe('agent_completed', (event) => {
      this.logger.info('service', `Agent completed: ${event.sourceAgentId}`, 'agent_completed');
    });

    this.eventBus.subscribe('agent_failed', (event) => {
      this.logger.error('service', `Agent failed: ${event.sourceAgentId}`, 'agent_failed', undefined, { data: event.data });
    });

    this.eventBus.subscribe('task_created', (event) => {
      this.logger.info('service', `Task created: ${event.taskId}`, 'task_created');
    });

    this.eventBus.subscribe('task_completed', (event) => {
      this.logger.info('service', `Task completed: ${event.taskId}`, 'task_completed');
    });
  }

  getManager(): AgentManager {
    return this.manager;
  }

  getOrchestrator(): AgentOrchestrator {
    return this.orchestrator;
  }

  getEventBus(): AgentEventBus {
    return this.eventBus;
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

  async shutdown(): Promise<void> {
    this.logger.info('service', 'Shutting down Agents Service', 'shutdown');
    this.eventBus.clear();
    this.taskQueue.clear();
    this.logger.info('service', 'Agents Service shut down successfully', 'shutdown');
  }
}
