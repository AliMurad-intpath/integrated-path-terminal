'use strict';
const menu=document.querySelector('.menu-toggle');
const nav=document.querySelector('#navigation');
function closeMenu(){if(matchMedia('(max-width:700px)').matches){menu.setAttribute('aria-expanded','false');nav.classList.remove('open');}}
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));if(matchMedia('(min-width:701px)').matches)document.body.classList.toggle('explorer-collapsed',!open);else nav.classList.toggle('open',open);});
nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
function setupFilter(inputId,selector,countId,emptyId,label){
 const input=document.getElementById(inputId);if(!input)return;
 function filter(){const cards=[...document.querySelectorAll(selector)];const q=input.value.trim().toLowerCase();let shown=0;cards.forEach(card=>{card.hidden=!q.split(/\s+/).filter(Boolean).every(term=>card.dataset.search.split(/\s+/).some(word=>word.startsWith(term)));if(!card.hidden)shown++;});document.getElementById(countId).textContent=isArabic ? shown+' '+(inputId==='team-search'?'من أعضاء الفريق':'من الوظائف المعروضة') : shown+' '+(shown===1?label.replace(/s$/, ''):label);document.getElementById(emptyId).hidden=shown>0;}
 input.addEventListener('input',filter);
 (window.ipFilters=window.ipFilters||{})[inputId]=filter;
 const q=new URLSearchParams(location.search).get(inputId==='team-search'?'team':'job');if(q){input.value=q;filter();}
}
setupFilter('team-search','.team-card','team-count','team-empty','team members');
setupFilter('job-search','.job-card','job-count','job-empty','listed roles');
const enquiry=document.getElementById('enquiry-form');
const base=new URL('./',document.baseURI);
const routes=[{name:'Home',key:'home',file:'home.md',path:''},{name:'About Us',key:'about',file:'about.md',path:'about-us/'},{name:'Our Services',key:'services',file:'services.md',path:'services/'},{name:'Contact us',key:'contact',file:'contact.md',path:'contactus/'},{name:'Support',key:'support',file:'support.md',path:'our-support/'},{name:'Jobs',key:'jobs',file:'jobs.md',path:'jobs/'}];
const commands=['play','diagnose','build','mission','challenge','passport','daily','simulate','team --shuffle','help','ls','pwd','whoami','home','about','services','contact','support','jobs','team','odoo','partners','clients','search ','song ','cd ','cat ','open ','history','clear','read --section ','theme dark','theme light'];
const input=document.getElementById('command-input');
const form=document.getElementById('command-form');
const log=document.getElementById('terminal-log');
const suggestions=document.getElementById('completions');
let history=[];try{history=JSON.parse(sessionStorage.getItem('ip-command-history')||'[]');if(!Array.isArray(history))history=[];history=history.filter(v=>typeof v==='string').slice(-50);}catch{}
let historyIndex=history.length;
let pendingInput='';
function setTheme(theme){const value=theme==='light'?'light':'dark';document.documentElement.dataset.theme=value;try{localStorage.setItem('ip-terminal-theme-v2',value);}catch{}const toggle=document.querySelector('.theme-toggle');toggle.textContent=tr(value==='light'?'Dark':'Light');toggle.setAttribute('aria-label',tr('Switch to '+(value==='light'?'dark':'light')+' theme'));}
let savedTheme='light';try{savedTheme=localStorage.getItem('ip-terminal-theme-v2')||'light';}catch{}setTheme(savedTheme);
document.querySelector('.theme-toggle').addEventListener('click',()=>setTheme(document.documentElement.dataset.theme==='light'?'dark':'light'));
function focusCommand(){document.body.classList.remove('dock-closed');document.querySelector('.dock-open')?.setAttribute('aria-expanded','true');input.focus();input.select();}
document.querySelector('.command-focus').addEventListener('click',focusCommand);
function hideSuggestions(){suggestions.hidden=true;suggestions.replaceChildren();}
function candidates(value){const q=value.toLowerCase();const prefix=q.match(/^(cd|cat|open)\s+/);if(prefix){return routes.map(r=>prefix[1]+' '+(prefix[1]==='cat'?r.file:r.key)).filter(x=>x.startsWith(q));}return commands.filter(x=>x.startsWith(q));}
function complete(){const value=input.value.trimStart();suggestions.replaceChildren();if(!value){suggestions.hidden=true;return;}const items=candidates(value).filter(x=>x.trim()!==value.trim()).slice(0,8);items.forEach(c=>{const b=document.createElement('button');b.type='button';b.textContent=c;b.addEventListener('click',()=>{input.value=c;hideSuggestions();input.focus();});suggestions.append(b);});suggestions.hidden=!items.length;}
input.addEventListener('input',complete);
input.addEventListener('keydown',e=>{
 if(e.key==='ArrowUp'&&history.length){e.preventDefault();if(historyIndex===history.length)pendingInput=input.value;historyIndex=Math.max(0,historyIndex-1);input.value=history[historyIndex];hideSuggestions();}
 if(e.key==='ArrowDown'&&history.length){e.preventDefault();historyIndex=Math.min(history.length,historyIndex+1);input.value=historyIndex===history.length?pendingInput:history[historyIndex];hideSuggestions();}
 if(e.key==='Tab'&&!e.shiftKey){const items=candidates(input.value.trimStart());if(input.value&&items.length&&items[0]!==input.value){e.preventDefault();input.value=items[0];hideSuggestions();}}
 if(e.key==='Escape'){hideSuggestions();log.hidden=true;}
});
document.addEventListener('keydown',e=>{
 if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();focusCommand();}
 if(e.key==='Escape'&&nav.classList.contains('open')){closeMenu();menu.focus();}
});
function output(command,message,links=[]){
 document.body.classList.remove('dock-closed');document.querySelector('.dock-open')?.setAttribute('aria-expanded','true');
 const entry=document.createElement('div');entry.className='log-entry';
 const prompt=document.createElement('div');prompt.className='log-command';prompt.textContent='$ '+command;
 const body=document.createElement('div');body.className='log-body';body.textContent=tr(message);if(isArabic)body.dir=command==='cat company.json'?'ltr':'auto';
 links.forEach(link=>{body.append(document.createElement('br'));const a=document.createElement('a');a.href=link.href;a.textContent=link.label; if(isArabic&&!link.song){for(const r of routes)a.textContent=a.textContent.replace(r.name,tr(r.name));}if(link.external){a.target='_blank';a.rel='noopener';}if(link.song){a.addEventListener('click',e=>{if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;e.preventDefault();openSong(link.song,a);});}body.append(a);});
 entry.append(prompt,body);log.append(entry);while(log.children.length>4)log.firstElementChild.remove();log.hidden=false;log.scrollTop=log.scrollHeight;
}
function routeFor(raw){const key=raw.trim().toLowerCase().replace(/^~\/?/,'').replace(/^\.\//,'').replace(/^\/|\/$/g,'');if(['','..','index.html'].includes(key))return routes[0];return routes.find(r=>[r.key,r.file,r.path.replace(/\/$/,''),r.name.toLowerCase()].includes(key));}
function siteURL(path){const url=new URL((isArabic?'ar/':'')+path.replace(/^\.\//,''),base);url.searchParams.set('v','terminal-34');return url.href;}
function navigate(path){location.assign(siteURL(path));}
let indexPromise,teamPromise;
function searchData(){return indexPromise??=fetch(new URL(isArabic?'search-index-ar.json':'search-index.json',base)).then(r=>{if(!r.ok)throw Error();return r.json();}).catch(e=>{indexPromise=null;throw e;});}
function teamData(){return teamPromise??=fetch(new URL('team.json',base)).then(r=>{if(!r.ok)throw Error();return r.json();}).catch(e=>{teamPromise=null;throw e;});}
async function execute(raw){
 const value=raw.trim().slice(0,300);if(!value)return;history.push(value);history=history.slice(-50);historyIndex=history.length;try{sessionStorage.setItem('ip-command-history',JSON.stringify(history));}catch{}
 input.value='';hideSuggestions();const [cmd,...rest]=value.split(/\s+/);const verb=cmd.toLowerCase(),arg=rest.join(' ');
 if(typeof handleActivityCommand==='function'&&await handleActivityCommand(value))return;
 if(!arg&&[100,111,115,104,105].map(n=>String.fromCharCode(n)).join('')===verb){
  const panel=document.createElement('dialog');panel.className='message-dialog';panel.setAttribute('aria-labelledby','message-title');
  const message=document.createElement('p');message.id='message-title';message.textContent=String.fromCharCode(76,105,98,98,97,116,32,76,105,98,98,105,32,60,51);
  const close=document.createElement('button');close.className='button';close.type='button';close.textContent=isArabic?'إغلاق':'Close';close.addEventListener('click',()=>panel.close());
  panel.append(message,close);document.body.append(panel);panel.addEventListener('close',()=>{panel.remove();input.focus();});panel.showModal();return;
 }
 if(['help','?','--help'].includes(verb)){output(value,'Navigate: home · about · services · contact · support · jobs\nBrowse: ls · cd services · cat about.md · open team\nExplore: team [name] · odoo · partners · clients\nFind: search <words> · song <team member>\nSession: pwd · whoami · history · clear · theme dark|light\n\nCommands only explore this website. Click file names to navigate without typing.');output('play',isArabic?'استكشف الأنشطة: play · diagnose · build · mission · challenge · team --shuffle · passport · daily · simulate':'Explore activities: play · diagnose · build · mission · challenge · team --shuffle · passport · daily · simulate');return;}
 if(verb==='clear'){log.replaceChildren();log.hidden=true;return;}
 if(verb==='history'&&arg==='--clear'){history=[];historyIndex=0;try{sessionStorage.removeItem('ip-command-history');}catch{}output(value,'Command history cleared.');return;}
 if(verb==='history'){output(value,history.map((s,i)=>String(i+1).padStart(2,' ')+'  '+s).join('\n'));return;}
 if(verb==='pwd'){output(value,'~/integrated-path/'+document.body.dataset.page);return;}
 if(verb==='whoami'){output(value,'visitor — welcome to Integrated Path.\nIT solutions & systems integration · Baghdad, Iraq.\nYou are browsing our company website.');return;}
 if(verb==='ls'){output(value,'~/integrated-path/ — 6 pages',routes.map(r=>({label:r.file+'  —  '+r.name,href:siteURL(r.path)})));return;}
 if(verb==='theme'){if(['dark','light'].includes(arg.toLowerCase())){setTheme(arg.toLowerCase());output(value,'Theme set to '+arg.toLowerCase()+'.');}else output(value,'Usage: theme dark | theme light');return;}
 if(verb==='team'){navigate('about-us/'+(arg&&!arg.startsWith('--')?'?team='+encodeURIComponent(arg):'')+'#team');return;}
 if(verb==='odoo'){navigate('services/#odoo');return;}
 if(verb==='partners'||verb==='clients'){navigate('#'+verb);return;}
 if(verb==='read'){
  const requested=arg.replace(/^--section\s+/, '');
  const normalized=requested.replace(/^block-/, 'output-');
  const target=document.getElementById(normalized);
  if(target){revealBlock(target);log.hidden=true;target.scrollIntoView({behavior:'instant',block:'start'});}else output(value,'Section not found on this page. Use read --section block-1, or search to find a section.');return;
 }
 if(verb==='cat'&&arg==='company.json'){output(value,JSON.stringify({Logo:'company-logo.png',location:isArabic?'بغداد، العراق':'Baghdad, Iraq',specialty:isArabic?'Odoo والتحول الرقمي':'Odoo & digital transformation',clients:'130+'},null,2));return;}
 if(['cd','cat','open'].includes(verb)){if(arg==='team'){navigate('about-us/#team');return;}if(arg==='odoo'){navigate('services/#odoo');return;}const route=routeFor(arg);if(route){navigate(route.path);return;}output(value,'Page not found: '+arg+'\nUse ls to see the available files.');return;}
 const route=routes.find(r=>r.key===verb);if(route){navigate(route.path);return;}
 if(verb==='search'){
  if(!arg){output(value,'Usage: search <words> — for example, search odoo');return;}
  try{const index=await searchData();const words=arg.toLowerCase().split(/\s+/);const matches=index.filter(item=>words.every(w=>(item.title+' '+item.text).toLowerCase().includes(w))).slice(0,8);output(value,matches.length?'Found '+matches.length+' matching sections.':'No matching sections. Try services, Odoo, support, or a team member.',matches.map(m=>({label:(isArabic?tr((routes.find(r=>r.path.replace(/\/$/,'')===m.page||r.key===m.page)||{}).name||m.page):m.page)+' / '+m.title,href:siteURL(m.path)})));}catch{output(value,'Search is unavailable right now. Use the file menu to browse the website.');}return;
 }
 if(verb==='song'){
  if(!arg){output(value,'Usage: song <team member> — for example, song Ali Murad');return;}
  try{const team=await teamData();const matches=team.filter(p=>p.name.toLowerCase().includes(arg.toLowerCase()));if(!matches.length){output(value,'No team member found. Try the full name.');return;}const withSongs=matches.filter(p=>p.song_url);output(value,withSongs.length?'Open a team member’s favorite song:':matches.map(p=>p.name+': song coming soon.').join('\n'),withSongs.map(p=>({label:p.name+' — '+(p.song_title||'Favorite Song')+' · '+(p.song_artist||'YouTube'),href:p.song_url,external:true,song:p})));}catch{output(value,'Song lookup is unavailable. Open About Us to find the team’s song links.');}return;
 }
 output(value,'Command not found: '+cmd+'\nType help for available commands, or use the file menu.');
}
form.addEventListener('submit',e=>{e.preventDefault();execute(input.value);});
document.querySelectorAll('[data-command]').forEach(b=>b.addEventListener('click',()=>{execute(b.dataset.command);closeMenu();}));

// Native disclosure controls keep the explorer and content keyboard accessible.
const disclosureKey='ip-disclosures-v1';
let disclosures={};try{disclosures=JSON.parse(localStorage.getItem(disclosureKey)||'{}')||{};}catch{}
function disclosureId(el){return el.dataset.treeKey?'tree:'+el.dataset.treeKey:'block:'+document.body.dataset.page+':'+el.id;}
document.querySelectorAll('.directory-root,.page-directory,.output-block').forEach(el=>{
 const key=disclosureId(el);
 if(typeof disclosures[key]==='boolean')el.open=disclosures[key];
 el.addEventListener('toggle',()=>{disclosures[key]=el.open;try{localStorage.setItem(disclosureKey,JSON.stringify(disclosures));}catch{}});
});
function revealBlock(target){
 const block=target.closest('details.output-block');if(block)block.open=true;
}
function revealHash(){
 let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}
 const target=document.getElementById(id);if(!target)return;
 revealBlock(target);
 requestAnimationFrame(()=>target.scrollIntoView({block:'start'}));
}
window.addEventListener('hashchange',revealHash);
document.querySelectorAll('[data-local-section]').forEach(a=>a.addEventListener('click',e=>{
 e.preventDefault();const target=document.getElementById(a.dataset.localSection);if(!target)return;
 revealBlock(target);historyReplaceHash(a.dataset.localSection);target.scrollIntoView({block:'start',behavior:'instant'});closeMenu();
}));
function historyReplaceHash(id){window.history.replaceState(null,'','#'+id);}
revealHash();

// One visible YouTube player, created only after a visitor chooses a song.
let songDialog, songFrame, songInvoker;
function openSong(song,invoker){
 const url=new URL(song.song_url);const id=url.searchParams.get('v');
 if(!['www.youtube.com','youtube.com'].includes(url.hostname)||!id||!/^[A-Za-z0-9_-]{11}$/.test(id))return;
 if(!songDialog){
  songDialog=document.createElement('dialog');songDialog.className='song-dialog';songDialog.setAttribute('aria-labelledby','song-dialog-title');
  songDialog.innerHTML='<div class="song-player-bar"><span>music.player</span><button type="button" class="song-close" aria-label="Close song player">Close ×</button></div><div class="song-player-info"><small id="song-dialog-member"></small><h2 id="song-dialog-title" dir="auto"></h2><p id="song-dialog-artist" dir="auto"></p></div><div class="song-video"></div><div class="song-player-footer"><p>Playback provided by YouTube. If this video cannot play here, open it on YouTube.</p><a class="button secondary song-youtube" target="_blank" rel="noopener">Open on YouTube ↗</a></div>';
  document.body.append(songDialog);translateFragment(songDialog);
  songDialog.querySelector('.song-close').addEventListener('click',()=>songDialog.close());
  songDialog.addEventListener('close',()=>{songDialog.querySelector('.song-video').replaceChildren();songFrame=null;if(songInvoker?.isConnected)songInvoker.focus();});
  songDialog.addEventListener('click',e=>{if(e.target!==songDialog)return;const rect=songDialog.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)songDialog.close();});
 }
 songInvoker=invoker;
 songDialog.querySelector('#song-dialog-member').textContent=isArabic?'الأغنية المفضلة لـ '+song.name:song.name+'’s favorite song';
 songDialog.querySelector('#song-dialog-title').textContent=song.song_title||tr('Favorite Song');
 songDialog.querySelector('#song-dialog-artist').textContent=song.song_artist||'YouTube';
 songDialog.querySelector('.song-youtube').href=song.song_url;
 songFrame=document.createElement('iframe');
 const embed=new URL('https://www.youtube-nocookie.com/embed/'+id);embed.searchParams.set('autoplay','1');embed.searchParams.set('playsinline','1');embed.searchParams.set('rel','0');embed.searchParams.set('hl',isArabic?'ar':'en');
 songFrame.src=embed.href;songFrame.title=(song.song_title||tr('Favorite Song'))+(isArabic?' — مشغّل YouTube':' — YouTube player');
 songFrame.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';songFrame.allowFullscreen=true;songFrame.referrerPolicy='strict-origin-when-cross-origin';
 songDialog.querySelector('.song-video').replaceChildren(songFrame);
 if(!songDialog.open)songDialog.showModal();
}
document.querySelectorAll('.song-link[data-song-title]').forEach(a=>a.addEventListener('click',e=>{
 if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
 e.preventDefault();openSong({name:a.dataset.songMember,song_url:a.href,song_title:a.dataset.songTitle,song_artist:a.dataset.songArtist},a);
}));

// Preserve page, section and search filters when changing language.
document.querySelector('.language-switch')?.addEventListener('click',e=>{
 const a=e.currentTarget;const target=new URL(a.href);const params=new URLSearchParams(location.search);params.set('v','terminal-34');target.search=params.toString();target.hash=location.hash;a.href=target.href;
});
