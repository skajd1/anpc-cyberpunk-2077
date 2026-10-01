import { responseSchema } from './public/core.js';

export class ProviderError extends Error {
  constructor(code) { super(code); this.code = code; }
}

export async function generateOpenAI({ prompt, apiKey, model, signal, fetchImpl = fetch, timeoutMs = 15000 }) {
  if (!apiKey || typeof apiKey !== 'string') throw new ProviderError('auth_failed');
  if (!/^[a-zA-Z0-9._:-]{1,100}$/.test(model)) throw new ProviderError('invalid_model');
  const requestSignal = AbortSignal.any([signal ?? new AbortController().signal, AbortSignal.timeout(timeoutMs)]);
  let response;
  try {
    response = await fetchImpl('https://api.openai.com/v1/responses', {
      method: 'POST', signal: requestSignal,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, store: false, instructions: prompt.instructions, input: prompt.input,
        max_output_tokens: 512, text: { format: { type: 'json_schema', name: 'npc_reply', strict: true, schema: responseSchema() } }
      })
    });
  } catch {
    throw new ProviderError(requestSignal.aborted ? 'timeout' : 'network_error');
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
    const usage = data.usage ? { input_tokens: data.usage.input_tokens, output_tokens: data.usage.output_tokens } : null;
    return { reply, usage, mode: 'openai' };
  } catch (err) {
    if (err instanceof ProviderError) throw err;
    throw new ProviderError(requestSignal.aborted ? 'timeout' : 'invalid_response');
  }
}
