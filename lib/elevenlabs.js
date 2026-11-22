const API_BASE = 'https://api.elevenlabs.io/v1';
const KEY_STORAGE = 'tcp.elevenlabs.apiKey';

export const TEST_AGENT_NAME = 'Timeless Carat Concierge (test)';

const TEST_AGENT_PROMPT = [
  'You are the leasing concierge for Timeless Carat Properties, a rental marketplace for apartments, cabins, lofts and homes.',
  'Help prospective renters find a property, explain how applications, leases and rent payments work, and answer maintenance questions.',
  'Keep answers short and friendly. If you do not know a specific listing detail, say so and offer to connect them with the property manager.',
].join(' ');

export function readStoredKey() {
  if (typeof window === 'undefined') return '';
  try {
    return window.sessionStorage.getItem(KEY_STORAGE) || '';
  } catch {
    return '';
  }
}

export function storeKey(key) {
  try {
    window.sessionStorage.setItem(KEY_STORAGE, key);
  } catch {
    // Storage can be blocked; the key then lives in component state only.
  }
}

export function clearStoredKey() {
  try {
    window.sessionStorage.removeItem(KEY_STORAGE);
  } catch {
    // Nothing to clear.
  }
}

async function request(path, apiKey, init = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', ...init.headers },
  });

  if (response.ok) return response.json();

  let detail = '';
  try {
    const body = await response.json();
    detail = body?.detail?.message || (typeof body?.detail === 'string' ? body.detail : '');
  } catch {
    // Non-JSON error body.
  }

  if (response.status === 401) throw new Error('ElevenLabs rejected this API key.');
  if (response.status === 403) {
    throw new Error(detail || 'This API key is missing the Agents permission. Enable "ElevenLabs Agents" access on the key.');
  }
  throw new Error(detail || `ElevenLabs request failed (${response.status}).`);
}

export async function listAgents(apiKey) {
  const data = await request('/convai/agents?page_size=50', apiKey);
  return (data.agents || []).map((agent) => ({ id: agent.agent_id, name: agent.name || agent.agent_id }));
}

export async function createTestAgent(apiKey) {
  const data = await request('/convai/agents/create', apiKey, {
    method: 'POST',
    body: JSON.stringify({
      name: TEST_AGENT_NAME,
      conversation_config: {
        agent: {
          first_message: 'Hi, I am the Timeless Carat concierge. How can I help you find a place?',
          language: 'en',
          prompt: { prompt: TEST_AGENT_PROMPT, llm: 'gpt-4o-mini' },
        },
      },
      platform_settings: {
        overrides: {
          conversation_config_override: {
            conversation: { text_only: true },
            agent: { first_message: true },
          },
        },
      },
    }),
  });
  return { id: data.agent_id, name: TEST_AGENT_NAME };
}

export async function getSignedUrl(apiKey, agentId) {
  const data = await request(`/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`, apiKey);
  return data.signed_url;
}

export async function getConversationToken(apiKey, agentId) {
  const data = await request(`/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`, apiKey);
  return data.token;
}
