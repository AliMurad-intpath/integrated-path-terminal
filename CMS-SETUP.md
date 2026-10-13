# Integrated Path — Content Studio

This package is based on integrated-path-netlify-8.zip. Netlify Functions and their Odoo/SMTP mappings are preserved byte for byte. The GoDaddy migration is not included.

## One-time deployment

1. Keep a backup of your current GitHub branch. Put this package's contents at the root of `AliMurad-intpath/integrated-path-terminal`, not inside another folder. Include hidden files and package-lock.json. Do not upload node_modules or dist.
2. The CMS is configured for `main`, verified as the repository's default branch. Confirm this is also Netlify's production branch. For staging, use a separate Netlify project and branch, and change `backend.branch` in admin/config.yml to that branch before deployment. Do not point a staging editor at main unless you intend it to publish there.
3. In Netlify, use build command `npm run build`, publish directory `dist`, and functions directory `netlify/functions`. The supplied netlify.toml defines them. Node 22 is selected. Preserve all existing SMTP_* and ODOO_* environment variables.
4. Enable Netlify Deploy Previews for CMS pull requests. Draft saves create a pull request; publishing merges it. The public site changes only after its production build succeeds. Draft builds also use your Netlify credits.
5. Open https://int-path.com/admin/ after deployment.

## Enable editor login

Editors sign in with GitHub and must have write access to this repository. The public login page does not grant editing access. No password or GitHub token is embedded in the website.

1. GitHub → Settings → Developer settings → OAuth Apps → New OAuth App.
2. Name: Integrated Path Content Studio. Homepage: https://int-path.com. Authorization callback URL: `https://api.netlify.com/auth/done`.
3. Generate a client secret. Enter the client ID and secret directly in Netlify → Project configuration → Security → OAuth → Authentication providers → Install provider → GitHub. Do not put the secret in this ZIP, GitHub, or chat.
4. Open /admin/ and choose Login with GitHub. If the repository belongs to an organization that restricts OAuth apps, approve this app in that organization's settings.

No Git Gateway or Netlify Identity setup is needed. Git Gateway is deprecated; this uses Decap's direct GitHub backend with Netlify's OAuth service.

Official setup: https://docs.netlify.com/manage/security/secure-access-to-sites/oauth-provider-tokens/
CMS backend: https://decapcms.org/docs/github-backend/
Draft workflow: https://decapcms.org/docs/editorial-workflows/

## Everyday editing

- Pages · English / Pages · العربية: select a page, open its section, then edit text, link destinations or images. English and Arabic are independent. Brand names and native-language names stay as entered. Some headings have separate fields for their differently colored phrases.
- Team members: change names, both role translations, photos, YouTube links, song names and artists. Drag to reorder; use Show on website to hide a member. Both languages, website search, team counts and terminal song commands rebuild together. The hidden department metadata is preserved but is not shown on cards.
- Images: use Choose image to upload or select media. Existing partner/client sprite artwork is kept until you choose a replacement. Supply a useful image description. Use PNG, JPEG or WebP for new uploads; keep them reasonably sized.
- Fonts & sizes: select bundled/system fonts, body size, heading multiplier, and separate body/heading/link weights. Font choices avoid extra third-party font downloads. Headings retain responsive breakpoints.
- Save a draft first. Review the editor's content/card preview, then use View preview once Netlify finishes the pull-request build to inspect the complete layout. Review both languages, mobile, dark and light modes. Publish when ready.
- These are content controls, not a drag-and-drop layout builder. Navigation structure, terminal commands, form logic, and live Odoo jobs remain managed by code/Odoo.
- Existing song names are editable; new YouTube URLs do not automatically fetch song metadata.

## Persistence and rollback

Content lives in content/; uploaded images live in assets/uploads/. Every saved draft/publish is tracked by GitHub. Always pull the latest repository before applying later code changes: replacing content/ or assets/uploads/ with an older ZIP would overwrite later CMS edits.

To undo a published edit, revert its commit/pull request in GitHub, or restore the previous content file revision and commit it. Netlify then rebuilds it. Netlify's deploy rollback can restore a site immediately, but also revert the Git change so a later deploy does not reintroduce it.

## Build and verification

Run `npm ci`, `npm test`, then `npm run build`. Serve dist for local public-site preview. Files in templates/ define the original layout; the build combines them with content/ to create dist. Root HTML is the untouched v8 reference, not the published output. Do not run scripts/import-content.cjs again after editing content; it is a one-time migration utility.

The build validates text identifiers, allowed URL schemes, YouTube hosts and typography ranges, and escapes text before placing it in HTML. Invalid content stops the deploy instead of publishing broken pages. The last successful Netlify deploy remains live.

Local checks cover bilingual content changes, HTML escaping, unsafe URL rejection, team edits and ordering, search generation, and preserved form field names. The editor login and a test-backend team edit/preview were checked locally. Real GitHub login, draft commits, media uploads and Netlify deploy previews require the one-time OAuth setup above and have not been exercised against your live account. No live Odoo records or emails were sent.

Existing SMTP/Odoo dependency versions and backend code were retained. Their existing security/dependency maintenance remains separate from this CMS change.
