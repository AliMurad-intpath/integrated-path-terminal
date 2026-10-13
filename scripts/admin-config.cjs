const fs=require('node:fs');
const hidden=(name)=>({name,widget:'hidden'});
const str=(name,label,required=true)=>({name,label,widget:'string',required});
const text=(name,label)=>({name,label,widget:'text'});
const list=(name,label,fields,extra={})=>({name,label,widget:'list',fields,collapsed:true,...extra});
const pageFields=[str('title','Browser title'),text('description','Search-engine description'),list('sections','Page sections',[
 hidden('id'),hidden('title'),list('texts','Text', [hidden('id'),hidden('label'),text('value','Text')],{summary:'{{fields.label}}',allow_add:false}),
 list('links','Links',[hidden('id'),hidden('label'),str('url','Destination')],{summary:'{{fields.label}}',allow_add:false,required:false}),
 list('images','Images',[hidden('id'),hidden('label'),{name:'src',label:'Image',widget:'image',required:false,allow_multiple:false,hint:'Leave an optional logo image blank to keep its original artwork.'},str('alt','Image description',false)],{summary:'{{fields.label}}',allow_add:false,required:false})
],{summary:'{{fields.title}}',allow_add:false})];
const pages=require('./pages.json');
const config={backend:{name:'github',repo:'AliMurad-intpath/integrated-path-terminal',branch:process.env.CMS_BRANCH||'main'},publish_mode:'editorial_workflow',media_folder:'assets/uploads',public_folder:'/assets/uploads',site_url:'https://int-path.com',display_url:'https://int-path.com',logo_url:'/assets/company-logo.png',collections:[
 ...['en','ar'].map(lang=>({name:'pages_'+lang,label:lang==='ar'?'Pages · العربية':'Pages · English',files:pages.filter(p=>p.lang===lang).map(p=>({name:p.key,label:p.label,file:'content/pages/'+p.key+'.json',format:'json',fields:pageFields}))})),
 {name:'team',label:'Team members',files:[{name:'team',label:'Team directory · الفريق',file:'content/team.json',format:'json',fields:[list('members','Members',[
  str('name','Name · keep native spelling'),str('role','Role · English'),str('role_ar','Role · العربية'),{name:'image',label:'Photo',widget:'image',allow_multiple:false},
  {name:'visible',label:'Show on website',widget:'boolean',default:true},str('song_url','YouTube URL',false),str('song_title','Song title · native spelling',false),str('song_artist','Artist · native spelling',false),
  {name:'department',widget:'hidden',default:''},{name:'youtube_title',widget:'hidden',default:''},{name:'youtube_channel',widget:'hidden',default:''}
 ],{summary:'{{fields.name}}',hint:'Drag members to reorder. Hide a member to remove them from both languages, search and song commands.'})]}]},
 {name:'appearance',label:'Fonts & sizes',files:[{name:'typography',label:'Global typography',file:'content/typography.json',format:'json',fields:[
  {name:'english_font',label:'English font',widget:'select',options:[{label:'IBM Plex Sans · current',value:'sans'},{label:'IBM Plex Mono · terminal',value:'mono'},{label:'System font',value:'system'}]},
  {name:'arabic_font',label:'Arabic font',widget:'select',options:[{label:'IBM Plex Sans Arabic · current',value:'plex'},{label:'Tahoma / system Arabic',value:'system'}]},
  {name:'body_size',label:'Body text size (px)',widget:'number',value_type:'int',min:14,max:20,step:1},
  {name:'heading_scale',label:'Heading size multiplier',hint:'1 is the current size. Applies proportionally on mobile and desktop.',widget:'number',value_type:'float',min:.85,max:1.2,step:.05},
  ...['body','heading','link'].map(type=>({name:type+'_weight',label:type+' weight',widget:'select',options:[400,500,600,700]}))
 ]}]}
]};
fs.writeFileSync('admin/config.yml',JSON.stringify(config,null,2)+'\n'); // JSON is valid YAML.
