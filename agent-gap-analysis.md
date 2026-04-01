# AI Agent Platform Gap Analysis

This document compares the current repository against the capabilities needed to build a general-purpose AI agent platform comparable to Manus, n8n, and similar tools. Status labels reflect a review of the actual `src/` directory structure.

---

## Status Overview

| Capability | Status |
|---|---|
| CLI application foundation | ✅ Already satisfied |
| Runtime requirement | ✅ Already satisfied |
| Agent-oriented product positioning | ✅ Already satisfied |
| Modular project structure | ✅ Already satisfied |
| Tool implementations | ✅ Already satisfied |
| Task / job primitives | ✅ Already satisfied |
| Planner / executor separation | ✅ Already satisfied |
| Session memory | ✅ Already satisfied |
| MCP (tool extension protocol) | ✅ Already satisfied |
| Plugin system | ✅ Already satisfied |
| Analytics / event logging | ✅ Already satisfied |
| OAuth authentication | ✅ Already satisfied |
| Release safety guard | ✅ Already satisfied |
| Ignore / hygiene rules | ✅ Already satisfied |
| Persistent long-term memory | ✅ Already satisfied |
| Workflow orchestration (DAG/resumable) | ✅ Already satisfied |
| Expanded external tool connectors | ✅ Already satisfied |
| Fine-grained permissions and safety | ✅ Already satisfied |
| Structured observability (traces, spans) | ✅ Already satisfied |
| Evaluation and regression harness | ✅ Already satisfied |
| Durable task state (resume after failure) | ✅ Already satisfied |

---

## Already Satisfied

### 1. CLI application foundation
- `package.json` exposes a terminal command:
  - `claude` → `cli.js`
- `src/cli/` handles entrypoint and argument parsing.
- `src/entrypoints/` provides additional execution entrypoints.

### 2. Runtime requirement
- Node.js requirement is pinned: `engines.node >= 18.0.0`

### 3. Agent-oriented product positioning
The `package.json` description states the assistant can:
- understand a codebase
- edit files
- run terminal commands
- handle entire workflows

### 4. Modular project structure
The `src/` directory already maps cleanly to an agent platform:

| Directory | Role |
|---|---|
| `src/cli/` | Entrypoint and argument parsing |
| `src/commands/` | Command implementations |
| `src/components/` | Terminal UI components (Ink/React) |
| `src/constants/` | App-wide constants |
| `src/context/` | Context management |
| `src/coordinator/` | Coordinator/supervisor mode |
| `src/hooks/` | Reusable React hooks |
| `src/ink/` | Terminal UI layer (Ink framework) |
| `src/memdir/` | Memory directory and retrieval utilities |
| `src/plugins/` | Plugin system |
| `src/schemas/` | Shared data schemas |
| `src/services/` | Core services (API, MCP, analytics, OAuth) |
| `src/skills/` | Skill definitions |
| `src/state/` | Application state management |
| `src/tasks/` | Task primitives and lifecycle |
| `src/tools/` | Tool implementations |
| `src/types/` | TypeScript type definitions |
| `src/utils/` | Utility helpers |

### 5. Tool implementations
`src/tools/` already includes:

- `BashTool` — shell command execution
- `FileReadTool`, `FileWriteTool`, `FileEditTool` — file system access
- `GlobTool`, `GrepTool` — code and file search
- `WebFetchTool`, `WebSearchTool` — web access
- `REPLTool` — interactive code execution
- `NotebookEditTool` — notebook support
- `MCPTool`, `ListMcpResourcesTool`, `ReadMcpResourceTool` — MCP protocol tools
- `AgentTool`, `SendMessageTool` — agent-to-agent messaging
- `TaskCreateTool`, `TaskGetTool`, `TaskListTool`, `TaskOutputTool`, `TaskUpdateTool` — task management
- `ScheduleCronTool` — scheduled / cron-based triggers
- `TodoWriteTool` — task list management
- `AskUserQuestionTool` — human-in-the-loop prompts
- `SkillTool` — skill invocation
- `TeamCreateTool`, `TeamDeleteTool` — multi-agent team management
- `ToolSearchTool` — tool discovery
- `LSPTool` — Language Server Protocol integration
- `PowerShellTool` — Windows shell support
- `ConfigTool` — configuration management
- `EnterPlanModeTool`, `ExitPlanModeTool` — planning mode entry/exit
- `EnterWorktreeTool`, `ExitWorktreeTool` — worktree management

### 6. Task and job primitives
`src/tasks/` includes:
- `LocalAgentTask` — in-process agent task runner
- `LocalShellTask` — shell task runner
- `RemoteAgentTask` — remote agent execution
- `InProcessTeammateTask` — in-process multi-agent collaboration
- `LocalMainSessionTask.ts` — primary session task
- `DreamTask` — background/deferred task execution
- `stopTask.ts` — task cancellation

### 7. Planner / executor separation
- `EnterPlanModeTool` / `ExitPlanModeTool` implement an explicit planning mode.
- `src/coordinator/coordinatorMode.ts` provides a supervisor/coordinator pattern.
- `src/query/` and `src/query.ts` handle query routing and execution.

### 8. Session memory
`src/services/SessionMemory/` contains:
- `sessionMemory.ts` — in-session memory management
- `sessionMemoryUtils.ts` — utilities

`src/services/extractMemories/` contains:
- `extractMemories.ts` — memory extraction from sessions
- `prompts.ts` — memory-related prompts

`src/memdir/` contains:
- `memdir.ts` — memory directory management
- `findRelevantMemories.ts` — memory retrieval
- `memoryScan.ts`, `memoryAge.ts`, `memoryTypes.ts` — memory classification
- `teamMemPaths.ts`, `teamMemPrompts.ts` — team-shared memory

### 9. MCP (Model Context Protocol) tool extension
`src/services/mcp/` provides:
- `MCPConnectionManager.tsx` — connection lifecycle
- `channelPermissions.ts` — channel-level permissions
- `channelAllowlist.ts` — allowlist controls
- `auth.ts`, `client.ts`, `config.ts` — auth and configuration

### 10. Plugin system
`src/plugins/builtinPlugins.ts` and `src/plugins/bundled/` define built-in and bundled plugins.

### 11. Analytics and event logging
`src/services/analytics/` contains:
- `index.ts`, `config.ts`, `sink.ts`, `sinkKillswitch.ts`
- `datadog.ts` — Datadog integration
- `firstPartyEventLogger.ts` — first-party event logging
- `growthbook.ts` — feature flags

`src/services/internalLogging.ts` and `src/services/diagnosticTracking.ts` provide additional logging.

### 12. OAuth authentication
`src/services/oauth/` handles:
- `auth-code-listener.ts` — OAuth authorization code flow
- `client.ts` — OAuth client
- `crypto.ts` — PKCE / crypto helpers
- `getOauthProfile.ts` — profile retrieval

### 13. Release safety guard
The `prepare` script blocks direct publishing unless `AUTHORIZED` is set.

### 14. Ignore and hygiene rules
`.gitignore` covers logs, `node_modules`, `.env`, build output, caches, test coverage, and common frontend framework artifacts.

---

## Newly Implemented Capabilities

### 1. Persistent long-term memory
Implemented:
- `src/services/PersistentMemory/memoryStore.ts` provides durable memory persistence in `~/.claude/platform/persistent-memory.json`
- `src/tools/MemoryWriteTool/MemoryWriteTool.ts` writes long-term memory entries
- `src/tools/MemorySearchTool/MemorySearchTool.ts` provides retrieval and search

---

### 2. Workflow orchestration (DAG / resumable jobs)
Implemented:
- `src/services/WorkflowEngine/workflowEngine.ts` provides workflow creation, DAG dependency execution, and persisted run state
- `src/tools/WorkflowCreateTool/WorkflowCreateTool.ts` creates workflows
- `src/tools/WorkflowRunTool/WorkflowRunTool.ts` executes workflows
- `src/tools/WorkflowStatusTool/WorkflowStatusTool.ts` inspects run status

---

### 3. Expanded external tool connectors
Implemented:
- `src/tools/BrowserAutomateTool/BrowserAutomateTool.ts`
- `src/tools/EmailSendTool/EmailSendTool.ts`
- `src/tools/CalendarTool/CalendarTool.ts`
- `src/tools/DatabaseQueryTool/DatabaseQueryTool.ts`
- `src/tools/WebhookTriggerTool/WebhookTriggerTool.ts`

These tools are wired into `src/tools.ts` and include permission checks, audit logging, and trace logging.

---

### 4. Fine-grained permissions and safety
Implemented:
- `src/services/ToolSafety/toolSafety.ts` adds:
  - risk classification (`read`, `write`, `destructive`)
  - approval gate checks for destructive actions
  - append-only JSONL audit log at `~/.claude/platform/audit.log`
- New write/destructive tools call this service in `checkPermissions` and before execution.

---

### 5. Structured observability (traces and spans)
Implemented:
- `src/services/Observability/tracing.ts` provides span-style tracing for async operations.
- Newly added tools wrap execution via `traceAsync(...)`.
- Trace events are persisted to `~/.claude/platform/traces.log`.

---

### 6. Evaluation and regression harness
Implemented:
- `evals/tasks/basic-platform-eval.json` defines baseline evaluation cases.
- `evals/runner.js` executes evaluation scenarios and reports pass/fail.
- `evals/README.md` documents usage.

---

### 7. Durable task state (resume after failure)
Implemented:
- `src/services/DurableTaskState/taskStateStore.ts` persists task records to `~/.claude/platform/durable-task-state.json`.
- Workflow runs now create and update durable tasks via this store.
- `src/tools/TaskHistoryTool/TaskHistoryTool.ts` exposes durable task history retrieval.

---

## Suggested Build Priorities

### Phase 1 — Harden the core agent loop
- [ ] Implement `PermissionService` with per-tool risk classification
- [ ] Add approval gates before destructive tool calls
- [ ] Add structured JSON logging for all tool calls (inputs + outputs)

### Phase 2 — Durability and reliability
- [ ] Add `TaskStore` for persistent task state with resume-after-failure
- [ ] Implement retry and timeout policies per tool call
- [ ] Add dead-letter handling for failed tasks

### Phase 3 — Memory and retrieval
- [ ] Integrate a vector store for long-term persistent memory
- [ ] Add `MemorySearchTool` for semantic retrieval
- [ ] Index completed sessions into the long-term store

### Phase 4 — Workflow orchestration
- [ ] Build a `WorkflowEngine` service with DAG execution
- [ ] Add `WorkflowCreateTool`, `WorkflowRunTool`, `WorkflowStatusTool`
- [ ] Support resumable background jobs and human approval checkpoints

### Phase 5 — Tool expansion
- [ ] Add `BrowserTool` (Playwright-backed) with DOM extraction and screenshots
- [ ] Add `EmailTool`, `CalendarTool`, `DatabaseTool`
- [ ] Integrate webhook inbound event connector

### Phase 6 — Observability and evaluation
- [ ] Integrate OpenTelemetry for distributed tracing
- [ ] Build `evals/` benchmark suite with CI integration
- [ ] Add hallucination detection and completion-rate metrics

---

## Summary

This repository already has a strong terminal-agent base including a rich tool library, task primitives, a coordinator/supervisor pattern, session memory, MCP protocol support, a plugin system, analytics, and OAuth. The foundation is significantly more capable than a typical prototype.

The remaining gaps are concentrated in four areas:

1. **Persistence** — long-term memory and durable task state
2. **Orchestration** — DAG-based workflow engine with resumability
3. **Safety** — fine-grained permissions, approval gates, and sandboxing
4. **Observability** — structured tracing and an evaluation harness

Addressing these in the order of the phased roadmap above will yield a production-grade, general-purpose agent platform.
