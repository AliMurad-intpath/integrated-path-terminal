const fs=require('node:fs'),path=require('node:path'),{load}=require('cheerio');
const ROOT=path.resolve(__dirname,'..');
function url(value,image=false){
 if(typeof value!=='string'||/[\u0000-\u0020\\]/.test(value)||value.startsWith('//')||/^(?:javascript|data|vbscript):/i.test(value))throw Error('Invalid URL: '+value);
 if(/^[a-z][a-z\d+.-]*:/i.test(value)&&!(image?/^https:\/\//i:/^(https?:\/\/|mailto:|tel:)/i).test(value))throw Error('Unsupported URL scheme');
 if(!value)throw Error('A URL is required'); return value;
}
function text(value){if(typeof value!=='string')throw Error('Text must be a string');return value;}
function range(value,min,max,name){if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw Error('Invalid '+name);return value;}
function typography(t){
 const en={sans:'IBMPlexSans,Arial,sans-serif',mono:'IBMPlexMono,monospace',system:'system-ui,sans-serif'};
 const ar={plex:'IBMPlexSansArabic,Tahoma,sans-serif',system:'Tahoma,Arial,sans-serif'};
 if(!en[t.english_font]||!ar[t.arabic_font])throw Error('Choose an approved font');
 const body=range(t.body_size,14,20,'body size'),scale=range(t.heading_scale,.85,1.2,'heading scale');
 for(const key of ['body_weight','heading_weight','link_weight'])if(![400,500,600,700].includes(t[key]))throw Error('Invalid font weight');
 return `/* Generated from content/typography.json. */\n:root{--cms-heading-scale:${scale};--sans:${en[t.english_font]}}\nhtml[lang="ar"]{--sans:${ar[t.arabic_font]}}\nbody{font-family:var(--sans);font-weight:${t.body_weight}}\nmain p,main li{font-size:${body}px;font-weight:${t.body_weight}}\nmain h1,main h2,main h3{font-weight:${t.heading_weight}!important}\nmain a{font-weight:${t.link_weight}!important}\nhtml[lang="ar"] main p,html[lang="ar"] main li{font-family:var(--sans)}\n.cms-replacement-logo{width:100%;height:100%;max-height:180px;object-fit:contain;display:block;margin:auto}\n.partner-logo:has(.cms-replacement-logo){background:none;transform:none!important}\n`;
}
function renderTeam($,team,lang){
 const container=$('.team-directory');if(!container.length)return;
 const exemplar=container.find('.team-card').first().clone();container.empty();
 for(const m of team){
  const c=exemplar.clone();c.attr('data-search',[m.name,m.role,m.role_ar].join(' ').toLowerCase());
  c.find('img').attr({src:url(m.image,true),alt:text(m.name)});
  c.find('h3').text(text(m.name));c.find('.team-card-body p').text(text(lang==='ar'?m.role_ar:m.role));
  c.find('.song-link,.song-unavailable').remove();
  if(m.song_url){
   const link=new URL(url(m.song_url));if(!['www.youtube.com','youtube.com','youtu.be','music.youtube.com'].includes(link.hostname))throw Error('Team song must be a YouTube link');
   const a=$('<a class="song-link" target="_blank" rel="noopener"><span class="play-symbol" aria-hidden="true">▶</span><span class="song-copy"><b dir="auto"></b><span class="song-artist" dir="auto"></span></span><span class="music-note" aria-hidden="true">♫</span></a>');
   const title=m.song_title||'YouTube',artist=m.song_artist||'';
   a.attr({href:link.href,'data-song-title':title,'data-song-artist':artist,'data-song-member':m.name,'aria-label':(lang==='ar'?'تشغيل ':'Play ')+title+' — '+m.name});a.find('b').text(title);a.find('.song-artist').text(artist);c.append(a);
  }else{c.append($('<div class="song-unavailable"><span class="song-copy"></span></div>').find('span').text(lang==='ar'?'ستُضاف الأغنية قريباً':'Song coming soon').end());}
  container.append(c);
 }
 $('#team-count').text(team.length+(lang==='ar'?' من أعضاء الفريق':' team members'));
}
function renderPage(html,data,team,lang){
 const $=load(html);$('title').text(text(data.title));$('meta[name="description"]').attr('content',text(data.description));
 // CMS content is authoritative: removed sections and text must not fall back to templates.
 const sectionIds=new Set(data.sections.map(s=>s.id));
 $('main .output-block').each((i,el)=>{
  const id=$(el).attr('id')||`output-${i+1}`;
  if(!sectionIds.has(id)){
   $(el).remove();
   $('[data-local-section]').filter((_,link)=>$(link).attr('data-local-section')===id).remove();
  }
 });
 const textIds=new Set(data.sections.flatMap(s=>(s.texts||[]).map(t=>t.id)));
 $('[data-cms-node]').each((_,el)=>{
  (el.children||[]).forEach((node,i)=>{
   if(node.type==='text'&&!textIds.has($(el).attr('data-cms-node')+'-t'+i))node.data='';
  });
 });
 for(const section of data.sections){
  for(const item of (section.texts||[])){
   const match=/^(n\d+)-t(\d+)$/.exec(item.id);if(!match)throw Error('Invalid text identifier');
   const parent=$(`[data-cms-node="${match[1]}"]`);const node=parent[0]?.children[Number(match[2])];
   if(parent.length!==1||node?.type!=='text')throw Error('Missing text field '+item.id);
   const old=node.data;node.data=(old.match(/^\s*/)?.[0]||'')+text(item.value)+(old.match(/\s*$/)?.[0]||'');
  }
  for(const item of (section.links||[])){const el=$(`[data-cms-link="${item.id}"]`);if(el.length!==1)throw Error('Missing link');el.attr('href',url(item.url));}
  for(const item of (section.images||[])){
   const el=$(`[data-cms-image="${item.id}"]`);if(el.length!==1)throw Error('Missing image');
   if(item.src){if(el.is('img'))el.attr({src:url(item.src,true),alt:text(item.alt||'')});else el.empty().append($('<img class="cms-replacement-logo">').attr({src:url(item.src,true),alt:item.alt||item.label,loading:'lazy'}));}
  }
 }
 // Remove empty paragraph wrappers after all text indices have been processed.
 $('p[data-cms-node]').each((_,el)=>{if(!$(el).text().trim()&&!$(el).find('img,svg,button,input').length)$(el).remove();});
 renderTeam($,team,lang);
 // Keep the explorer's section headings synchronized with the edited page headings.
 $('.output-block').each((_,b)=>{const h=$(b).find('h1,h2').first().text().trim();const id=$(b).attr('id');if(h&&id)$(`[data-local-section="${id}"]`).text(h);});
 $('head').append('<link rel="stylesheet" href="cms-theme.css">');
 return $.html();
}
function build(root=ROOT){
 const read=p=>fs.readFileSync(path.join(root,p),'utf8'),json=p=>JSON.parse(read(p));
 const out=path.join(root,'dist');fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
 const copy=p=>fs.cpSync(path.join(root,p),path.join(out,p),{recursive:true});
 for(const entry of fs.readdirSync(root))if((/\.(js|css|json)$/.test(entry)&&!['package.json','package-lock.json','team.json','search-index.json','search-index-ar.json'].includes(entry))||['assets','admin'].includes(entry))copy(entry);
 const team=json('content/team.json').members.filter(m=>m.visible!==false);
 fs.writeFileSync(path.join(out,'team.json'),JSON.stringify(team));
 const theme=json('content/typography.json');let css=typography(theme);
 // Scale the existing heading rules in place so mobile breakpoints stay intact.
 const source=read('style.css').replace(/([^{}]+)\{([^{}]+)\}/g,(rule,selector,body)=>{
  if(!/\bh[123]\b/.test(selector))return rule;
  return selector+'{'+body.replace(/font-size:([^;{}]+)/g,(_,size)=>'font-size:calc(('+size.trim()+') * '+theme.heading_scale+')')+'}';
 });
 fs.writeFileSync(path.join(out,'style.css'),source);
 fs.writeFileSync(path.join(out,'cms-theme.css'),css);
 const indexes={en:[],ar:[]};
 for(const page of json('scripts/pages.json')){
  let html=renderPage(read('templates/'+page.file),json('content/pages/'+page.key+'.json'),team,page.lang);
  const $=load(html);
  fs.mkdirSync(path.dirname(path.join(out,page.file)),{recursive:true});fs.writeFileSync(path.join(out,page.file),$.html());
  $('.output-block').each((i,el)=>{const section=$(el),slug=page.file.replace(/^ar\//,'').replace(/index.html$/,'');indexes[page.lang].push({page:slug.replace(/\/$/,'')||'home',title:section.find('h1,h2').first().text(),text:section.text().replace(/\s+/g,' ').trim(),path:slug+'#'+(section.attr('id')||`output-${i+1}`)});});
 }
 for(const lang of ['en','ar'])fs.writeFileSync(path.join(out,lang==='en'?'search-index.json':'search-index-ar.json'),JSON.stringify(indexes[lang]));
 // Bundle the pinned CMS locally, rather than loading a mutable third-party script.
 const cmsDist=path.dirname(require.resolve('decap-cms/dist/decap-cms.js'));
 for(const file of fs.readdirSync(cmsDist))if(!file.endsWith('.map'))fs.copyFileSync(path.join(cmsDist,file),path.join(out,'admin',file));
 console.log('Built 12 pages, '+team.length+' team members, CMS and search indexes.');
}
if(require.main===module)build();module.exports={build,renderPage,typography,url};
