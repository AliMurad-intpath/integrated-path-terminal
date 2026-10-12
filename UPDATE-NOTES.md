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
