import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'
import { traceAsync } from '../../services/Observability/tracing.js'
import { appendAuditLog, shouldRequireApproval } from '../../services/ToolSafety/toolSafety.js'
import { lazySchema } from '../../utils/lazySchema.js'

const inputSchema = lazySchema(() =>
  z.strictObject({
    url: z.string().url(),
    method: z.enum(['POST', 'PUT', 'PATCH']).default('POST'),
    body: z.record(z.string(), z.unknown()).optional(),
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

export const WebhookTriggerTool = buildTool({
  name: 'WebhookTrigger',
  maxResultSizeChars: 100_000,
  async description() {
    return 'Trigger external webhook events'
  },
  async prompt() {
    return 'Use for outbound webhook automation'
  },
  get inputSchema(): InputSchema {
    return inputSchema()
  },
  get outputSchema(): OutputSchema {
    return outputSchema()
  },
  userFacingName() {
    return 'WebhookTrigger'
  },
  isReadOnly() {
    return false
  },
  isDestructive() {
    return true
  },
  async checkPermissions(input) {
    const needsApproval = await shouldRequireApproval('WebhookTrigger', input)
    if (needsApproval) {
      return { behavior: 'ask', message: 'Approve outbound webhook request' }
    }
    return { behavior: 'allow', updatedInput: input }
  },
  renderToolUseMessage() {
    return null
  },
  async call(input) {
    return traceAsync(
      'tool.webhook_trigger',
      async () => {
        await appendAuditLog({
          at: Date.now(),
          event: 'webhook_trigger',
          url: input.url,
          method: input.method,
        })
        return {
          data: {
            ok: true,
            message:
              'Webhook connector baseline is enabled. Add provider auth + retries for production use.',
          } satisfies Output,
        }
      },
      { tool: 'WebhookTrigger' },
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
