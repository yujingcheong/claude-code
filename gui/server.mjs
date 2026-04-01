import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = resolve(__dirname, '..')
const publicDir = resolve(__dirname, 'public')
const port = Number(process.env.GUI_PORT || 3000)

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(payload))
}

async function serveStatic(res, relativePath, contentType) {
  try {
    const content = await readFile(resolve(publicDir, relativePath))
    res.writeHead(200, { 'Content-Type': contentType })
    res.end(content)
  } catch {
    res.writeHead(404)
    res.end('Not found')
  }
}

function parseBody(req) {
  return new Promise((resolveBody, rejectBody) => {
    let data = ''
    req.on('data', chunk => {
      data += chunk
      if (data.length > 1024 * 1024) {
        rejectBody(new Error('Request body too large'))
      }
    })
    req.on('end', () => {
      try {
        resolveBody(JSON.parse(data || '{}'))
      } catch {
        rejectBody(new Error('Invalid JSON'))
      }
    })
    req.on('error', rejectBody)
  })
}

function runClaudePrompt(prompt) {
  return new Promise((resolveResult, rejectResult) => {
    const cliPath = resolve(rootDir, 'cli.js')
    const child = spawn(process.execPath, [cliPath, '-p', prompt], {
      cwd: rootDir,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', chunk => {
      stdout += String(chunk)
    })
    child.stderr.on('data', chunk => {
      stderr += String(chunk)
    })
    child.on('error', rejectResult)
    child.on('close', code => {
      if (code === 0) {
        resolveResult({ output: stdout.trim() })
      } else {
        rejectResult(
          new Error(stderr.trim() || `Claude process failed with exit code ${code}`),
        )
      }
    })
  })
}

const server = createServer(async (req, res) => {
  if (!req.url || !req.method) {
    res.writeHead(400)
    res.end('Bad request')
    return
  }

  if (req.method === 'GET' && req.url === '/') {
    await serveStatic(res, 'index.html', 'text/html; charset=utf-8')
    return
  }
  if (req.method === 'GET' && req.url === '/app.js') {
    await serveStatic(res, 'app.js', 'application/javascript; charset=utf-8')
    return
  }
  if (req.method === 'GET' && req.url === '/styles.css') {
    await serveStatic(res, 'styles.css', 'text/css; charset=utf-8')
    return
  }
  if (req.method === 'POST' && req.url === '/api/chat') {
    try {
      const body = await parseBody(req)
      const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
      if (!prompt) {
        sendJson(res, 400, { error: 'Prompt is required' })
        return
      }
      const result = await runClaudePrompt(prompt)
      sendJson(res, 200, result)
    } catch (error) {
      sendJson(res, 500, { error: error instanceof Error ? error.message : 'Unknown error' })
    }
    return
  }

  res.writeHead(404)
  res.end('Not found')
})

server.listen(port, () => {
  console.log(`Claude GUI running at http://localhost:${port}`)
})
