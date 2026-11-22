async function parse(response) {
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error ?? 'Payment request failed');
  return json;
}

export const postJson = (url, body) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(parse);

export const getCheckoutResult = (sessionId) => fetch(`/api/stripe/session?id=${encodeURIComponent(sessionId)}`).then(parse);
