'use strict';
// Small Odoo 17 JSON-RPC helper used by the website forms (Recruitment applicants, Helpdesk tickets, CRM opportunities).
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

// Creates a CRM opportunity (crm.lead) from the website contact form.
// A NEW contact (res.partner) is created from the typed name (plus email and phone) and linked as the Customer; existing contacts are never
// searched or shown. The opportunity is named "<contact>'s opportunity", the same text Odoo uses on its own screens.
// Optional env: ODOO_CRM_TEAM_ID (sales team), ODOO_CRM_USER_ID (salesperson). Without a salesperson the opportunity stays unassigned.
const positiveId = (value, label) => {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new Error('Invalid ' + label);
  return id;
};

async function createOpportunity(env, data) {
  const odoo = await connect(env);
  const known = await odoo.fieldsOf('crm.lead');
  if (!known.has('name')) throw new Error('crm.lead is unavailable to the integration user (is CRM installed and does the user have Sales access?)');
  const fallbackName = data.name + "'s opportunity";

  // 1) New contact from the typed values (no lookup of existing contacts).
  let partnerId = 0;
  let partnerError = '';
  try {
    const partnerFields = await odoo.fieldsOf('res.partner');
    // Only the typed name (plus email and phone): a company on the contact would make Odoo display it as "Company, Name".
    const partner = { name: data.name, email: data.email, phone: data.phone };
    const partnerValues = {};
    for (const [key, value] of Object.entries(partner)) if (partnerFields.has(key) && value) partnerValues[key] = value;
    const created = await odoo.call('res.partner', 'create', [partnerValues]);
    partnerId = Array.isArray(created) ? created[0] : created;
  } catch (error) {
    console.error('Integrated Path contact: creating the Odoo contact failed:', error && error.message);
    partnerError = String((error && error.message) || 'unknown error').replace(/\s+/g, ' ').trim().slice(0, 300);
  }

  // 2) The opportunity.
  const candidate = {
    partner_id: partnerId || false,
    contact_name: data.name,
    partner_name: data.company,
    email_from: data.email,
    phone: data.phone,
    description: '<p>' + escapeHtml(data.message).replace(/\r?\n/g, '<br>') + '</p><p><i>Submitted through the website contact form.</i></p>',
  };
  const values = {};
  for (const [key, value] of Object.entries(candidate)) if (known.has(key) && value) values[key] = value;
  if (known.has('type')) values.type = 'opportunity';
  if (known.has('user_id')) values.user_id = env.ODOO_CRM_USER_ID ? positiveId(env.ODOO_CRM_USER_ID, 'CRM salesperson ID') : false;
  if (env.ODOO_CRM_TEAM_ID) {
    if (!known.has('team_id')) throw new Error('crm.lead team_id is unavailable to the integration user');
    values.team_id = positiveId(env.ODOO_CRM_TEAM_ID, 'CRM sales team ID');
  }

  // The name is always sent: Odoo only fills "<contact>'s opportunity" itself in its own screens, not for records created through the API.
  values.name = fallbackName;
  const created = await odoo.call('crm.lead', 'create', [values]);
  const id = Array.isArray(created) ? created[0] : created;
  return { id, partnerId, partnerError };
}

module.exports = { createOpportunity, isConfigured, createApplication, createTicket, reset };
