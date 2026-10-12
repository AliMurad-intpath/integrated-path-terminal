'use strict';
// Small Odoo 17 JSON-RPC helper used by the application form (creates Recruitment applicants).
const state = { uid: null, fields: {} };

async function rpc(baseUrl, service, method, args) {
  const response = await fetch(baseUrl.replace(/\/+$/, '') + '/jsonrpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params: { service, method, args }, id: Date.now() }),
    signal: AbortSignal.timeout(7000),
  });
  if (!response.ok) throw new Error('HTTP ' + response.status);
  const body = await response.json();
  if (body.error) throw new Error((body.error.data && body.error.data.message) || body.error.message || 'Odoo error');
  return body.result;
}

const isConfigured = (env) => Boolean(env.ODOO_URL && env.ODOO_DB && env.ODOO_USER && env.ODOO_API_KEY);
const reset = () => { state.uid = null; state.fields = {}; };
const escapeHtml = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function connect(env) {
  if (!state.uid) {
    state.uid = await rpc(env.ODOO_URL, 'common', 'authenticate', [env.ODOO_DB, env.ODOO_USER, env.ODOO_API_KEY, {}]);
    if (!state.uid) throw new Error('Odoo authentication failed (check ODOO_DB, ODOO_USER and ODOO_API_KEY)');
  }
  const call = (model, method, args, kwargs) => rpc(env.ODOO_URL, 'object', 'execute_kw', [env.ODOO_DB, state.uid, env.ODOO_API_KEY, model, method, args, kwargs || {}]);
  const fieldsOf = async (model) => {
    if (!state.fields[model]) state.fields[model] = new Set(Object.keys(await call(model, 'fields_get', [], { attributes: ['type'] })));
    return state.fields[model];
  };
  return { call, fieldsOf };
}

// Creates an hr.applicant (the same record Odoo's own website form creates) and attaches the resume.
// Throws an error with code 'job' when the chosen position is not published any more.
async function createApplication(env, data) {
  const odoo = await connect(env);
  let jobName = '';
  let departmentId = false;
  if (data.jobId) {
    const jobFields = await odoo.fieldsOf('hr.job');
    const published = jobFields.has('is_published') ? 'is_published' : 'website_published';
    const jobs = await odoo.call('hr.job', 'search_read', [[['id', '=', data.jobId], [published, '=', true]]], { fields: ['name', 'department_id'].filter(f => jobFields.has(f)), limit: 1 });
    if (!jobs.length) { const error = new Error('Position is not published or no longer exists'); error.code = 'job'; throw error; }
    jobName = String(jobs[0].name || '').slice(0, 200);
    departmentId = Array.isArray(jobs[0].department_id) ? jobs[0].department_id[0] : false;
  }
  const known = await odoo.fieldsOf('hr.applicant');
  if (data.jobId && !known.has('job_id')) throw new Error('hr.applicant job_id is unavailable to the integration user');
  const candidate = {
    department_id: departmentId,
    job_id: data.jobId || false,
    partner_name: data.name,
    email_from: data.email,
    partner_phone: data.phone,
    linkedin_profile: data.linkedin,
    description: data.message ? '<p>' + escapeHtml(data.message).replace(/\r?\n/g, '<br>') + '</p>' : '',
    name: jobName ? data.name + ' - ' + jobName : data.name + "'s Application",
  };
  const values = {};
  for (const [key, value] of Object.entries(candidate)) if (known.has(key) && value) values[key] = value;

  const created = await odoo.call('hr.applicant', 'create', [values]);
  const id = Array.isArray(created) ? created[0] : created;

  let attached = false;
  if (data.file) {
    try {
      await odoo.call('ir.attachment', 'create', [{ name: data.fileName, datas: data.file.toString('base64'), res_model: 'hr.applicant', res_id: id, type: 'binary', mimetype: 'application/pdf' }]);
      attached = true;
    } catch (error) { console.error('Integrated Path application: resume upload to Odoo failed:', error && error.message); }
  }
  return { id, jobName, attached };
}

async function createTicket(env, data) {
  const odoo = await connect(env);
  const known = await odoo.fieldsOf('helpdesk.ticket');
  const values = {
    name: data.subject,
    description: '<p>' + escapeHtml(data.message).replace(/\r?\n/g, '<br>') + '</p>',
    x_studio_opened_by: data.name,
    x_studio_company_name: data.company,
    x_studio_ticket_email: data.email,
    x_studio_ticket_phone_1: data.phone,
  };
  for (const key of Object.keys(values)) {
    if (!known.has(key)) throw new Error('Required Helpdesk field unavailable: ' + key);
  }
  if (env.ODOO_HELPDESK_TEAM_ID) {
    const teamId = Number(env.ODOO_HELPDESK_TEAM_ID);
    if (!Number.isSafeInteger(teamId) || teamId < 1) throw new Error('Invalid Helpdesk team ID');
    values.team_id = teamId;
  }
  const created = await odoo.call('helpdesk.ticket', 'create', [values]);
  const id = Array.isArray(created) ? created[0] : created;
  let attached = false;
  if (data.file) {
    try {
      await odoo.call('ir.attachment', 'create', [{name: data.fileName, datas: data.file.toString('base64'), res_model: 'helpdesk.ticket', res_id: id, type: 'binary', mimetype: data.mimeType}]);
      attached = true;
    } catch (error) { console.error('Integrated Path support: attachment upload failed'); }
  }
  return { id, attached };
}

module.exports = { isConfigured, createApplication, createTicket, reset };
