import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import {
  sendEmailViaBrevo,
  runCalendarAction,
  runSupabaseQuery,
  runBrowserAction,
} from '../../src/services/Integrations/providers.js'

const ORIGINAL_ENV = { ...process.env }

function restoreEnv() {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) {
      delete process.env[key]
    }
  }
  Object.assign(process.env, ORIGINAL_ENV)
}

test.afterEach(() => {
  restoreEnv()
})

function createMockServer(handler) {
  return new Promise(resolve => {
    const server = createServer(handler)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${address.port}`,
      })
    })
  })
}

async function readJsonBody(req) {
  let body = ''
  for await (const chunk of req) {
    body += chunk
  }
  return body ? JSON.parse(body) : {}
}

test('sendEmailViaBrevo uses Brevo endpoint and optional Cloudflare webhook', async () => {
  const requests = []
  const { server, baseUrl } = await createMockServer(async (req, res) => {
    const json = await readJsonBody(req)
    requests.push({ method: req.method, url: req.url, json })
    res.statusCode = 200
    res.setHeader('content-type', 'application/json')
    if (req.url === '/v3/smtp/email') {
      res.end(JSON.stringify({ messageId: 'brevo-123' }))
      return
    }
    res.end(JSON.stringify({ ok: true }))
  })

  process.env.BREVO_API_KEY = 'brevo-key'
  process.env.BREVO_SENDER_EMAIL = 'sender@example.com'
  process.env.BREVO_API_URL = `${baseUrl}/v3/smtp/email`
  process.env.CLOUDFLARE_EMAIL_LOG_WEBHOOK_URL = `${baseUrl}/cf-email-log`

  const result = await sendEmailViaBrevo({
    to: 'user@example.com',
    subject: 'Subject',
    body: '<p>Hello</p>',
  })

  assert.equal(result.messageId, 'brevo-123')
  assert.equal(requests.length, 2)
  assert.equal(requests[0].url, '/v3/smtp/email')
  assert.equal(requests[1].url, '/cf-email-log')
  assert.equal(requests[0].json.to[0].email, 'user@example.com')
  assert.equal(requests[1].json.provider, 'brevo')
  await new Promise(resolve => server.close(resolve))
})

test('runCalendarAction supports list/create and retries transient failures', async () => {
  let listAttempts = 0
  const { server, baseUrl } = await createMockServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/events') {
      listAttempts += 1
      if (listAttempts === 1) {
        res.statusCode = 500
        res.end(JSON.stringify({ error: 'retry-me' }))
        return
      }
      res.statusCode = 200
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ items: [{ id: 'evt-1' }] }))
      return
    }
    if (req.method === 'POST' && req.url === '/events') {
      const json = await readJsonBody(req)
      res.statusCode = 200
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ id: 'evt-2', ...json }))
      return
    }
    res.statusCode = 404
    res.end(JSON.stringify({ error: 'not-found' }))
  })

  process.env.CALENDAR_API_BASE_URL = baseUrl
  process.env.CALENDAR_API_KEY = 'calendar-key'

  const listed = await runCalendarAction({ action: 'list_events' })
  assert.deepEqual(listed.items, [{ id: 'evt-1' }])
  assert.equal(listAttempts, 2)

  const created = await runCalendarAction({
    action: 'create_event',
    title: 'Planning',
    startIso: '2026-01-01T10:00:00.000Z',
    endIso: '2026-01-01T11:00:00.000Z',
  })
  assert.equal(created.id, 'evt-2')
  assert.equal(created.title, 'Planning')
  await new Promise(resolve => server.close(resolve))
})

test('runSupabaseQuery sends SQL payload to configured RPC endpoint', async () => {
  const requests = []
  const { server, baseUrl } = await createMockServer(async (req, res) => {
    requests.push({
      method: req.method,
      url: req.url,
      json: await readJsonBody(req),
    })
    res.statusCode = 200
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ rows: [{ ok: true }] }))
  })

  process.env.SUPABASE_URL = baseUrl
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role'
  process.env.SUPABASE_SQL_RPC = 'execute_sql'

  const result = await runSupabaseQuery({
    query: 'select 1',
    readOnly: true,
  })

  assert.deepEqual(result.rows, [{ ok: true }])
  assert.equal(requests.length, 1)
  assert.equal(requests[0].url, '/rest/v1/rpc/execute_sql')
  assert.equal(requests[0].json.query, 'select 1')
  assert.equal(requests[0].json.read_only, true)
  await new Promise(resolve => server.close(resolve))
})

test('runBrowserAction sends action payload to browser runtime', async () => {
  const { server, baseUrl } = await createMockServer(async (req, res) => {
    const json = await readJsonBody(req)
    res.statusCode = 200
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ received: json, ok: true }))
  })

  process.env.BROWSER_RUNTIME_URL = `${baseUrl}/browser`
  process.env.BROWSER_RUNTIME_TOKEN = 'runtime-token'

  const result = await runBrowserAction({
    action: 'open',
    url: 'https://example.com',
  })
  assert.equal(result.ok, true)
  assert.equal(result.received.url, 'https://example.com')
  await new Promise(resolve => server.close(resolve))
})

