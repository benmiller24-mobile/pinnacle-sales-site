// A fake `fetch` for DRY_RUN=1 and for tests: answers HubSpot calls with plausible
// responses and records every request so the sequence can be inspected.

export function createDryRunFetch({ existingContact = null, existingCompany = null, existingDeal = null } = {}) {
  const calls = [];
  let counter = 100;
  const nextId = (prefix) => `${prefix}-${++counter}`;

  const respond = (status, body) => ({
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    headers: { get: () => null },
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  });

  const fetchImpl = async (url, init = {}) => {
    const method = (init.method || 'GET').toUpperCase();
    const path = url.replace(/^https?:\/\/[^/]+/, '');
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ method, path, body });

    if (method === 'GET' && /\/crm\/v3\/objects\/contacts\/.+idProperty=email/.test(path)) {
      return existingContact ? respond(200, existingContact) : respond(404, { status: 'error', message: 'resource not found' });
    }
    if (method === 'POST' && path === '/crm/v3/objects/companies/search') {
      return respond(200, { total: existingCompany ? 1 : 0, results: existingCompany ? [existingCompany] : [] });
    }
    if (method === 'POST' && path === '/crm/v3/objects/deals/search') {
      return respond(200, { total: existingDeal ? 1 : 0, results: existingDeal ? [existingDeal] : [] });
    }
    if (method === 'POST' && /^\/crm\/v3\/objects\/(contacts|companies|deals|notes|tasks)$/.test(path)) {
      const type = path.split('/').pop();
      return respond(201, { id: nextId(type), properties: body?.properties || {} });
    }
    if (method === 'PATCH' && /^\/crm\/v3\/objects\/(contacts|deals)\/.+/.test(path)) {
      return respond(200, { id: path.split('/').pop(), properties: body?.properties || {} });
    }
    if (method === 'PUT' && /\/associations\/default\//.test(path)) {
      return respond(200, { status: 'COMPLETE' });
    }
    return respond(500, { message: `dry-run fetch has no handler for ${method} ${path}` });
  };

  return { fetchImpl, calls };
}
