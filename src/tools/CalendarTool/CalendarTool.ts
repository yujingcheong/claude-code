import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'
import { traceAsync } from '../../services/Observability/tracing.js'
import { appendAuditLog, shouldRequireApproval } from '../../services/ToolSafety/toolSafety.js'
import { lazySchema } from '../../utils/lazySchema.js'

const inputSchema = lazySchema(() =>
  z.strictObject({
    action: z.enum(['create_event', 'list_events']),
    title: z.string().optional(),
    startIso: z.string().optional(),
    endIso: z.string().optional(),
  }),
)
type InputSchema = ReturnType<typeof inputSchema>

const outputSchema = lazySchema(() =>
  z.object({
    ok: z.boolean(),
    message: z.string(),
  }),
)
type OutputSchema = ReturnType<typeof outputSchema>
type Output = z.infer<OutputSchema>

export const CalendarTool = buildTool({
  name: 'CalendarTool',
  maxResultSizeChars: 100_000,
  async description() {
    return 'Create and inspect calendar events via connector'
  },
  async prompt() {
    return 'Use for calendar scheduling tasks'
  },
  get inputSchema(): InputSchema {
    return inputSchema()
  },
  get outputSchema(): OutputSchema {
    return outputSchema()
  },
  userFacingName() {
    return 'CalendarTool'
  },
  isReadOnly(input) {
    return input.action === 'list_events'
  },
  async checkPermissions(input) {
    const needsApproval = await shouldRequireApproval('CalendarTool', input)
    if (needsApproval) {
      return { behavior: 'ask', message: 'Approve calendar write action' }
    }
    return { behavior: 'allow', updatedInput: input }
  },
  renderToolUseMessage() {
    return null
  },
  async call(input) {
    return traceAsync(
      'tool.calendar',
      async () => {
        await appendAuditLog({
          at: Date.now(),
          event: 'calendar_action',
          action: input.action,
          title: input.title,
        })
        return {
          data: {
            ok: true,
            message:
              'Calendar connector baseline is enabled. Integrate Google/Microsoft API for live operations.',
          } satisfies Output,
        }
      },
      { tool: 'CalendarTool' },
    )
  },
  mapToolResultToToolResultBlockParam(content, toolUseID) {
    const out = content as Output
    return {
      tool_use_id: toolUseID,
      type: 'tool_result',
      content: out.message,
    }
  },
} satisfies ToolDef<InputSchema, Output>)
