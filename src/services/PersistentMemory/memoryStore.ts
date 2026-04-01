import { randomUUID } from 'crypto'
import { readJsonFile, writeJsonFile } from '../platform/jsonStore.js'

export type MemoryRecord = {
  id: string
  text: string
  scope?: string
  tags?: string[]
  createdAt: number
}

type MemoryFile = {
  items: MemoryRecord[]
}

const MEMORY_FILE = 'persistent-memory.json'

export async function addMemory(
  text: string,
  options?: { scope?: string; tags?: string[] },
): Promise<MemoryRecord> {
  const item: MemoryRecord = {
    id: randomUUID(),
    text,
    scope: options?.scope,
    tags: options?.tags,
    createdAt: Date.now(),
  }
  const file = await readJsonFile<MemoryFile>(MEMORY_FILE, { items: [] })
  file.items.push(item)
  await writeJsonFile<MemoryFile>(MEMORY_FILE, file)
  return item
}

export async function listMemories(): Promise<MemoryRecord[]> {
  const file = await readJsonFile<MemoryFile>(MEMORY_FILE, { items: [] })
  return file.items
}

export async function searchMemories(
  query: string,
  limit = 10,
): Promise<MemoryRecord[]> {
  const q = query.toLowerCase().trim()
  if (!q) return []
  const all = await listMemories()
  const scored = all
    .map(item => {
      const text = item.text.toLowerCase()
      const scope = item.scope?.toLowerCase() ?? ''
      const tags = (item.tags ?? []).join(' ').toLowerCase()
      let score = 0
      if (text.includes(q)) score += 3
      if (scope.includes(q)) score += 2
      if (tags.includes(q)) score += 1
      return { item, score }
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score || b.item.createdAt - a.item.createdAt)
    .slice(0, limit)
    .map(x => x.item)
  return scored
}

