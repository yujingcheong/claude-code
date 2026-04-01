const form = document.getElementById('chat-form')
const promptInput = document.getElementById('prompt')
const output = document.getElementById('output')
const sendButton = document.getElementById('send')

form.addEventListener('submit', async event => {
  event.preventDefault()
  const prompt = promptInput.value.trim()
  if (!prompt) return

  sendButton.disabled = true
  output.textContent = 'Running...'

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || 'Request failed')
    }
    output.textContent = data.output || '(no output)'
  } catch (error) {
    output.textContent = `Error: ${error instanceof Error ? error.message : String(error)}`
  } finally {
    sendButton.disabled = false
  }
})
