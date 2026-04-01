import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'
import { traceAsync } from '../../services/Observability/tracing.js'
import { appendAuditLog, shouldRequireApproval } from '../../services/ToolSafety/toolSafety.js'
import { lazySchema } from '../../utils/lazySchema.js'

const inputSchema = lazySchema(() =>
  z.strictObject({
    query: z.string().min(1),
    readOnly: z.boolean().optional(),
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

export const DatabaseQueryTool = buildTool({
  name: 'DatabaseQuery',
  maxResultSizeChars: 100_000,
  async description() {
    return 'Run a database query through configured connector'
  },
  async prompt() {
    return 'Use for SQL/DB-backed tasks'
  },
  get inputSchema(): InputSchema {
    return inputSchema()
  },
  get outputSchema(): OutputSchema {
    return outputSchema()
  },
  userFacingName() {
    return 'DatabaseQuery'
  },
  isReadOnly(input) {
    return input.readOnly ?? false
  },
  async checkPermissions(input) {
    const needsApproval = await shouldRequireApproval('DatabaseQuery', input)
    if (needsApproval) {
      return { behavior: 'ask', message: 'Approve potentially mutating DB query' }
    }
    return { behavior: 'allow', updatedInput: input }
  },
  renderToolUseMessage() {
    return null
  },
  async call(input) {
    return traceAsync(
      'tool.database_query',
      async () => {
        await appendAuditLog({
          at: Date.now(),
          event: 'database_query',
          readOnly: input.readOnly ?? false,
        })
        return {
          data: {
            ok: true,
            message:
              'Database connector baseline is enabled. Integrate a real DB adapter for query execution.',
          } satisfies Output,
        }
      },
      { tool: 'DatabaseQuery' },
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
