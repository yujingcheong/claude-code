import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'
import { traceAsync } from '../../services/Observability/tracing.js'
import { appendAuditLog, shouldRequireApproval } from '../../services/ToolSafety/toolSafety.js'
import { lazySchema } from '../../utils/lazySchema.js'

const inputSchema = lazySchema(() =>
  z.strictObject({
    action: z.enum(['open', 'click', 'type', 'extract']),
    url: z.string().optional(),
    selector: z.string().optional(),
    text: z.string().optional(),
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

export const BrowserAutomateTool = buildTool({
  name: 'BrowserAutomate',
  maxResultSizeChars: 100_000,
  async description() {
    return 'Automate browser-like actions with auditable execution'
  },
  async prompt() {
    return 'Use for browser automation workflows'
  },
  get inputSchema(): InputSchema {
    return inputSchema()
  },
  get outputSchema(): OutputSchema {
    return outputSchema()
  },
  userFacingName() {
    return 'BrowserAutomate'
  },
  isReadOnly(input) {
    return input.action === 'extract'
  },
  async checkPermissions(input) {
    const needsApproval = await shouldRequireApproval('BrowserAutomate', input)
    if (needsApproval) {
      return { behavior: 'ask', message: `Approve browser action ${input.action}` }
    }
    return { behavior: 'allow', updatedInput: input }
  },
  renderToolUseMessage() {
    return null
  },
  async call(input) {
    return traceAsync(
      'tool.browser_automate',
      async () => {
        await appendAuditLog({
          at: Date.now(),
          event: 'browser_automate',
          input,
        })
        return {
          data: {
            ok: true,
            message:
              'Browser connector baseline is enabled. Integrate Playwright runtime for full DOM execution.',
          } satisfies Output,
        }
      },
      { tool: 'BrowserAutomate' },
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
