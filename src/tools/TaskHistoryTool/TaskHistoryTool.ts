import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'
import { listDurableTasks } from '../../services/DurableTaskState/taskStateStore.js'
import { traceAsync } from '../../services/Observability/tracing.js'
import { lazySchema } from '../../utils/lazySchema.js'

const inputSchema = lazySchema(() =>
  z.strictObject({
    limit: z.number().int().positive().max(200).optional(),
    status: z
      .enum(['pending', 'running', 'paused', 'completed', 'failed'])
      .optional(),
  }),
)
type InputSchema = ReturnType<typeof inputSchema>

const outputSchema = lazySchema(() =>
  z.object({
    tasks: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        status: z.enum(['pending', 'running', 'paused', 'completed', 'failed']),
        createdAt: z.number(),
        updatedAt: z.number(),
      }),
    ),
  }),
)
type OutputSchema = ReturnType<typeof outputSchema>
type Output = z.infer<OutputSchema>

export const TaskHistoryTool = buildTool({
  name: 'TaskHistory',
  searchHint: 'list durable task execution history',
  maxResultSizeChars: 100_000,
  async description() {
    return 'Retrieve persistent durable task history'
  },
  async prompt() {
    return 'List durable tasks and their status'
  },
  get inputSchema(): InputSchema {
    return inputSchema()
  },
  get outputSchema(): OutputSchema {
    return outputSchema()
  },
  userFacingName() {
    return 'TaskHistory'
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
      'tool.task_history',
      async () => {
        const all = await listDurableTasks()
        const filtered = all
          .filter(t => (input.status ? t.status === input.status : true))
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .slice(0, input.limit ?? 50)
          .map(t => ({
            id: t.id,
            name: t.name,
            status: t.status,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
          }))
        return { data: { tasks: filtered } satisfies Output }
      },
      { tool: 'TaskHistory' },
    )
  },
  mapToolResultToToolResultBlockParam(content, toolUseID) {
    const { tasks } = content as Output
    const lines =
      tasks.length === 0
        ? ['No durable tasks found']
        : tasks.map(t => `- ${t.id} [${t.status}] ${t.name}`)
    return {
      tool_use_id: toolUseID,
      type: 'tool_result',
      content: lines.join('\n'),
    }
  },
} satisfies ToolDef<InputSchema, Output>)

