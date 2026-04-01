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
| Persistent long-term memory | ⬜ Still needed |
| Workflow orchestration (DAG/resumable) | ⬜ Still needed |
| Expanded external tool connectors | ⬜ Still needed |
| Fine-grained permissions and safety | ⬜ Still needed |
| Structured observability (traces, spans) | ⬜ Still needed |
| Evaluation and regression harness | ⬜ Still needed |
| Durable task state (resume after failure) | ⬜ Still needed |

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

## Still Needed

### 1. Persistent long-term memory
What exists: session-scoped memory and per-directory `memdir` files.

What is still missing:
- A persistent, queryable memory store across sessions (e.g. vector database or embedded key-value store)
- User preference memory that persists between restarts
- Summaries of past tasks accessible at session start
- Retrieval-augmented memory (semantic search over past work)

Suggested additions:
- Integrate a vector store as a `MemoryService`. Recommended options for a Node.js environment:
  - `@lancedb/lancedb` — embedded, zero-infrastructure, fast columnar storage, good for local/offline use
  - `hnswlib-node` — lightweight in-process HNSW index, low dependency footprint
  - `chromadb` — has a client/server mode and a simple REST API, easier to scale out later
- Add memory indexing on session close and retrieval on session open
- Expose memory through a `MemorySearchTool`

---

### 2. Workflow orchestration (DAG / resumable jobs)
What exists: `ScheduleCronTool` for simple scheduling, task primitives in `src/tasks/`.

What is still missing:
- A directed acyclic graph (DAG) execution engine for multi-step workflows
- Step dependencies and conditional branches
- Resumable background jobs that survive process restart
- Human approval checkpoints embedded in the workflow graph
- Timeout and retry policies per step
- A workflow definition format (YAML or JSON schema)

Suggested additions:
- Add a `WorkflowEngine` service with DAG execution
- Store workflow state in a durable backend (SQLite, Redis, or a file-based queue)
- Expose `WorkflowCreateTool`, `WorkflowRunTool`, `WorkflowStatusTool`

---

### 3. Expanded external tool connectors
What exists: `WebFetchTool`, `WebSearchTool`, `BashTool`, `FileReadTool`/`FileWriteTool`, `NotebookEditTool`.

What is still missing:
- Browser automation (Playwright / Puppeteer integration with DOM extraction)
- Email send/receive
- Calendar read/write
- Chat platform connectors (Slack, Teams, Discord)
- Database query tool (SQL / NoSQL)
- Document generation (PDF, DOCX, spreadsheet)
- Webhook trigger / inbound event connector

Suggested additions:
- Add a `BrowserTool` backed by Playwright for full browser automation
- Add an `EmailTool`, `CalendarTool`, `DatabaseTool` using standard adapters
- Expose connectors via MCP channels so they work with the existing MCP permission model

---

### 4. Fine-grained permissions and safety
What exists: `src/services/mcp/channelPermissions.ts`, `channelAllowlist.ts`, `mcpServerApproval.tsx`, `policyLimits`.

What is still missing:
- Per-tool risk classification (read-only vs. destructive)
- Approval gates before high-risk actions (e.g. file deletion, API calls, email sends)
- Scoped secrets manager that tools request at runtime (no plain-text secrets in prompts)
- Sandbox execution environment for untrusted code (`REPLTool` currently runs locally)
- Audit log of all tool calls with inputs and outputs
- Rollback or dry-run mode for file and system changes

Suggested additions:
- Add a `PermissionService` that classifies tools as `read`, `write`, or `destructive`
- Add an approval prompt step before any `destructive` tool call
- Integrate a secrets manager (e.g. `dotenv-vault`, HashiCorp Vault, or OS keychain via `keytar`): secrets must be encrypted at rest, never written into prompts or logs, and rotated without redeploying the agent
- Run `REPLTool` inside a Docker container or `deno` sandbox

---

### 5. Structured observability (traces and spans)
What exists: `datadog.ts` (analytics sink), `diagnosticTracking.ts`, `internalLogging.ts`.

What is still missing:
- OpenTelemetry-compatible distributed tracing across the agent loop
- Per-step span recording (tool call → result → next step)
- Browser screenshot capture tied to task steps
- Structured JSON log format for tool inputs/outputs
- Real-time execution dashboard or log viewer
- Error classification (transient vs. permanent, tool vs. model)

Suggested additions:
- Integrate `@opentelemetry/sdk-node` for spans and traces
- Export traces to Jaeger, Zipkin, or Datadog APM
- Add a `TraceService` that wraps every tool call with a span
- Capture screenshots in `BrowserTool` and attach them to spans

---

### 6. Evaluation and regression harness
What exists: `src/tools/testing/` directory (contents not fully enumerated).

What is still missing:
- A benchmark task suite with golden outputs
- Per-task success/failure classification
- Tool-call accuracy metrics
- Completion-rate and time-to-completion tracking
- Hallucination detection (output grounding checks)
- Regression test runner that replays recorded sessions
- CI integration for evaluation runs

Suggested additions:
- Add an `evals/` directory with:
  - `tasks/` — benchmark task definitions (input + expected output)
  - `runner.ts` — evaluation runner
  - `metrics.ts` — scoring functions
  - `report.ts` — human-readable report generator
- Wire evaluation runs into CI on pull requests

---

### 7. Durable task state (resume after failure)
What exists: `src/state/AppState.tsx`, `AppStateStore.ts`, `store.ts`, task primitives in `src/tasks/`.

What is still missing:
- Persistent serialization of task state to disk or a database
- Resume-after-crash support (reload in-progress tasks on startup)
- Partial result storage per step
- Tool call transcript persistence across sessions
- Task history browser (list, inspect, replay past runs)
- Dead-letter handling for failed tasks

Suggested additions:
- Add a `TaskStore` that persists task state to SQLite (via `better-sqlite3`) or a file-based journal
- On startup, reload any tasks in `running` or `paused` state
- Expose `TaskHistoryTool` to let the agent query its own past work

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
