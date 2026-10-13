// One-time importer for the supplied v8 snapshot. Do not rerun after editing CMS content.
const fs=require('node:fs'),path=require('node:path'),{load}=require('cheerio');
const pages=['index.html','about-us/index.html','services/index.html','contactus/index.html','our-support/index.html','jobs/index.html'];
const names=['Home','About us','Services','Contact','Support','Jobs'];
const manifest=[];
for(const lang of ['en','ar'])for(let i=0;i<pages.length;i++){
 const file=(lang==='ar'?'ar/':'')+pages[i],$=load(fs.readFileSync(file,'utf8'));let serial=0;
 const data={title:$("title").text(),description:$('meta[name="description"]').attr('content')||'',sections:[]};
 $('main .output-block').each((n,block)=>{
  const root=$(block),id=root.attr('id')||`output-${n+1}`;
  const section={id,title:root.find('h1,h2').first().text().trim()||`Section ${n+1}`,texts:[],links:[],images:[]};
  const skip='.team-directory,.team-toolbar,#team-empty,.block-command,script,style,svg,form [role="status"],select,#job-list,.jobs-list,.job-card,#jobs-count,#job-count,#jobs-status';
  root.find('*').each((_,el)=>{
   const node=$(el);if(node.is(skip)||node.parents(skip).length||['SCRIPT','STYLE','SVG','OPTION','TEXTAREA'].includes(el.tagName.toUpperCase()))return;
   if(el.attribs['aria-hidden']==='true')return;
   const prefix='n'+(++serial);let any=false;
   (el.children||[]).forEach((child,index)=>{
    if(child.type!=='text'||!child.data.trim())return;
    const value=child.data.trim();if(/^[▶♫↗#_*]+$/.test(value))return;
    section.texts.push({id:prefix+'-t'+index,label:value.slice(0,65),value});any=true;
   });
   if(any)node.attr('data-cms-node',prefix);
   if(el.tagName==='a'&&node.attr('href')){node.attr('data-cms-link',prefix);section.links.push({id:prefix,label:node.text().trim().slice(0,75)||node.attr('aria-label')||'Link',url:node.attr('href')});}
   if(el.tagName==='img'){node.attr('data-cms-image',prefix);section.images.push({id:prefix,label:node.attr('alt')||'Image',src:node.attr('src'),alt:node.attr('alt')||''});}
   if(node.hasClass('partner-logo')||node.hasClass('client-card')){
    node.attr('data-cms-image',prefix);section.images.push({id:prefix,label:node.hasClass('partner-logo')?node.closest('.partner-card').find('strong').text():node.find('svg').attr('aria-label')||'Client logo',src:'',alt:''});
   }
  });
  data.sections.push(section);
 });
 const key=lang+'-'+(i?pages[i].split('/')[0]:'home');
 fs.mkdirSync(path.dirname('templates/'+file),{recursive:true});fs.writeFileSync('templates/'+file,$.html());
 fs.writeFileSync('content/pages/'+key+'.json',JSON.stringify(data,null,2)+'\n');manifest.push({key,file,lang,label:names[i]+' — '+(lang==='ar'?'العربية':'English')});
}
const team=JSON.parse(fs.readFileSync('team.json')),ar=load(fs.readFileSync('ar/about-us/index.html','utf8'));
team.forEach((member,index)=>{member.role_ar=ar('.team-card').eq(index).find('.team-card-body p').text();member.visible=true;Object.keys(member).forEach(k=>{if(member[k]===null)member[k]='';});});
fs.writeFileSync('content/team.json',JSON.stringify({members:team},null,2)+'\n');
fs.writeFileSync('content/typography.json',JSON.stringify({english_font:'sans',arabic_font:'plex',body_size:16,heading_scale:1,body_weight:400,heading_weight:700,link_weight:500},null,2)+'\n');
fs.writeFileSync('scripts/pages.json',JSON.stringify(manifest,null,2)+'\n');
