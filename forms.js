'use strict';
document.querySelectorAll('form[data-email-form]').forEach(form=>{
 const status=form.querySelector('[role="status"]');
 const button=form.querySelector('button[type="submit"]');
 form.addEventListener('submit',async event=>{
  event.preventDefault(); if(!form.reportValidity()||form.dataset.sending)return;
  form.dataset.sending='true'; button.disabled=true; form.setAttribute('aria-busy','true');
  status.textContent=isArabic?'جارٍ الإرسال…':'Sending…';
  const data=new FormData(form);
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),45000);
  try {
   const endpoint=new URL('/api/send.php',location.origin);
   const ready=await fetch(endpoint,{credentials:'same-origin',signal:controller.signal});
   if(!ready.ok)throw new Error('unavailable');
   const setup=await ready.json();if(!setup.token)throw new Error('unavailable');
   data.set('token',setup.token);
   const file=data.get('attachment');if(file&&file.size>4*1024*1024)throw new Error('attachment');
   const response=await fetch(endpoint,{method:'POST',body:data,credentials:'same-origin',signal:controller.signal});
   const result=await response.json();if(!response.ok||!result.ok)throw new Error(result.code||'delivery');
   status.textContent=isArabic?'تم إرسال طلبك إلى فريقنا. شكراً لتواصلك معنا.':'Your request has been sent to our team. Thank you for contacting us.';
   if(result.code==='attachment_pending'){status.textContent=isArabic?'تم حفظ الطلب، لكن تعذّر تسليم المرفق. يرجى إرسال المرفق إلى info@int-path.com دون إعادة تقديم الطلب.':'Your request was saved, but the attachment could not be delivered. Please email the attachment to info@int-path.com without resubmitting.';}else{form.reset();}
  }catch(error){
   const messages={attachment:['Please attach an allowed file smaller than 4 MB.','يرجى إرفاق ملف بالصيغة المسموحة وحجم أقل من 4 ميغابايت.'],rate:['Too many attempts. Please try again in an hour or email info@int-path.com.','محاولات كثيرة. حاول بعد ساعة أو راسل info@int-path.com.'],job:['This position is no longer open. Please choose another role.','هذه الوظيفة لم تعد متاحة. يرجى اختيار وظيفة أخرى.'],validation:['Please check the required fields and email address.','يرجى التحقق من الحقول المطلوبة والبريد الإلكتروني.']};
   status.textContent=error.name==='AbortError'?(isArabic?'لم نتمكن من تأكيد الإرسال. احتفظنا بالنص؛ يرجى التحقق قبل إعادة المحاولة.':'We could not confirm delivery. Your text is preserved; please check before retrying.'):(messages[error.message]?.[isArabic?1:0]||(isArabic?'تعذّر الإرسال حالياً. احتفظنا بالنص؛ يمكنك مراسلتنا على info@int-path.com.':'Sending is currently unavailable. Your text is preserved; you can email info@int-path.com.'));
  }finally{clearTimeout(timer);delete form.dataset.sending;button.disabled=false;form.removeAttribute('aria-busy');}
 });
});
