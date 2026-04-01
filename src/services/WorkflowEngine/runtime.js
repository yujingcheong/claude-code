export async function executeWorkflowSteps(steps) {
  const completedStepIds = []
  const stepAttempts = {}
  const checkpoints = []
  const simulatedFailureRemaining = new Map()

  for (const step of steps) {
    simulatedFailureRemaining.set(step.id, Math.max(0, step.simulatedFailureCount ?? 0))
  }

  const executeStep = async step => {
    const attempt = (stepAttempts[step.id] ?? 0) + 1
    stepAttempts[step.id] = attempt
    const timeoutMs = Math.max(1, step.timeoutMs ?? 30_000)
    const simulatedDelayMs = Math.max(0, step.simulatedDelayMs ?? 0)
    const simulatedFailureLeft = simulatedFailureRemaining.get(step.id) ?? 0

    const stepWork = async () => {
      if (simulatedFailureLeft > 0) {
        simulatedFailureRemaining.set(step.id, simulatedFailureLeft - 1)
        throw new Error(`Simulated transient step failure for ${step.id}`)
      }
      if (simulatedDelayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, simulatedDelayMs))
      }
    }

    await Promise.race([
      stepWork(),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Step ${step.id} timed out after ${timeoutMs}ms`)), timeoutMs)
      }),
    ])
  }

  const remaining = new Set(steps.map(step => step.id))
  while (remaining.size > 0) {
    let progressed = false
    for (const step of steps) {
      if (!remaining.has(step.id)) continue
      const deps = step.dependsOn ?? []
      if (!deps.every(dep => completedStepIds.includes(dep))) continue

      const retries = Math.max(0, step.retryCount ?? 0)
      let stepCompleted = false
      let lastError = undefined

      for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
          await executeStep(step)
          completedStepIds.push(step.id)
          checkpoints.push({
            stepId: step.id,
            at: Date.now(),
            data: step.checkpointData,
          })
          remaining.delete(step.id)
          progressed = true
          stepCompleted = true
          break
        } catch (error) {
          lastError = error instanceof Error ? error.message : String(error)
          if (attempt >= retries) {
            throw new Error(`Step ${step.id} failed after ${retries + 1} attempt(s): ${lastError}`)
          }
        }
      }

      if (!stepCompleted) {
        throw new Error(`Step ${step.id} did not complete`)
      }
    }
    if (!progressed) {
      throw new Error('Workflow has cyclic or unsatisfied dependencies')
    }
  }

  return {
    completedStepIds,
    stepAttempts,
    checkpoints,
  }
}
