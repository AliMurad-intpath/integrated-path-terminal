'use strict';
// Netlify Function: returns the published job positions (open vacancies) from Odoo 17 Recruitment.
// Configure with environment variables: ODOO_URL, ODOO_DB, ODOO_USER, ODOO_API_KEY
// (optional: JOBS_DEFAULT_LOCATION).

const reply = (status, body) => ({
  statusCode: status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    ...(status === 200
      ? { 'Cache-Control': 'public, max-age=0, must-revalidate', 'Netlify-CDN-Cache-Control': 'public, s-maxage=60, stale-while-revalidate=60' }
      : { 'Cache-Control': 'no-store' }),
  },
  body: JSON.stringify(body),
});

const state = { uid: null, fields: null };

const fail = (kind) => Object.assign(new Error(kind), { kind });

async function rpc(baseUrl, service, method, args) {
  let response;
  try {
    response = await fetch(baseUrl.replace(/\/+$/, '') + '/jsonrpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params: { service, method, args }, id: Date.now() }),
      signal: AbortSignal.timeout(8000),
    });
  } catch (error) { throw fail('unreachable'); }
  if (!response.ok) throw fail('unreachable');
  let body;
  try { body = await response.json(); } catch (error) { throw fail('unreachable'); }
  if (body.error) {
    const message = String((body.error.data && body.error.data.message) || body.error.message || '');
    console.error('Integrated Path jobs: Odoo error:', message);
    if (/database|authenticat|password|login/i.test(message)) throw fail('auth');
    if (/access|not allowed|permission/i.test(message)) throw fail('access');
    throw fail('odoo');
  }
  return body.result;
}

const HINTS = {
  unconfigured: 'The ODOO_* variables are missing in Netlify. Add them and deploy again.',
  unreachable: 'Netlify could not reach Odoo. Check ODOO_URL and that Odoo is reachable from the internet.',
  auth: 'Odoo rejected the login. Check ODOO_DB, ODOO_USER and ODOO_API_KEY.',
  access: 'The Odoo user cannot read job positions. Give it Recruitment access.',
  odoo: 'Odoo returned an error. See Netlify > Logs > Functions > jobs.',
};

const text = (value) => String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
const name = (value) => (Array.isArray(value) ? text(value[1]) : '');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return reply(405, { ok: false, code: 'method' });
  const { ODOO_URL, ODOO_DB, ODOO_USER, ODOO_API_KEY } = process.env;
  if (!ODOO_URL || !ODOO_DB || !ODOO_USER || !ODOO_API_KEY) return reply(503, { ok: false, code: 'unconfigured', hint: HINTS.unconfigured });

  try {
    if (!state.uid) {
      state.uid = await rpc(ODOO_URL, 'common', 'authenticate', [ODOO_DB, ODOO_USER, ODOO_API_KEY, {}]);
      if (!state.uid) throw fail('auth');
    }
    const call = (model, method, args, kwargs) => rpc(ODOO_URL, 'object', 'execute_kw', [ODOO_DB, state.uid, ODOO_API_KEY, model, method, args, kwargs || {}]);

    if (!state.fields) state.fields = new Set(Object.keys(await call('hr.job', 'fields_get', [], { attributes: ['type'] })));
    const publishedField = state.fields.has('is_published') ? 'is_published' : 'website_published';
    if (!state.fields.has(publishedField)) throw fail('odoo');
    const fields = ['name', 'department_id', 'contract_type_id', 'no_of_recruitment'].filter((f) => state.fields.has(f));

    const rows = await call('hr.job', 'search_read', [[[publishedField, '=', true]]], { fields, limit: 100 });
    const jobs = rows.map((row) => ({
      id: row.id,
      title: text(row.name),
      department: name(row.department_id),
      type: name(row.contract_type_id),
      openings: Number(row.no_of_recruitment) || 0,
    })).filter((job) => job.title);

    return reply(200, { ok: true, location: text(process.env.JOBS_DEFAULT_LOCATION), jobs });
  } catch (error) {
    state.uid = null; state.fields = null; // re-authenticate on the next request
    const kind = (error && error.kind) || 'odoo';
    console.error('Integrated Path jobs: Odoo request failed:', kind, error && error.message);
    return reply(502, { ok: false, code: 'upstream', reason: kind, hint: HINTS[kind] || HINTS.odoo });
  }
};
