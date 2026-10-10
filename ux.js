'use strict';
document.body.classList.add('dock-closed','explorer-collapsed');
menu.setAttribute('aria-expanded','false');
const dockOpen=document.querySelector('.dock-open');dockOpen?.addEventListener('click',focusCommand);
function minimizeDock(){document.body.classList.add('dock-closed');dockOpen?.setAttribute('aria-expanded','false');dockOpen?.focus();}
document.querySelector('.dock-minimize')?.addEventListener('click',minimizeDock);
// Make the terminal a companion to the content, with an accessible explicit opener.
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.querySelector('dialog[open]')&&document.querySelector('.command-dock')?.contains(document.activeElement))minimizeDock();});
const serviceKey=new URLSearchParams(location.search).get('service');
const serviceSubjects={infrastructure:['Branch infrastructure enquiry','استفسار عن البنية التحتية لفرع'],odoo:['Odoo and business automation enquiry','استفسار عن Odoo وأتمتة الأعمال'],software:['Software development enquiry','استفسار عن تطوير البرمجيات']};
if(enquiry&&serviceSubjects[serviceKey])enquiry.elements.subject.value=serviceSubjects[serviceKey][isArabic?1:0];
