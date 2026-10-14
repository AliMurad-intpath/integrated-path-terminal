const fs=require('node:fs'),path=require('node:path');
const ORIGIN='https://int-path.com';
const pageURL=p=>ORIGIN+'/'+p.file.replace(/index\.html$/,'');
function enhance($,page,pages,{preview=false}={}){
 const canonical=pageURL(page),en=pages.find(p=>p.key===page.key.replace(/^ar-/,'en-')),ar=pages.find(p=>p.key===page.key.replace(/^en-/,'ar-'));
 const title=$('title').text(),description=$('meta[name="description"]').attr('content');
 $('link[rel="canonical"],link[rel="alternate"][hreflang],meta[property^="og:"],meta[name^="twitter:"],meta[name="robots"],script[data-seo]').remove();
 const head=$('head');const meta=(name,content,property=false)=>head.append($('<meta>').attr({[property?'property':'name']:name,content}));
 head.append($('<link>').attr({rel:'canonical',href:canonical}));
 for(const [lang,p] of [['en',en],['ar',ar],['x-default',en]])head.append($('<link>').attr({rel:'alternate',hreflang:lang,href:pageURL(p)}));
 meta('robots',preview?'noindex, nofollow':'index, follow, max-image-preview:large');
 for(const [key,value] of Object.entries({title,description,url:canonical,type:'website',site_name:'Integrated Path',locale:page.lang==='ar'?'ar_IQ':'en_US',image:ORIGIN+'/assets/company-logo.png','image:alt':'Integrated Path — المسار المتكامل'}))meta('og:'+key,value,true);
 meta('og:locale:alternate',page.lang==='ar'?'en_US':'ar_IQ',true);
 for(const [key,value] of Object.entries({card:'summary',title,description,image:ORIGIN+'/assets/company-logo.png','image:alt':'Integrated Path — المسار المتكامل'}))meta('twitter:'+key,value);
 const org={'@type':'Organization','@id':ORIGIN+'/#organization',name:'Integrated Path',alternateName:'المسار المتكامل',url:ORIGIN+'/',logo:ORIGIN+'/assets/company-logo.png'};
 // Derive contact/social facts from visible content instead of inventing business claims.
 const emails=$('a[href^="mailto:"]').first().attr('href');if(emails)org.email=emails.slice(7).split('?')[0];
 org.sameAs=[...new Set($('.terminal-footer a[href^="https:"]').map((_,a)=>$(a).attr('href')).get())];
 const graph=[org,{'@type':'WebSite','@id':ORIGIN+'/#website',url:ORIGIN+'/',name:'Integrated Path',alternateName:'المسار المتكامل',publisher:{'@id':org['@id']},inLanguage:['en','ar']},{'@type':page.key.endsWith('about-us')?'AboutPage':page.key.endsWith('contactus')?'ContactPage':'WebPage','@id':canonical+'#webpage',url:canonical,name:title,description,inLanguage:page.lang,isPartOf:{'@id':ORIGIN+'/#website'},about:{'@id':org['@id']}}];
 head.append($('<script type="application/ld+json" data-seo="true"></script>').text(JSON.stringify({'@context':'https://schema.org','@graph':graph}).replace(/</g,'\\u003c')));
 // Keep asset cache versions, but remove version parameters from internal page links.
 const base=new URL($('base').attr('href')||canonical,canonical);
 $('a[href]').each((_,a)=>{const el=$(a);try{const u=new URL(el.attr('href'),base);if(u.origin===ORIGIN&&pages.some(p=>new URL(pageURL(p)).pathname===u.pathname)){u.searchParams.delete('v');el.attr('href',u.pathname+u.search+u.hash);}}catch{}});
}
function writeDiscovery(out,pages,{preview=false}={}){
 fs.writeFileSync(path.join(out,'robots.txt'),preview?'User-agent: *\nDisallow: /\n':'User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\nDisallow: /.netlify/\n\nSitemap: '+ORIGIN+'/sitemap.xml\n');
 fs.writeFileSync(path.join(out,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+pages.map(p=>'  <url><loc>'+pageURL(p)+'</loc></url>').join('\n')+'\n</urlset>\n');
}
module.exports={enhance,writeDiscovery,pageURL};
