/* Editor preview uses text nodes, never editor-provided HTML. Full-page preview is the Netlify draft deploy. */
const h=window.h;
const assetURL=value=>String(value).startsWith("assets/")?"/"+value:String(value);
function PagePreview({entry,getAsset}){
 const d=entry.getIn(['data']).toJS(),ar=entry.getIn(['slug'],'').startsWith('ar-');
 return h('article',{className:'preview',dir:ar?'rtl':'ltr'},h('small',{},'Content preview · Use View preview after saving for the full website'),h('h1',{},d.title),...(d.sections||[]).map(s=>h('section',{key:s.id},h('h2',{},s.title),...(s.texts||[]).map(t=>h('p',{key:t.id},t.value)),...(s.images||[]).filter(i=>i.src).map(i=>h('img',{key:i.id,src:assetURL(getAsset(i.src)),alt:i.alt})))));
}
function TeamPreview({entry,getAsset}){const members=entry.getIn(['data','members'])?.toJS()||[];return h('div',{className:'team-preview'},...members.map((m,i)=>h('article',{key:i,className:'card',style:{opacity:m.visible===false?.45:1}},m.image&&h('img',{src:assetURL(getAsset(m.image)),alt:m.name}),h('h2',{},m.name),h('p',{},m.role),h('p',{dir:'rtl'},m.role_ar),h('small',{},m.visible===false?'Hidden':(m.song_title||'No song selected')))));}
function TypePreview({entry}){const t=entry.getIn(['data']).toJS();return h('article',{className:'preview'},h('h1',{style:{fontSize:(32*t.heading_scale)+'px',fontWeight:t.heading_weight}},'Integrated Path · المسار المتكامل'),h('p',{style:{fontSize:t.body_size+'px',fontWeight:t.body_weight}},'Technology that supports your business. تقنية تدعم أعمالك.'),h('p',{},'Save a draft and use View preview to check your font selection across the actual website.'));}
CMS.registerPreviewStyle('/admin/preview.css');CMS.registerPreviewTemplate('team',TeamPreview);CMS.registerPreviewTemplate('typography',TypePreview);
['en','ar'].forEach(lang=>['home','about-us','services','contactus','our-support','jobs'].forEach(page=>CMS.registerPreviewTemplate(lang+'-'+page,PagePreview)));
CMS.init();document.getElementById('boot').remove();
