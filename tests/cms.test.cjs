const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{load}=require('cheerio');
const {renderPage,url,typography,build}=require('../scripts/build.cjs');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8'),json=f=>JSON.parse(read(f));
const team=json('content/team.json').members;
test('English and Arabic text, images and links compile safely into the original template',()=>{
 for(const lang of ['en','ar']){
  const data=json(`content/pages/${lang}-home.json`),section=data.sections.find(s=>s.texts.length&&s.links.length&&s.images.length);
  section.texts[0].value=lang==='ar'?'نص جديد <script>alert(1)</script>':'New <script>alert(1)</script>';
  section.links[0].url='https://example.com/new';section.images[0].src='/assets/uploads/new.png';
  const $=load(renderPage(read('templates/'+(lang==='ar'?'ar/':'')+'index.html'),data,team,lang));
  assert.equal($('script').filter((_,e)=>$(e).text()==='alert(1)').length,0);
  assert.ok($('main').text().includes(section.texts[0].value));
  assert.equal($(`[data-cms-link="${section.links[0].id}"]`).attr('href'),'https://example.com/new');
 }
});
test('team reordering and edits update cards, search terms and song metadata in both languages',()=>{
 const members=[{...team[2],name:'Updated Member',role:'New role',role_ar:'دور جديد',image:'/assets/test.png',song_title:'New song',song_artist:'New artist'},team[0]];
 for(const lang of ['en','ar']){
  const prefix=lang==='ar'?'ar/':'';const $=load(renderPage(read('templates/'+prefix+'about-us/index.html'),json(`content/pages/${lang}-about-us.json`),members,lang));
  assert.equal($('.team-card').length,2);assert.equal($('.team-card h3').first().text(),'Updated Member');
  assert.ok($('.team-card').first().attr('data-search').includes('دور جديد'));
  assert.equal($('.song-link').first().attr('data-song-title'),'New song');
  assert.equal($('.team-card img').first().attr('src'),'/assets/test.png');
 }
});
test('reject executable links and unsupported fonts or typography values',()=>{
 for(const s of ['javascript:alert(1)','data:text/html,test','//evil.test','https://a.test\\b','java\nscript:alert(1)'])assert.throws(()=>url(s));
 assert.throws(()=>url('mailto:test@example.com',true));assert.throws(()=>typography({...json('content/typography.json'),heading_scale:5}));
 assert.throws(()=>typography({...json('content/typography.json'),english_font:'evil;'}));
});
test('build publishes only generated website assets and preserves all forms',()=>{
 build(root);
 for(const p of ['content','templates','scripts','netlify','package.json'])assert.equal(fs.existsSync(path.join(root,'dist',p)),false);
 for(const page of json('scripts/pages.json')){
  const before=load(read(page.file)),after=load(read('dist/'+page.file));
  assert.deepEqual(after('form[data-email-form] [name]').map((_,e)=>after(e).attr('name')).get(),before('form[data-email-form] [name]').map((_,e)=>before(e).attr('name')).get());
  assert.equal(after('html').attr('dir'),before('html').attr('dir'));
 }
 assert.equal(json('dist/team.json').length,team.length);
 assert.ok(json('dist/search-index-ar.json').some(s=>s.text.includes(team[0].role_ar)));
 assert.ok(fs.existsSync(path.join(root,'dist/admin/decap-cms.js')));
});
test('partner artwork replacement keeps links and safely replaces the sprite',()=>{
 const data=json('content/pages/en-home.json');const logo=data.sections.flatMap(s=>s.images||[]).find(i=>i.label==='Microsoft logo');
 assert.ok(logo);logo.src='/assets/uploads/microsoft.png';logo.alt='Microsoft';
 const $=load(renderPage(read('templates/index.html'),data,team,'en'));
 assert.equal($('.partner-card').first().find('img').attr('src'),logo.src);
 assert.equal($('.partner-card').first().attr('href'),'https://www.microsoft.com/');
});
test('admin uses GitHub authorization and drafts; no test backend is published',()=>{
 const config=JSON.parse(read('admin/config.yml'));
 assert.equal(config.backend.name,'github');assert.equal(config.backend.repo,'AliMurad-intpath/integrated-path-terminal');assert.equal(config.publish_mode,'editorial_workflow');
 assert.equal(fs.existsSync(path.join(root,'dist/admin/test.html')),false);
 assert.equal(fs.existsSync(path.join(root,'dist/admin/fixtures.js')),false);
});
test('deleted text and sections do not reappear from templates in either language',()=>{
 for(const lang of ['en','ar']){
  const prefix=lang==='ar'?'ar/':'';
  const data=json(`content/pages/${lang}-about-us.json`);
  // The uploaded content already deletes the team introduction.
  let $=load(renderPage(read('templates/'+prefix+'about-us/index.html'),data,team,lang));
  assert.equal($('[data-cms-node="n47"]').length,0);
  const removed=data.sections.find(s=>s.id==='output-3');
  data.sections=data.sections.filter(s=>s!==removed);
  $=load(renderPage(read('templates/'+prefix+'about-us/index.html'),data,team,lang));
  assert.equal($('#output-3').length,0);
  assert.equal($('[data-local-section="output-3"]').length,0);
  assert.ok($('.team-card').length>0);
 }
});
test('uploaded team photos reach both generated languages with their original bytes',()=>{
 for(const lang of ['en','ar']){
  const $=load(read('dist/'+(lang==='ar'?'ar/':'')+'about-us/index.html'));
  for(const m of team.filter(m=>m.image.startsWith('/assets/uploads/'))){
   const c=$('.team-card').filter((_,el)=>$(el).find('h3').text()===m.name);
   assert.equal(c.find('img').attr('src'),m.image);
   assert.deepEqual(fs.readFileSync(path.join(root,'dist',m.image)),fs.readFileSync(path.join(root,m.image)));
  }
 }
});
test('page and team editor previews resolve draft images through the CMS asset store',()=>{
 const previews={},vm=require('node:vm');
 const h=(tag,props,...children)=>({tag,props,children});
 vm.runInNewContext(read('admin/preview.js'),{window:{h},CMS:{registerPreviewStyle(){},registerPreviewTemplate:(name,fn)=>{previews[name]=fn;},init(){}},document:{getElementById:()=>({remove(){}})}});
 const paths=[];const getAsset=p=>{paths.push(p);return {toString:()=> 'blob:uploaded-photo'};};
 const page={title:'Preview',sections:[{id:'section',title:'Photo',images:[{id:'photo',src:'/assets/uploads/new.png',alt:'New'}]}]};
 const entry={getIn:keys=>keys[0]==='slug'?'en-home':{toJS:()=>page}};
 assert.ok(JSON.stringify(previews['en-home']({entry,getAsset})).includes('blob:uploaded-photo'));
 const teamEntry={getIn:()=>({toJS:()=>[{name:'New member',image:'/assets/uploads/new.png'}]})};
 assert.ok(JSON.stringify(previews.team({entry:teamEntry,getAsset})).includes('blob:uploaded-photo'));
 assert.equal(paths.length,2);
});
