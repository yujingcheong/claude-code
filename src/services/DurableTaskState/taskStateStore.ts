import { randomUUID } from 'crypto'
import { readJsonFile, writeJsonFile } from '../platform/jsonStore.js'

export type DurableTaskStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'

export type DurableTaskRecord = {
  id: string
  name: string
  status: DurableTaskStatus
  createdAt: number
  updatedAt: number
  payload?: Record<string, unknown>
  result?: unknown
  error?: string
}

type TaskStateFile = {
  tasks: DurableTaskRecord[]
}

const TASK_STATE_FILE = 'durable-task-state.json'

export async function listDurableTasks(): Promise<DurableTaskRecord[]> {
  const file = await readJsonFile<TaskStateFile>(TASK_STATE_FILE, { tasks: [] })
  return file.tasks
}

export async function createDurableTask(
  name: string,
  payload?: Record<string, unknown>,
): Promise<DurableTaskRecord> {
  const now = Date.now()
  const task: DurableTaskRecord = {
    id: randomUUID(),
    name,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    payload,
  }
  const tasks = await listDurableTasks()
  tasks.push(task)
  await writeJsonFile<TaskStateFile>(TASK_STATE_FILE, { tasks })
  return task
}

export async function updateDurableTask(
  id: string,
  patch: Partial<
    Pick<DurableTaskRecord, 'status' | 'result' | 'error' | 'payload' | 'name'>
  >,
): Promise<DurableTaskRecord | null> {
  const tasks = await listDurableTasks()
  const idx = tasks.findIndex(t => t.id === id)
  if (idx < 0) return null
  const next: DurableTaskRecord = {
    ...tasks[idx]!,
    ...patch,
    updatedAt: Date.now(),
  }
  tasks[idx] = next
  await writeJsonFile<TaskStateFile>(TASK_STATE_FILE, { tasks })
  return next
}

