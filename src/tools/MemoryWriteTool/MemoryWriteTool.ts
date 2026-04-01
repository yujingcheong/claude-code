import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'
import { addMemory } from '../../services/PersistentMemory/memoryStore.js'
import { traceAsync } from '../../services/Observability/tracing.js'
import { appendAuditLog, shouldRequireApproval } from '../../services/ToolSafety/toolSafety.js'
import { lazySchema } from '../../utils/lazySchema.js'

const inputSchema = lazySchema(() =>
  z.strictObject({
    text: z.string().min(1),
    scope: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
)
type InputSchema = ReturnType<typeof inputSchema>

const outputSchema = lazySchema(() =>
  z.object({
    id: z.string(),
    createdAt: z.number(),
  }),
)
type OutputSchema = ReturnType<typeof outputSchema>

type Output = z.infer<OutputSchema>

export const MemoryWriteTool = buildTool({
  name: 'MemoryWrite',
  maxResultSizeChars: 100_000,
  async description() {
    return 'Store durable long-term memory entries'
  },
  async prompt() {
    return 'Write reusable memory for future tasks'
  },
  get inputSchema(): InputSchema {
    return inputSchema()
  },
  get outputSchema(): OutputSchema {
    return outputSchema()
  },
  userFacingName() {
    return 'MemoryWrite'
  },
  isReadOnly() {
    return false
  },
  async checkPermissions(input) {
    const needsApproval = await shouldRequireApproval('MemoryWrite', input)
    if (needsApproval) {
      return { behavior: 'ask', message: 'Store long-term memory entry' }
    }
    return { behavior: 'allow', updatedInput: input }
  },
  renderToolUseMessage() {
    return null
  },
  async call(input) {
    return traceAsync(
      'tool.memory_write',
      async () => {
        const rec = await addMemory(input.text, {
          scope: input.scope,
          tags: input.tags,
        })
        await appendAuditLog({
          at: Date.now(),
          event: 'memory_write',
          id: rec.id,
          scope: rec.scope,
          tags: rec.tags,
        })
        return {
          data: {
            id: rec.id,
            createdAt: rec.createdAt,
          } satisfies Output,
        }
      },
      { tool: 'MemoryWrite' },
    )
  },
  mapToolResultToToolResultBlockParam(content, toolUseID) {
    const output = content as Output
    return {
      tool_use_id: toolUseID,
      type: 'tool_result',
      content: `Memory saved with id ${output.id}`,
    }
  },
} satisfies ToolDef<InputSchema, Output>)
