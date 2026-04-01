import { randomUUID } from 'crypto'
import { readJsonFile, writeJsonFile } from '../platform/jsonStore.js'
import { createDurableTask, updateDurableTask } from '../DurableTaskState/taskStateStore.js'
import { executeWorkflowSteps } from './runtime.js'

export type WorkflowStep = {
  id: string
  description: string
  dependsOn?: string[]
  timeoutMs?: number
  retryCount?: number
  checkpointData?: Record<string, unknown>
}

export type WorkflowDefinition = {
  id: string
  name: string
  createdAt: number
  steps: WorkflowStep[]
}

export type WorkflowRunStatus = 'pending' | 'running' | 'completed' | 'failed'

export type WorkflowRun = {
  id: string
  workflowId: string
  status: WorkflowRunStatus
  createdAt: number
  updatedAt: number
  completedStepIds: string[]
  stepAttempts?: Record<string, number>
  checkpoints?: Array<{
    stepId: string
    at: number
    data?: Record<string, unknown>
  }>
  taskId?: string
  error?: string
}

type WorkflowFile = {
  workflows: WorkflowDefinition[]
  runs: WorkflowRun[]
}

const WORKFLOW_FILE = 'workflows.json'

async function load(): Promise<WorkflowFile> {
  return readJsonFile<WorkflowFile>(WORKFLOW_FILE, { workflows: [], runs: [] })
}

async function save(file: WorkflowFile): Promise<void> {
  await writeJsonFile<WorkflowFile>(WORKFLOW_FILE, file)
}

export async function createWorkflow(
  name: string,
  steps: WorkflowStep[],
): Promise<WorkflowDefinition> {
  const workflow: WorkflowDefinition = {
    id: randomUUID(),
    name,
    createdAt: Date.now(),
    steps,
  }
  const file = await load()
  file.workflows.push(workflow)
  await save(file)
  return workflow
}

export async function listWorkflows(): Promise<WorkflowDefinition[]> {
  const file = await load()
  return file.workflows
}

export async function runWorkflow(workflowId: string): Promise<WorkflowRun | null> {
  const file = await load()
  const workflow = file.workflows.find(w => w.id === workflowId)
  if (!workflow) return null

  const task = await createDurableTask(`workflow:${workflow.name}`, {
    workflowId: workflow.id,
  })

  const run: WorkflowRun = {
    id: randomUUID(),
    workflowId,
    status: 'running',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    completedStepIds: [],
    stepAttempts: {},
    checkpoints: [],
    taskId: task.id,
  }

  try {
    const execution = await executeWorkflowSteps(workflow.steps)
    run.completedStepIds = execution.completedStepIds
    run.stepAttempts = execution.stepAttempts
    run.checkpoints = execution.checkpoints
    run.status = 'completed'
    run.updatedAt = Date.now()
    await updateDurableTask(task.id, {
      status: 'completed',
      result: {
        runId: run.id,
        completedStepIds: run.completedStepIds,
        checkpoints: run.checkpoints,
        stepAttempts: run.stepAttempts,
      },
    })
  } catch (error: unknown) {
    run.status = 'failed'
    run.error = error instanceof Error ? error.message : String(error)
    run.updatedAt = Date.now()
    await updateDurableTask(task.id, {
      status: 'failed',
      error: run.error,
    })
  }

  file.runs.push(run)
  await save(file)
  return run
}

export async function getWorkflowRun(runId: string): Promise<WorkflowRun | null> {
  const file = await load()
  return file.runs.find(r => r.id === runId) ?? null
}
