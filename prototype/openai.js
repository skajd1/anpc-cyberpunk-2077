import { responseSchema } from './public/core.js';
import { apiModelProfile, supportsReasoningEffort } from './public/api-models.js';
import { summarySchema } from './public/memory.js';

export class ProviderError extends Error {
  constructor(code) { super(code); this.code = code; }
}

export async function generateOpenAI({ prompt, apiKey, model, reasoningEffort = 'none', signal, fetchImpl = fetch, timeoutMs, memorySummary = false }) {
  if (!apiKey || typeof apiKey !== 'string') throw new ProviderError('auth_failed');
  if (!/^[a-zA-Z0-9._:-]{1,100}$/.test(model)) throw new ProviderError('invalid_model');
  if (!supportsReasoningEffort(model, reasoningEffort)) throw new ProviderError('invalid_reasoning_effort');
  const reasoning = apiModelProfile(model).efforts.length ? { effort: reasoningEffort } : null;
  const thinking = reasoning && reasoningEffort !== 'none';
  const requestSignal = AbortSignal.any([signal ?? new AbortController().signal, AbortSignal.timeout(timeoutMs ?? (thinking ? 60000 : 15000))]);
  let response;
  try {
    response = await fetchImpl('https://api.openai.com/v1/responses', {
      method: 'POST', signal: requestSignal,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, store: false, instructions: prompt.instructions, input: prompt.input,
        ...(reasoning ? { reasoning } : {}), max_output_tokens: memorySummary ? 512 : thinking ? 8192 : 512,
        text: { format: { type: 'json_schema', name: memorySummary ? 'memory_summary' : 'npc_reply', strict: true, schema: memorySummary ? summarySchema() : responseSchema() } }
      })
    });
  } catch (error) {
    const blocked = [error, error.cause, ...(error.cause?.errors ?? [])]
      .some(cause => ['EACCES', 'EPERM'].includes(cause?.code));
    throw new ProviderError(requestSignal.aborted ? 'timeout' : blocked ? 'network_blocked' : 'network_error');
  }
  if (!response.ok) {
    throw new ProviderError(response.status === 401 || response.status === 403 ? 'auth_failed' : response.status === 429 ? 'rate_limited' : response.status >= 500 ? 'network_error' : 'provider_rejected');
  }
  try {
    const data = await response.json();
    if (data.status !== 'completed') throw new ProviderError('invalid_response');
    const parts = (data.output ?? []).filter(item => item.type === 'message').flatMap(item => item.content ?? []);
    if (parts.some(part => part.type === 'refusal')) throw new ProviderError('provider_refused');
    const output = parts.filter(part => part.type === 'output_text').map(part => part.text).join('');
    const reply = JSON.parse(output);
    const usage = data.usage ? { input_tokens: data.usage.input_tokens, output_tokens: data.usage.output_tokens,
      ...(data.usage.output_tokens_details?.reasoning_tokens != null ? { reasoning_tokens: data.usage.output_tokens_details.reasoning_tokens } : {}) } : null;
    return { reply, usage, mode: 'openai' };
  } catch (err) {
    if (err instanceof ProviderError) throw err;
    throw new ProviderError(requestSignal.aborted ? 'timeout' : 'invalid_response');
  }
}
