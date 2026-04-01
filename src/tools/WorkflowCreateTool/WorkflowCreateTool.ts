import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'
import { createWorkflow } from '../../services/WorkflowEngine/workflowEngine.js'
import { traceAsync } from '../../services/Observability/tracing.js'
import { appendAuditLog, shouldRequireApproval } from '../../services/ToolSafety/toolSafety.js'
import { lazySchema } from '../../utils/lazySchema.js'

const inputSchema = lazySchema(() =>
  z.strictObject({
    name: z.string().min(1),
    steps: z.array(
      z.strictObject({
        id: z.string().min(1),
        description: z.string().min(1),
        dependsOn: z.array(z.string()).optional(),
      }),
    ),
  }),
)
type InputSchema = ReturnType<typeof inputSchema>

const outputSchema = lazySchema(() =>
  z.object({
    workflowId: z.string(),
    stepCount: z.number(),
  }),
)
type OutputSchema = ReturnType<typeof outputSchema>
type Output = z.infer<OutputSchema>

export const WorkflowCreateTool = buildTool({
  name: 'WorkflowCreate',
  maxResultSizeChars: 100_000,
  async description() {
    return 'Create a durable workflow graph'
  },
  async prompt() {
    return 'Create a workflow with steps and dependencies'
  },
  get inputSchema(): InputSchema {
    return inputSchema()
  },
  get outputSchema(): OutputSchema {
    return outputSchema()
  },
  userFacingName() {
    return 'WorkflowCreate'
  },
  isReadOnly() {
    return false
  },
  async checkPermissions(input) {
    const needsApproval = await shouldRequireApproval('WorkflowCreate', input)
    if (needsApproval) {
      return { behavior: 'ask', message: 'Create workflow definition' }
    }
    return { behavior: 'allow', updatedInput: input }
  },
  renderToolUseMessage() {
    return null
  },
  async call(input) {
    return traceAsync(
      'tool.workflow_create',
      async () => {
        const workflow = await createWorkflow(input.name, input.steps)
        await appendAuditLog({
          at: Date.now(),
          event: 'workflow_create',
          workflowId: workflow.id,
          name: workflow.name,
        })
        return {
          data: {
            workflowId: workflow.id,
            stepCount: workflow.steps.length,
          } satisfies Output,
        }
      },
      { tool: 'WorkflowCreate' },
    )
  },
  mapToolResultToToolResultBlockParam(content, toolUseID) {
    const out = content as Output
    return {
      tool_use_id: toolUseID,
      type: 'tool_result',
      content: `Created workflow ${out.workflowId} with ${out.stepCount} step(s)`,
    }
  },
} satisfies ToolDef<InputSchema, Output>)
