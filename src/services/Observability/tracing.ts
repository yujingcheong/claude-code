import { appendFile } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { ensurePlatformDataDir } from '../platform/paths.js'

export type TraceSpan = {
  traceId: string
  spanId: string
  name: string
  startTime: number
  endTime: number
  attrs?: Record<string, unknown>
}

async function writeSpan(span: TraceSpan): Promise<void> {
  const dir = await ensurePlatformDataDir()
  const path = join(dir, 'traces.log')
  await appendFile(path, `${JSON.stringify(span)}\n`, {
    encoding: 'utf-8',
    mode: 0o600,
  })
}

export async function traceAsync<T>(
  name: string,
  fn: () => Promise<T>,
  attrs?: Record<string, unknown>,
): Promise<T> {
  const traceId = randomUUID()
  const spanId = randomUUID()
  const startTime = Date.now()
  try {
    const result = await fn()
    await writeSpan({
      traceId,
      spanId,
      name,
      startTime,
      endTime: Date.now(),
      attrs: { ...attrs, status: 'ok' },
    })
    return result
  } catch (error: unknown) {
    await writeSpan({
      traceId,
      spanId,
      name,
      startTime,
      endTime: Date.now(),
      attrs: {
        ...attrs,
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      },
    })
    throw error
  }
}

