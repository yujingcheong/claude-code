import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'
import { traceAsync } from '../../services/Observability/tracing.js'
import { appendAuditLog, shouldRequireApproval } from '../../services/ToolSafety/toolSafety.js'
import { lazySchema } from '../../utils/lazySchema.js'

const inputSchema = lazySchema(() =>
  z.strictObject({
    to: z.string().email(),
    subject: z.string().min(1),
    body: z.string().min(1),
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

export const EmailSendTool = buildTool({
  name: 'EmailSend',
  maxResultSizeChars: 100_000,
  async description() {
    return 'Send outbound email through configured connector'
  },
  async prompt() {
    return 'Send an email after user approval'
  },
  get inputSchema(): InputSchema {
    return inputSchema()
  },
  get outputSchema(): OutputSchema {
    return outputSchema()
  },
  userFacingName() {
    return 'EmailSend'
  },
  isReadOnly() {
    return false
  },
  isDestructive() {
    return true
  },
  async checkPermissions(input) {
    const needsApproval = await shouldRequireApproval('EmailSend', input)
    if (needsApproval) {
      return { behavior: 'ask', message: `Approve sending email to ${input.to}` }
    }
    return { behavior: 'allow', updatedInput: input }
  },
  renderToolUseMessage() {
    return null
  },
  async call(input) {
    return traceAsync(
      'tool.email_send',
      async () => {
        await appendAuditLog({
          at: Date.now(),
          event: 'email_send',
          to: input.to,
          subject: input.subject,
        })
        return {
          data: {
            ok: true,
            message:
              'Email connector baseline is enabled. Wire SMTP or provider API for live delivery.',
          } satisfies Output,
        }
      },
      { tool: 'EmailSend' },
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
