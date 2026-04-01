import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'
import { runWorkflow } from '../../services/WorkflowEngine/workflowEngine.js'
import { traceAsync } from '../../services/Observability/tracing.js'
import { appendAuditLog, shouldRequireApproval } from '../../services/ToolSafety/toolSafety.js'
import { lazySchema } from '../../utils/lazySchema.js'

const inputSchema = lazySchema(() =>
  z.strictObject({
    workflowId: z.string().min(1),
  }),
)
type InputSchema = ReturnType<typeof inputSchema>

const outputSchema = lazySchema(() =>
  z.object({
    runId: z.string(),
    status: z.enum(['pending', 'running', 'completed', 'failed']),
    completedStepIds: z.array(z.string()),
    taskId: z.string().optional(),
    error: z.string().optional(),
  }),
)
type OutputSchema = ReturnType<typeof outputSchema>
type Output = z.infer<OutputSchema>

export const WorkflowRunTool = buildTool({
  name: 'WorkflowRun',
  maxResultSizeChars: 100_000,
  async description() {
    return 'Run an existing workflow definition'
  },
  async prompt() {
    return 'Execute workflow steps respecting dependencies'
  },
  get inputSchema(): InputSchema {
    return inputSchema()
  },
  get outputSchema(): OutputSchema {
    return outputSchema()
  },
  userFacingName() {
    return 'WorkflowRun'
  },
  isReadOnly() {
    return false
  },
  async checkPermissions(input) {
    const needsApproval = await shouldRequireApproval('WorkflowRun', input)
    if (needsApproval) {
      return { behavior: 'ask', message: 'Run workflow execution' }
    }
    return { behavior: 'allow', updatedInput: input }
  },
  renderToolUseMessage() {
    return null
  },
  async call(input) {
    return traceAsync(
      'tool.workflow_run',
      async () => {
        const run = await runWorkflow(input.workflowId)
        if (!run) {
          return {
            data: {
              runId: '',
              status: 'failed',
              completedStepIds: [],
              error: 'Workflow not found',
            } satisfies Output,
          }
        }
        await appendAuditLog({
          at: Date.now(),
          event: 'workflow_run',
          runId: run.id,
          workflowId: run.workflowId,
          status: run.status,
        })
        return {
          data: {
            runId: run.id,
            status: run.status,
            completedStepIds: run.completedStepIds,
            taskId: run.taskId,
            error: run.error,
          } satisfies Output,
        }
      },
      { tool: 'WorkflowRun' },
    )
  },
  mapToolResultToToolResultBlockParam(content, toolUseID) {
    const out = content as Output
    if (out.status === 'failed') {
      return {
        tool_use_id: toolUseID,
        type: 'tool_result',
        content: `Workflow run failed: ${out.error ?? 'unknown error'}`,
        is_error: true,
      }
    }
    return {
      tool_use_id: toolUseID,
      type: 'tool_result',
      content: `Workflow run ${out.runId} status=${out.status} completedSteps=${out.completedStepIds.length}`,
    }
  },
} satisfies ToolDef<InputSchema, Output>)
