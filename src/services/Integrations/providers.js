const DEFAULT_TIMEOUT_MS = 15_000

function getRequiredEnv(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

async function fetchWithTimeout(url, init, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchJsonWithRetry(url, init, options = {}) {
  const maxRetries = options.maxRetries ?? 2
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  let lastError = null

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url, init, timeoutMs)
      const responseText = await response.text()
      let parsed = null
      try {
        parsed = responseText ? JSON.parse(responseText) : null
      } catch {
        parsed = responseText
      }

      if (!response.ok) {
        const error = new Error(
          `Request failed (${response.status}): ${
            typeof parsed === 'string' ? parsed : JSON.stringify(parsed)
          }`,
        )
        if (response.status >= 500 && attempt < maxRetries) {
          lastError = error
          continue
        }
        throw error
      }

      return { status: response.status, data: parsed }
    } catch (error) {
      lastError = error
      if (attempt >= maxRetries) break
    }
  }

  throw lastError ?? new Error('Request failed without details')
}

export async function sendEmailViaBrevo(input) {
  const apiKey = getRequiredEnv('BREVO_API_KEY')
  const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.BREVO_FROM_EMAIL
  if (!senderEmail) {
    throw new Error('Missing required environment variable: BREVO_SENDER_EMAIL')
  }
  const senderName = process.env.BREVO_SENDER_NAME || 'Claude Code'
  const brevoUrl =
    process.env.BREVO_API_URL || 'https://api.brevo.com/v3/smtp/email'

  const payload = {
    sender: { email: senderEmail, name: senderName },
    to: [{ email: input.to }],
    subject: input.subject,
    htmlContent: input.body,
  }

  const brevoResult = await fetchJsonWithRetry(
    brevoUrl,
    {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(payload),
    },
    { maxRetries: 2, timeoutMs: 15_000 },
  )

  const cloudflareLogWebhook = process.env.CLOUDFLARE_EMAIL_LOG_WEBHOOK_URL
  if (cloudflareLogWebhook) {
    await fetchJsonWithRetry(
      cloudflareLogWebhook,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          provider: 'brevo',
          to: input.to,
          subject: input.subject,
          messageId:
            brevoResult.data && typeof brevoResult.data === 'object'
              ? brevoResult.data.messageId
              : undefined,
        }),
      },
      { maxRetries: 1, timeoutMs: 8_000 },
    )
  }

  return brevoResult.data
}

export async function runCalendarAction(input) {
  const baseUrl = getRequiredEnv('CALENDAR_API_BASE_URL')
  const apiKey = process.env.CALENDAR_API_KEY
  const bearerToken = process.env.CALENDAR_API_BEARER_TOKEN
  const authHeaders = bearerToken
    ? { authorization: `Bearer ${bearerToken}` }
    : apiKey
      ? { 'x-api-key': apiKey }
      : {}

  if (Object.keys(authHeaders).length === 0) {
    throw new Error(
      'Missing calendar auth: set CALENDAR_API_BEARER_TOKEN or CALENDAR_API_KEY',
    )
  }

  if (input.action === 'list_events') {
    const result = await fetchJsonWithRetry(
      `${baseUrl.replace(/\/$/, '')}/events`,
      {
        method: 'GET',
        headers: {
          accept: 'application/json',
          ...authHeaders,
        },
      },
      { maxRetries: 2, timeoutMs: 15_000 },
    )
    return result.data
  }

  const result = await fetchJsonWithRetry(
    `${baseUrl.replace(/\/$/, '')}/events`,
    {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        title: input.title,
        startIso: input.startIso,
        endIso: input.endIso,
      }),
    },
    { maxRetries: 2, timeoutMs: 15_000 },
  )
  return result.data
}

export async function runSupabaseQuery(input) {
  const supabaseUrl = getRequiredEnv('SUPABASE_URL')
  const serviceRoleKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY')
  const rpcName = process.env.SUPABASE_SQL_RPC || 'execute_sql'
  const endpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/${rpcName}`

  const result = await fetchJsonWithRetry(
    endpoint,
    {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        query: input.query,
        read_only: Boolean(input.readOnly),
      }),
    },
    { maxRetries: 2, timeoutMs: 20_000 },
  )
  return result.data
}

export async function runBrowserAction(input) {
  const runtimeUrl = getRequiredEnv('BROWSER_RUNTIME_URL')
  const runtimeToken = process.env.BROWSER_RUNTIME_TOKEN

  const result = await fetchJsonWithRetry(
    runtimeUrl,
    {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        ...(runtimeToken ? { authorization: `Bearer ${runtimeToken}` } : {}),
      },
      body: JSON.stringify(input),
    },
    { maxRetries: 2, timeoutMs: 30_000 },
  )
  return result.data
}

