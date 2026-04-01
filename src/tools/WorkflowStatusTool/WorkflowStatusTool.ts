import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'
import { getWorkflowRun } from '../../services/WorkflowEngine/workflowEngine.js'
import { traceAsync } from '../../services/Observability/tracing.js'
import { lazySchema } from '../../utils/lazySchema.js'

const inputSchema = lazySchema(() =>
  z.strictObject({
    runId: z.string().min(1),
  }),
)
type InputSchema = ReturnType<typeof inputSchema>

const outputSchema = lazySchema(() =>
  z.object({
    found: z.boolean(),
    status: z.enum(['pending', 'running', 'completed', 'failed']).optional(),
    completedStepIds: z.array(z.string()).optional(),
    taskId: z.string().optional(),
    error: z.string().optional(),
  }),
)
type OutputSchema = ReturnType<typeof outputSchema>
type Output = z.infer<OutputSchema>

export const WorkflowStatusTool = buildTool({
  name: 'WorkflowStatus',
  maxResultSizeChars: 100_000,
  async description() {
    return 'Inspect a workflow run status'
  },
  async prompt() {
    return 'Retrieve workflow execution status'
  },
  get inputSchema(): InputSchema {
    return inputSchema()
  },
  get outputSchema(): OutputSchema {
    return outputSchema()
  },
  userFacingName() {
    return 'WorkflowStatus'
  },
  isReadOnly() {
    return true
  },
  isConcurrencySafe() {
    return true
  },
  renderToolUseMessage() {
    return null
  },
  async call(input) {
    return traceAsync(
      'tool.workflow_status',
      async () => {
        const run = await getWorkflowRun(input.runId)
        if (!run) {
          return { data: { found: false } satisfies Output }
        }
        return {
          data: {
            found: true,
            status: run.status,
            completedStepIds: run.completedStepIds,
            taskId: run.taskId,
            error: run.error,
          } satisfies Output,
        }
      },
      { tool: 'WorkflowStatus' },
    )
  },
  mapToolResultToToolResultBlockParam(content, toolUseID) {
    const out = content as Output
    const msg = !out.found
      ? 'Workflow run not found'
      : `Workflow status=${out.status} completedSteps=${out.completedStepIds?.length ?? 0}`
    return {
      tool_use_id: toolUseID,
      type: 'tool_result',
      content: msg,
      is_error: !out.found,
    }
  },
} satisfies ToolDef<InputSchema, Output>)
