INTEGRATED PATH / TERMINAL EDITION

A six-page website with an interactive terminal-inspired interface. The original website headings and sections remain, together with all 18 unmodified team photos and the original favorite-song destinations. The file explorer and page tabs provide clickable navigation; typing is optional.

COMMANDS
help                         Show available commands
ls                           List the six pages
cd services                  Open Our Services
cat about.md                 Open About Us
open team                    Open the team directory
team Ali                     Find team members by name or role
odoo                         Open Odoo implementation
partners / clients           Open homepage logo sections
search data migration        Search across website sections
song Ali Murad               Show the original favorite-song link
cat company.json             Show company information
read --section block-2       Jump to the second section on this page
pwd / whoami                 Show website navigation context
history / history --clear    View or clear this tab’s command history
clear                        Clear the command output
 theme light / theme dark    Switch theme (saved on this browser)

Use Up/Down for command history, Tab for completion, and Command/Ctrl+K to focus the prompt. Escape dismisses suggestions and output. These commands only navigate website content; they cannot execute operating-system commands.

SERVING
Serve this directory through a static HTTP server. For example: python3 -m http.server 8765
Then visit http://localhost:8765/?v=terminal-21
The site works without a build step. Search and song lookup read the bundled search-index.json and team.json files. All pages remain separate URLs and can be opened directly.

EXISTING WORKFLOWS
Contact enquiries prepare a draft in the visitor’s email app and are not sent automatically. An online contact-form link is also supplied. Support requests and job applications continue through the existing company website. Job availability should be checked on its live careers portal. Five team members have no supplied song link and show “Song coming soon”.

VALIDATION
Checked command help, page navigation, content search, song lookup, team filtering, command history, tab completion, and theme switching. All six pages checked for horizontal overflow at 1440, 820, and 390 CSS pixels. Internal file references and section links validated. Team portraits keep consistent frames without modifying or cropping their image files.

The live int-path.com website has not been modified. This package is a local preview; no live publication has been performed.

October 9 revision: individually linked partner cards using the original logo artwork; official Odoo PNGs from https://www.odoo.com/page/brand-assets; screenshot alignment adjustments. Partner links open in new tabs.

Explorer root and each page directory can be expanded or collapsed with their chevrons. Page names navigate; nested section links reveal their content. Click a content command header to collapse its block. Disclosure state is saved locally in the browser.

Team songs: 13 YouTube titles fetched from public oEmbed metadata. Clean song titles/artists stored in team.json; raw YouTube title and channel retained as source. Click a team song or terminal song result to open the official YouTube player. Closing removes the iframe and stops playback. Original YouTube links remain available. Availability and embedding depend on YouTube and video owners.

ARABIC / ENGLISH — October 10
Arabic pages are under ar/ with a language switch on all six pages. Arabic copy uses business/IT terminology and RTL layouts; brands, native names and song titles are preserved. Integrated Path is translated as المسار المتكامل. IBM Plex Sans Arabic, Sans and Mono are self-hosted, with 400 body, 500 labels, 600 links/subheadings and 700 headings. Font license is in assets/fonts/LICENSE.txt. Department and Off the clock labels are removed from team cards. Localized search, theme controls and player controls are included.

Arabic polish: completed remaining finance/outsourcing labels and accessibility text; localized search result page names and player description; improved RTL banner alignment, command hints and mixed-language isolation. Rechecked all six Arabic pages at mobile width.

EXPLORATION ACTIVITIES
Type play for the bilingual activity menu, or diagnose, build, mission, challenge, team --shuffle, passport, daily, or simulate. Activities are optional and require no account. Passport badges are stored in this browser only and can be reset in the passport panel. Daily puzzles are generated from six bilingual arithmetic templates, with varying business contexts, operands, and shuffled answer choices. The daily seed changes at midnight Baghdad time. New practice puzzles can be generated on demand without changing daily completion. Correct answers and explanations are calculated locally. Close or Escape exits each activity. Motion effects respect reduced-motion preferences. Recommendations and scenarios are illustrative, not quotations or live infrastructure diagnostics.

Outage missions now select from five reviewed incident scenarios: internet, DNS, Wi-Fi, backups, and application deployment. Each has three connected steps. A shuffled session cycle avoids repeats until all five are shown; answer order is shuffled independently with correct-answer mapping preserved. Completion offers another incident.

OFFICE MAP AND SCROLLING
The location command opens an on-demand bilingual map at the supplied office pin (33.3186734, 44.4147758). Visitors choose a start point and preview an animated driving route, with replay/stop controls and a Google Maps directions link. No device geolocation is requested. Map rendering loads Leaflet 1.9.4 from unpkg, OpenStreetMap tiles with attribution, and the public OSRM route service. Selected start/end coordinates are sent to OSRM; no live traffic is provided. External services require connectivity; directions remain available if preview loading fails. For high-traffic deployment, use a suitable hosted routing/tile service. Closing cancels requests and animation. Native page scrolling and section navigation now avoid smooth-scroll easing. Actual refresh rate is controlled by the visitor's browser/display.

UX POLISH — terminal-33
The explorer and command bar can be opened when needed, leaving more room for content. The homepage offers a guided solution finder and a clear project enquiry action. Services now describe common business needs and prefill the enquiry subject. Contact includes visible office-map access, existing-customer support routing, an email draft and copy option. The online enquiry link opens the existing int-path.com form; this static package has no submission backend. Before replacing the existing live website, connect a real form endpoint or retain the existing form at a separate URL. Case studies were intentionally omitted pending verified project information. English and Arabic layouts were checked across all 12 pages at mobile width, along with mobile navigation and command access.

TERMINAL-34: Direct SMTP form integration
Contact, support and applications now submit through api/send.php to info@int-path.com. PHPMailer 7.1.1 is bundled. SMTP configuration outside the public directory and a PHP-enabled GoDaddy deployment are required; live email delivery has not been tested. See the separately supplied EMAIL-SETUP.txt and ip-smtp-config.example.php. Previous notes about email drafts are superseded.


NETLIFY FORMS (current setup)
Contact, support and job-application forms post to /api/send.php, which netlify.toml routes to netlify/functions/send.js. The function sends mail over SMTP (GoDaddy cPanel mailbox) using Netlify environment variables: SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, FORM_SECRET (optional: SMTP_FROM, MAIL_TO, MAIL_TO_ENQUIRY, MAIL_TO_SUPPORT, MAIL_TO_APPLICATION, ALLOWED_ORIGINS). Never commit passwords or .env files. Attachments are limited to 4 MB. The earlier PHP/PHPMailer version (api/send.php, vendor/) was removed because Netlify does not run PHP.


JOBS + APPLICATIONS (Odoo 17 Recruitment)
- /api/jobs (netlify/functions/jobs.js) lists the published job positions from Odoo; jobs-odoo.js renders them on the Jobs page (English and Arabic). The static cards in the HTML are only a fallback if Odoo cannot be reached.
- The application form on the Jobs page (position, name, email, phone, LinkedIn, short introduction, resume) posts to /api/send.php. For applications, netlify/functions/send.js creates an applicant in Odoo Recruitment (netlify/lib/odoo.js) with the resume attached, then also emails the team as a safety net.
- Netlify variables: ODOO_URL, ODOO_DB, ODOO_USER, ODOO_API_KEY (secret), JOBS_DEFAULT_LOCATION. The Odoo user needs Recruitment Officer access (read job positions, create applicants and attachments).

CRM OPPORTUNITIES (contact form)
- The Contact form (kind=enquiry, no subject) creates a new contact (res.partner) and a crm.lead opportunity linked to it, named "<contact>'s opportunity", through netlify/lib/odoo.js (createOpportunity). Optional Netlify variables: ODOO_CRM_USER_ID (salesperson), ODOO_CRM_TEAM_ID (sales team).
