import { randomUUID } from 'crypto'
import { readJsonFile, writeJsonFile } from '../platform/jsonStore.js'
import { createDurableTask, updateDurableTask } from '../DurableTaskState/taskStateStore.js'

export type WorkflowStep = {
  id: string
  description: string
  dependsOn?: string[]
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
    taskId: task.id,
  }

  try {
    const remaining = new Set(workflow.steps.map(s => s.id))
    while (remaining.size > 0) {
      let progressed = false
      for (const step of workflow.steps) {
        if (!remaining.has(step.id)) continue
        const deps = step.dependsOn ?? []
        if (!deps.every(dep => run.completedStepIds.includes(dep))) continue
        run.completedStepIds.push(step.id)
        remaining.delete(step.id)
        progressed = true
      }
      if (!progressed) {
        throw new Error('Workflow has cyclic or unsatisfied dependencies')
      }
    }
    run.status = 'completed'
    run.updatedAt = Date.now()
    await updateDurableTask(task.id, {
      status: 'completed',
      result: { runId: run.id, completedStepIds: run.completedStepIds },
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

