# Netlify update 7

Based on update 6. Deploy the contents as the Netlify project root.

## Changes
- The Contact form no longer has a Subject field (English and Arabic).
- Each submission creates a NEW contact (res.partner) in Odoo from the typed name (plus email, phone and company) and links it as the opportunity's Customer (partner_id). Existing contacts are never searched or shown to visitors.
- The opportunity is named "<contact>'s opportunity" (the text Odoo uses on its own screens). The site sends the name itself, because this Odoo rejects records created through the API without one.
- If the contact cannot be created (permissions), the opportunity is still created, without a customer, named "<name>'s opportunity".
- The team email subject is now "[Enquiry] <name>" and the email ends with "Odoo CRM: opportunity #id created with new contact #id".
- When an Odoo record cannot be created (applications, support tickets, contact opportunities), the team email now ends with "NOT created: <Odoo's error message>" so the cause is visible without opening Netlify logs. Visitors never see this text.
- Everything else (company, email, phone, message notes, unassigned status, optional ODOO_CRM_USER_ID / ODOO_CRM_TEAM_ID, email safety net) is unchanged.
- The integration user needs permission to create contacts as well as opportunities.

---

# Netlify update 6

Based on integrated-path-terminal-main-2 (update 5). Deploy the contents as the Netlify project root.

## Changes
- The Contact form now creates a CRM opportunity (crm.lead, type opportunity) in Odoo, using the existing ODOO_URL, ODOO_DB, ODOO_USER and ODOO_API_KEY settings.
- Mapping: subject -> opportunity name; name -> contact name; company -> company name; email -> email; phone -> phone; message -> notes (escaped HTML, with a "submitted through the website contact form" line).
- The opportunity is left unassigned unless ODOO_CRM_USER_ID (salesperson) is set. Optional ODOO_CRM_TEAM_ID selects the sales team.
- The email to the team still goes out and now ends with "Odoo CRM: opportunity #id created" or "NOT created". If Odoo fails the visitor still gets a success message because the email arrived.
- The integration user needs Sales access that allows creating opportunities (Sales / User).

---

# Netlify update 5

Based on integrated-path-netlify-4.zip. Deploy the contents as the Netlify project root.

## Changes
- Centered the bottom row of partner artwork (SolarWinds, Ameyo, Edimax, RansNet) within the existing logo cards, preserving the original assets and destinations.
- Support submissions now create helpdesk.ticket records using the existing ODOO_URL, ODOO_DB, ODOO_USER and ODOO_API_KEY settings.
- Support fields map as follows: name → x_studio_opened_by; company → x_studio_company_name; email → x_studio_ticket_email; phone → x_studio_ticket_phone_1; subject → name; message → description (escaped HTML).
- Uploaded support files are attached through ir.attachment with res_model helpdesk.ticket and the new ticket's ID. Original validated content type is retained.
- Optional ODOO_HELPDESK_TEAM_ID selects the Helpdesk team. Otherwise Odoo's configured default is used. The integration user needs Helpdesk ticket creation and attachment creation permissions.
- Custom fields must accept text values as supplied by the form. If any are relational fields rather than text, their relation model and lookup rule need configuring before live use. Missing fields fail the Odoo write and are reported in the email fallback/logs instead of silently discarding values.
- Recruitment applications explicitly set job_id and department_id from the selected, published Odoo job. General applications intentionally have neither. Named-role submissions without a valid job ID are rejected.
- Form values are captured when Send is clicked, before requesting the submission token.
- If the Odoo record is saved but its attachment and the fallback email both fail, visitors receive an attachment-specific instruction without being told to resubmit the whole record.

## Validation and deployment
Local mock-RPC tests passed for application job/department IDs, all six support fields, HTML escaping, and attachment targets. JavaScript syntax checks passed. No live Odoo records or emails were created during testing. After deployment verify one named-job application and one support ticket with attachment in your own Odoo instance.

Existing SMTP email delivery and fallback remain. This update does not add rate limiting or persistent submission deduplication; those previously identified issues remain separate work.
