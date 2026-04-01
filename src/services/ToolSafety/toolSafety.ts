import { appendFile } from 'fs/promises'
import { join } from 'path'
import { ensurePlatformDataDir } from '../platform/paths.js'

export type ToolRiskLevel = 'read' | 'write' | 'destructive'

const destructiveToolNames = new Set([
  'FileEdit',
  'FileWrite',
  'TaskUpdate',
  'TaskStop',
  'TodoWrite',
  'Bash',
  'PowerShell',
  'WebhookTrigger',
  'EmailSend',
  'DatabaseQuery',
])

const writeToolNames = new Set([
  'Config',
  'TaskCreate',
  'TaskUpdate',
  'TeamCreate',
  'TeamDelete',
  'WorkflowCreate',
  'WorkflowRun',
  'MemoryWrite',
])

export function classifyToolRisk(toolName: string): ToolRiskLevel {
  if (destructiveToolNames.has(toolName)) return 'destructive'
  if (writeToolNames.has(toolName)) return 'write'
  return 'read'
}

export async function shouldRequireApproval(
  toolName: string,
  input: unknown,
): Promise<boolean> {
  const risk = classifyToolRisk(toolName)
  if (risk !== 'destructive') return false
  const bypass = process.env.CLAUDE_CODE_SAFETY_AUTO_APPROVE
  if (bypass === '1' || bypass === 'true') return false
  await appendAuditLog({
    at: Date.now(),
    event: 'approval_required',
    toolName,
    input,
  })
  return true
}

export async function appendAuditLog(entry: Record<string, unknown>): Promise<void> {
  const dir = await ensurePlatformDataDir()
  const path = join(dir, 'audit.log')
  await appendFile(path, `${JSON.stringify(entry)}\n`, {
    encoding: 'utf-8',
    mode: 0o600,
  })
}

