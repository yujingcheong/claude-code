import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'
import { searchMemories } from '../../services/PersistentMemory/memoryStore.js'
import { traceAsync } from '../../services/Observability/tracing.js'
import { lazySchema } from '../../utils/lazySchema.js'

const inputSchema = lazySchema(() =>
  z.strictObject({
    query: z.string().min(1),
    limit: z.number().int().positive().max(50).optional(),
  }),
)
type InputSchema = ReturnType<typeof inputSchema>

const outputSchema = lazySchema(() =>
  z.object({
    items: z.array(
      z.object({
        id: z.string(),
        text: z.string(),
        scope: z.string().optional(),
        tags: z.array(z.string()).optional(),
        createdAt: z.number(),
      }),
    ),
  }),
)
type OutputSchema = ReturnType<typeof outputSchema>
type Output = z.infer<OutputSchema>

export const MemorySearchTool = buildTool({
  name: 'MemorySearch',
  searchHint: 'search long-term memory entries',
  maxResultSizeChars: 100_000,
  async description() {
    return 'Search persistent long-term memory'
  },
  async prompt() {
    return 'Search stored memory for relevant context'
  },
  get inputSchema(): InputSchema {
    return inputSchema()
  },
  get outputSchema(): OutputSchema {
    return outputSchema()
  },
  userFacingName() {
    return 'MemorySearch'
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
      'tool.memory_search',
      async () => {
        const items = await searchMemories(input.query, input.limit ?? 10)
        return { data: { items } satisfies Output }
      },
      { tool: 'MemorySearch' },
    )
  },
  mapToolResultToToolResultBlockParam(content, toolUseID) {
    const { items } = content as Output
    const lines =
      items.length === 0
        ? ['No memory entries found']
        : items.map(i => `- [${i.id}] ${i.text}`)
    return {
      tool_use_id: toolUseID,
      type: 'tool_result',
      content: lines.join('\n'),
    }
  },
} satisfies ToolDef<InputSchema, Output>)

