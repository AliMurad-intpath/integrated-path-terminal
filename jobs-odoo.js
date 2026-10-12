'use strict';
// Replaces the static job cards with the published vacancies from Odoo (via /api/jobs).
// If the request fails, the static cards already in the page stay as they are.
(function () {
  const list = document.querySelector('.jobs-list');
  if (!list) return;
  const ar = document.documentElement.lang === 'ar';
  const translate = (value) => (typeof tr === 'function' ? tr(value) : value);

  // "Apply" buttons: pick the role in the form below and jump to it.
  document.addEventListener('click', (event) => {
    const link = event.target.closest && event.target.closest('.job-button');
    const form = document.getElementById('application-form');
    if (!link || !form) return;
    event.preventDefault();
    const card = link.closest('.job-card');
    const select = form.elements.job_id;
    const titleField = form.elements.job_title;
    if (select) {
      const id = card && card.dataset.jobId;
      if (!id || !Array.from(select.options).some(option => option.value === id)) return;
      select.value = id;
    }
    if (titleField) titleField.value = card ? card.querySelector('h3').textContent : '';
    form.scrollIntoView({ behavior: 'instant', block: 'center' });
    form.elements.name.focus({ preventScroll: true });
  });
  const roleSelect = document.querySelector('#application-form [name="job_id"]');
  if (roleSelect) {
    roleSelect.addEventListener('change', () => {
      const titleField = roleSelect.form.elements.job_title;
      if (titleField) titleField.value = roleSelect.value ? roleSelect.options[roleSelect.selectedIndex].text : '';
    });
  }

  const status = list.querySelector('[data-jobs-status]');
  const count = document.getElementById('job-count');
  const fail = (reason) => {
    console.warn('Jobs list unavailable:', reason);
    if (status) {
      status.textContent = ar
        ? 'تعذّر تحميل الوظائف الشاغرة حالياً. يُرجى المحاولة لاحقاً، أو إرسال طلب عام عبر النموذج أدناه.'
        : 'Open positions could not be loaded right now. Please try again shortly, or send a general application using the form below.';
    }
    if (count) count.textContent = '';
  };

  fetch('/api/jobs', { headers: { Accept: 'application/json' }, cache: 'no-store' })
    .then((response) => response.json().catch(() => null))
    .then((data) => {
      if (!data || !data.ok || !Array.isArray(data.jobs)) { fail((data && data.code) + ' ' + ((data && data.hint) || '')); return; }
      const template = list.querySelector('.job-button');
      const href = template ? template.getAttribute('href') : '#application-form';
      const label = template ? template.textContent : (ar ? 'التفاصيل والتقديم' : 'Apply for this role');
      const location = translate(data.location || 'Baghdad, Iraq');

      list.textContent = '';
      data.jobs.forEach((job) => {
        const card = document.createElement('article');
        card.className = 'job-card';
        card.dataset.jobId = String(job.id);
                const shownTitle = translate(job.title);
        const shownType = job.type ? translate(job.type) : '';
        const shownPlace = shownType ? location + ' · ' + shownType : location;
        card.dataset.search = [job.title, shownTitle, job.department, translate(job.department), shownPlace].join(' ').toLowerCase();

        const info = document.createElement('div');
        if (job.department) {
          const department = document.createElement('span');
          department.className = 'department';
          department.textContent = translate(job.department);
          info.appendChild(department);
        }
        const title = document.createElement('h3');
        title.textContent = shownTitle;
        const where = document.createElement('p');
        where.textContent = shownPlace;
        info.append(title, where);

        const apply = document.createElement('a');
        apply.className = 'button job-button';
        apply.setAttribute('href', href);
        apply.textContent = label;

        card.append(info, apply);
        list.appendChild(card);
      });

      if (roleSelect) {
        while (roleSelect.options.length > 1) roleSelect.remove(1);
        data.jobs.forEach((job) => {
          const option = document.createElement('option');
          option.value = String(job.id);
          option.textContent = translate(job.title);
          roleSelect.appendChild(option);
        });
      }

      const refresh = window.ipFilters && window.ipFilters['job-search'];
      if (refresh) refresh();
      if (!data.jobs.length) {
        const note = document.createElement('p');
        note.className = 'empty-state';
        note.textContent = ar
          ? 'لا توجد وظائف شاغرة حالياً. يمكنك إرسال سيرتك الذاتية عبر النموذج أدناه.'
          : 'There are no open positions at the moment. You are welcome to send your CV using the form below.';
        list.appendChild(note);
        const empty = document.getElementById('job-empty');
        if (empty) empty.hidden = true;
      }
    })
    .catch((error) => fail(error && error.message));
})();
