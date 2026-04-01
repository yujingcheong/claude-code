import test from 'node:test'
import assert from 'node:assert/strict'
import { executeWorkflowSteps } from '../../src/services/WorkflowEngine/runtime.js'

test('executeWorkflowSteps honors dependencies and checkpoints', async () => {
  const result = await executeWorkflowSteps([
    { id: 'a', description: 'A', checkpointData: { stage: 1 } },
    { id: 'b', description: 'B', dependsOn: ['a'], checkpointData: { stage: 2 } },
  ])

  assert.deepEqual(result.completedStepIds, ['a', 'b'])
  assert.equal(result.checkpoints.length, 2)
  assert.equal(result.checkpoints[0].stepId, 'a')
  assert.equal(result.checkpoints[1].stepId, 'b')
})

test('executeWorkflowSteps retries transient failures and records attempts', async () => {
  const result = await executeWorkflowSteps([
    {
      id: 'retry-step',
      description: 'Retry once',
      retryCount: 1,
    },
  ], {
    simulation: {
      'retry-step': { failures: 1 },
    },
  })

  assert.deepEqual(result.completedStepIds, ['retry-step'])
  assert.equal(result.stepAttempts['retry-step'], 2)
})

test('executeWorkflowSteps times out steps and throws', async () => {
  await assert.rejects(
    () =>
      executeWorkflowSteps([
        {
          id: 'timeout-step',
          description: 'Timeout',
          timeoutMs: 1,
          retryCount: 0,
        },
      ], {
        simulation: {
          'timeout-step': { delayMs: 10 },
        },
      }),
    /timed out/i,
  )
})
