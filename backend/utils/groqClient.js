/**
 * Centralised Groq API client.
 * All AI routes must use this instead of copy-pasting fetch() calls.
 */

const GROQ_BASE = "https://api.groq.com/openai/v1/chat/completions";

/**
 * Send a chat completion request to the Groq API.
 * @param {Object} opts
 * @param {Array}  opts.messages    - OpenAI-style message array
 * @param {string} [opts.apiKey]    - Override API key (defaults to GROQ_API_KEY env var)
 * @param {string} [opts.model]     - Model ID (default: llama-3.1-8b-instant)
 * @param {number} [opts.temperature] - Sampling temperature (default: 0.3)
 * @param {boolean}[opts.jsonMode]  - Request JSON response_format (default: true)
 * @returns {Promise<string>} Raw content string from the model
 */
export async function groqChat({
  messages,
  apiKey,
  model = "llama-3.1-8b-instant",
  temperature = 0.3,
  jsonMode = true,
}) {
  const key = apiKey || process.env.GROQ_API_KEY || "";
  if (!key) throw new Error("Groq API key not configured.");

  const body = {
    model,
    temperature,
    messages,
    ...(jsonMode && { response_format: { type: "json_object" } }),
  };

  const resp = await fetch(GROQ_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => resp.status);
    throw new Error(`Groq API error ${resp.status}: ${errText}`);
  }

  const data = await resp.json();
  return data.choices?.[0]?.message?.content || "";
}

/**
 * Convenience wrapper — same as groqChat but uses GROQ_MOOD_API_KEY.
 * Use this for customer-facing mood / chat routes.
 */
export async function groqMoodChat(opts) {
  return groqChat({ ...opts, apiKey: process.env.GROQ_MOOD_API_KEY || process.env.GROQ_API_KEY || "" });
}
