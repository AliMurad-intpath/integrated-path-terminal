# SEO update

Upload this source package to the repository root and let Netlify build with `npm run build`, publishing `dist`. Keep your current Netlify environment variables. No new service or secret is required for these improvements. This is based on the latest supplied main-3 ZIP plus the publishing fix; preserve any newer CMS edits before replacing content files.

## Included
- Unique English and Arabic titles and descriptions focused on the actual services and Iraq/Baghdad. Editable through the existing CMS browser title and description fields.
- Self-referencing HTTPS canonical URLs for all 12 pages, with reciprocal English/Arabic and x-default language annotations.
- Build-generated sitemap.xml and robots.txt. No artificial last-modified dates.
- Organization, WebSite and WebPage structured data; AboutPage and ContactPage for their appropriate pages. No invented reviews, ratings, awards or job postings.
- Open Graph and Twitter sharing metadata using the existing company logo.
- Clean internal page links without the old version parameter; asset cache parameters and YouTube video IDs are preserved.
- Non-production Netlify build contexts receive noindex metadata and a crawler exclusion. Production pages remain indexable. Existing admin noindex protection is retained.
- Previous CMS deletion and image preview fixes, saved content and photos retained.

## After deployment
1. Verify ownership of int-path.com in Google Search Console (domain verification normally uses a DNS TXT record).
2. Submit https://int-path.com/sitemap.xml to Search Console. Inspect the English and Arabic homepages and request indexing if necessary.
3. Check actual production pages with Google's Rich Results Test and URL Inspection. Organization data helps describe the business but does not guarantee a rich result.
4. Verify and maintain your Google Business Profile with a consistent business name, address, phone and website. Use only genuine customer reviews.
5. Track impressions, queries, clicks and enquiries over time. No ranking or traffic increase can be guaranteed by code changes.

## Next substantial SEO work
Create substantive, separately written English/Arabic pages for Odoo implementation, Odoo customization, systems integration and other services once you can supply real service details. Include customer questions, process, deliverables and useful specifics, rather than duplicate keyword pages. No case studies were added, respecting the earlier instruction that verified data is unavailable.

Performance remains a separate measurement task: run PageSpeed Insights against the deployed site on mobile and check Search Console Core Web Vitals. This package has not been Lighthouse-tested and does not claim a performance score or ranking result. Live Search Console, indexing, DNS and Netlify settings were not changed.

## References
- https://developers.google.com/search/docs/crawling-indexing/canonicalization
- https://developers.google.com/search/docs/specialty/international/localized-versions
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
