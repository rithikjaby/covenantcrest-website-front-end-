'use strict';

// ================================================================
// COVENANT CREST ADMIN DASHBOARD v2.0
// ----------------------------------------------------------------
// All data now comes from the real API backend (server.js v2).
// The API is proxied via netlify.toml: /api/* → Render.com
// Auth: JWT stored in sessionStorage as cc_jwt (set by login.html)
// ================================================================

var API = '/api';

// ── SSO Token pickup — must run BEFORE auth check ────────────────
(function pickupSSOToken() {
  var hash = window.location.hash || '';
  if (hash.indexOf('sso=') !== -1) {
    var token = hash.replace('#sso=', '').split('&')[0];
    if (token && token.length > 20) {
      try {
        var parts = token.split('.');
        if (parts.length === 3) {
          var payload = JSON.parse(atob(parts[1]));
          sessionStorage.setItem('cc_jwt',   token);
          sessionStorage.setItem('cc_role',  payload.role  || 'superadmin');
          sessionStorage.setItem('cc_email', payload.email || '');
          history.replaceState(null, '', '/admin.html');
        }
      } catch(e) { console.warn('SSO token parse failed:', e); }
    }
  }
})();

// ── Auth ─────────────────────────────────────────────────────────
var jwt       = sessionStorage.getItem('cc_jwt')  || '';
var authRole  = sessionStorage.getItem('cc_role') || 'employee';
var authEmail = sessionStorage.getItem('cc_email')|| 'Staff';
var isSA      = (authRole === 'superadmin');

// Quill instances
var qDesc, qReq;

// Pagination
var _jobsPage = 1, _jobsPerPage = 10;
var _filteredJobs = [];


// Redirect to login if no token — use setTimeout to let functions define first
if (!jwt) {
  document.body.style.display = 'none';
  setTimeout(function() { window.location.replace('/login.html'); }, 0);
}

// ── UI init ───────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', function() {
  var sbUserEmail = document.getElementById('sbUserEmail');
  var topbarEmail = document.getElementById('topbar-email');
  var sbRoleBadge = document.getElementById('sbRoleBadge');
  
  if (sbUserEmail) sbUserEmail.textContent  = authEmail;
  if (topbarEmail) topbarEmail.textContent = authEmail;
  if (sbRoleBadge) {
    sbRoleBadge.textContent  = isSA ? 'Super Admin' : 'Employee';
    sbRoleBadge.style.background = isSA ? 'rgba(201,168,76,.2)' : 'rgba(43,138,156,.2)';
    sbRoleBadge.style.color       = isSA ? 'var(--gold)'        : '#2B8A9C';
  }

  // Initialize Quill
  if (typeof Quill !== 'undefined') {
    var toolbarOptions = [
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['clean']
    ];
    qDesc = new Quill('#j-desc-editor', { theme: 'snow', modules: { toolbar: toolbarOptions } });
    qReq  = new Quill('#j-req-editor', { theme: 'snow', modules: { toolbar: toolbarOptions } });
  }

  if (isSA) {

    document.querySelectorAll('.sa-only').forEach(function(el) { el.style.display = 'flex'; });
  }
  
  loadDashboard();

  // Sidebar Tabs
  document.querySelectorAll('.asb-item[data-tab]').forEach(function(item) {
    item.addEventListener('click', function() {
      showTab(this.getAttribute('data-tab'), this);
    });
  });

  // Logout
  var logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      logout();
    });
  }

  // Dashboard / Jobs
  var addJobBtnDash = document.getElementById('addJobBtnDash');
  if (addJobBtnDash) {
    addJobBtnDash.addEventListener('click', function() {
      showTab('jobs', null);
      openJobModal();
    });
  }
  var addJobBtnMain = document.getElementById('addJobBtnMain');
  if (addJobBtnMain) {
    addJobBtnMain.addEventListener('click', function() {
      openJobModal();
    });
  }

  // Contacts
  var exportContactsCSV = document.getElementById('exportContactsCSV');
  if (exportContactsCSV) {
    exportContactsCSV.addEventListener('click', function() {
      exportCSV('contacts');
    });
  }

  // Jobs Search/Filter
  var jobsSearch = document.getElementById('jobs-search');
  if (jobsSearch) jobsSearch.addEventListener('input', function() { _jobsPage = 1; filterJobs(); });
  var jobsSectorFilter = document.getElementById('jobs-sector-filter');
  if (jobsSectorFilter) jobsSectorFilter.addEventListener('change', function() { _jobsPage = 1; filterJobs(); });
  var jobsStatusFilter = document.getElementById('jobs-status-filter');
  if (jobsStatusFilter) jobsStatusFilter.addEventListener('change', function() { _jobsPage = 1; filterJobs(); });
  var selectAllJobs = document.getElementById('selectAllJobs');
  if (selectAllJobs) selectAllJobs.addEventListener('click', function() { toggleAllJobs(this); });

  // Jobs Bulk Actions
  var bulkActivateJobsBtn = document.getElementById('bulkActivateJobsBtn');
  if (bulkActivateJobsBtn) bulkActivateJobsBtn.addEventListener('click', function() { bulkJobsAction('active'); });
  var bulkDeactivateJobsBtn = document.getElementById('bulkDeactivateJobsBtn');
  if (bulkDeactivateJobsBtn) bulkDeactivateJobsBtn.addEventListener('click', function() { bulkJobsAction('inactive'); });
  var bulkDeleteJobsBtn = document.getElementById('bulkDeleteJobsBtn');
  if (bulkDeleteJobsBtn) bulkDeleteJobsBtn.addEventListener('click', function() { bulkJobsAction('delete'); });

  // Contacts


  // Applications
  var exportAppsCSV = document.getElementById('exportAppsCSV');
  if (exportAppsCSV) {
    exportAppsCSV.addEventListener('click', function() {
      exportCSV('applications');
    });
  }
  var appsSearch = document.getElementById('apps-search');
  if (appsSearch) {
    appsSearch.addEventListener('input', filterApps);
  }
  var appsStatusFilter = document.getElementById('apps-status-filter');
  if (appsStatusFilter) {
    appsStatusFilter.addEventListener('change', filterApps);
  }
  var appsSectorFilter = document.getElementById('apps-sector-filter');
  if (appsSectorFilter) {
    appsSectorFilter.addEventListener('change', filterApps);
  }
  var selectAllApps = document.getElementById('selectAllApps');
  if (selectAllApps) {
    selectAllApps.addEventListener('click', function() {
      toggleAllApps(this);
    });
  }

  // Bulk Actions
  var bulkShortlistBtn = document.getElementById('bulkShortlistBtn');
  if (bulkShortlistBtn) {
    bulkShortlistBtn.addEventListener('click', function() { bulkAction('shortlisted'); });
  }
  var bulkHireBtn = document.getElementById('bulkHireBtn');
  if (bulkHireBtn) {
    bulkHireBtn.addEventListener('click', function() { bulkAction('hired'); });
  }
  var bulkRejectBtn = document.getElementById('bulkRejectBtn');
  if (bulkRejectBtn) {
    bulkRejectBtn.addEventListener('click', function() { bulkAction('rejected'); });
  }
  var bulkEmailBtn = document.getElementById('bulkEmailBtn');
  if (bulkEmailBtn) {
    bulkEmailBtn.addEventListener('click', function() { bulkEmail(); });
  }

  // Settings
  var changePwdBtn = document.getElementById('changePwdBtn');
  if (changePwdBtn) {
    changePwdBtn.addEventListener('click', changeAdminPassword);
  }
  var refreshIntegrationsBtn = document.getElementById('refreshIntegrationsBtn');
  if (refreshIntegrationsBtn) {
    refreshIntegrationsBtn.addEventListener('click', checkIntegrations);
  }
  var clearAllContactsBtn = document.getElementById('clearAllContactsBtn');
  if (clearAllContactsBtn) {
    clearAllContactsBtn.addEventListener('click', function() { apiClearAll('contacts'); });
  }
  var clearAllJobsBtn = document.getElementById('clearAllJobsBtn');
  if (clearAllJobsBtn) {
    clearAllJobsBtn.addEventListener('click', function() { apiClearAll('jobs'); });
  }
  var addUserBtn = document.getElementById('addUserBtn');
  if (addUserBtn) {
    addUserBtn.addEventListener('click', openUserModal);
  }
  var refreshSecurityLogsBtn = document.getElementById('refreshSecurityLogsBtn');
  if (refreshSecurityLogsBtn) {
    refreshSecurityLogsBtn.addEventListener('click', loadSecurityLogs);
  }

  var clearContactsBtn = document.getElementById('clearContactsBtn');
  if (clearContactsBtn) {
    clearContactsBtn.addEventListener('click', clearContacts);
  }

  // Modals & Dynamic UI
  document.querySelectorAll('[data-close]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      closeModal(this.getAttribute('data-close'));
    });
  });

  var jImageInput = document.getElementById('j-image');
  if (jImageInput) {
    jImageInput.addEventListener('change', function() {
      previewImage(this, 'j-img-preview');
    });
  }

  // Event Delegation for Dynamic Tables
  var tbodies = ['jobs-tbody', 'dash-jobs-tbody', 'contacts-tbody', 'dash-contacts-tbody', 'apps-tbody', 'users-tbody'];
  tbodies.forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', function(e) {
      var target = e.target;
      var action = target.getAttribute('data-action');
      var row    = target.closest('tr');
      var rowId  = (row ? row.getAttribute('data-id') : null) || target.getAttribute('data-id');

      // Check for row-level action if button wasn't clicked
      if (!action && row) {
        action = row.getAttribute('data-action');
      }

      if (!action) return;

      // Handle stopPropagation-like logic for specific elements
      if (target.matches('.app-cb') || target.getAttribute('data-action') === 'cv-link') {
        // e.stopPropagation() doesn't work well with delegation, so we just handle it
        if (target.matches('.app-cb')) updateBulkToolbar();
        return; 
      }
      
      // Prevent row click if button clicked
      if (target.tagName === 'BUTTON' || target.tagName === 'A') {
        e.stopPropagation();
      }

      switch(action) {
        case 'edit-job':
          openJobModal(_jobs.find(function(x){ return x.id === rowId; }));
          break;
        case 'toggle-job':
          toggleJob(rowId);
          break;
        case 'delete-job':
          deleteJob(rowId);
          break;
        case 'view-contact':
          viewContact(rowId);
          break;
        case 'read-contact':
          markContactRead(rowId);
          break;
        case 'delete-contact':
          deleteContact(rowId);
          break;
        case 'view-app':
          viewApplication(rowId);
          break;
        case 'delete-user':
          deleteUser(rowId);
          break;
        case 'filter-apps-by-job':
          showTab('applications', document.getElementById('sb-apps'));
          var appSearchInput = document.getElementById('apps-search');
          if (appSearchInput) {
            appSearchInput.value = rowId; // rowId here is job title
            filterApps();
          }
          break;
      }
    });
  });

  // Checkboxes delegation
  ['jobs-tbody'].forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', function(e) {
      if (e.target.matches('.job-cb')) updateBulkJobsToolbar();
    });
  });


  var jSaveBtn = document.getElementById('j-save-btn');
  if (jSaveBtn) {
    jSaveBtn.addEventListener('click', saveJob);
  }
  var uSaveBtn = document.getElementById('u-save-btn');
  if (uSaveBtn) {
    uSaveBtn.addEventListener('click', saveUser);
  }
});

// ── API helper ────────────────────────────────────────────────────
function apiFetch(path, options) {
  options = options || {};
  options.headers = Object.assign({ 'Authorization': 'Bearer ' + jwt, 'Content-Type': 'application/json' }, options.headers || {});
  return fetch(API + path, options).then(function(r) {
    if (r.status === 401) { logout(); return; }
    return r.json();
  });
}

// ── Helpers ───────────────────────────────────────────────────────
function esc(s) { if (!s) return ''; var r = String(s); r = r.replace(/&/g,'&amp;'); r = r.replace(/</g,'&lt;'); r = r.replace(/>/g,'&gt;'); r = r.split('"').join('&quot;'); return r; }
function fmtDate(d) { try { return new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); } catch(e) { return ''; } }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

// ── Toast ─────────────────────────────────────────────────────────
function showToast(msg, type) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + (type || '');
  clearTimeout(t._tid);
  t._tid = setTimeout(function() { t.classList.remove('show'); }, 3200);
}

// ── Modals ────────────────────────────────────────────────────────
function openJobModal(job) {
  var isEdit = !!job;
  document.getElementById('jm-title').textContent = isEdit ? 'Edit Job Listing' : 'Add Job Listing';
  document.getElementById('j-save-btn').textContent = isEdit ? 'Save Changes →' : 'Create Job Listing →';
  document.getElementById('j-id').value      = isEdit ? job.id    : '';
  document.getElementById('j-title').value   = isEdit ? job.title : '';
  document.getElementById('j-pay').value     = isEdit ? job.pay   : '';
  document.getElementById('j-sector').value  = isEdit ? job.sector   : 'care';
  document.getElementById('j-type').value    = isEdit ? job.type     : 'full-time';
  document.getElementById('j-location').value= isEdit ? job.location : '';
  document.getElementById('j-status').value  = isEdit ? job.status   : 'active';
  document.getElementById('j-location').value= isEdit ? job.location : '';
  document.getElementById('j-closing-date').value = (isEdit && job.closingDate) ? job.closingDate : '';
  document.getElementById('j-seo-keywords').value = (isEdit && job.seoKeywords) ? job.seoKeywords : '';
  document.getElementById('j-seo-desc').value = (isEdit && job.seoDesc) ? job.seoDesc : '';
  
  if (qDesc) qDesc.root.innerHTML = isEdit ? (job.desc || '') : '';
  if (qReq)  qReq.root.innerHTML  = isEdit ? (job.req  || '') : '';

  document.getElementById('j-err').classList.remove('show');
  var prev = document.getElementById('j-img-preview');
  prev.src = (isEdit && job.imageUrl) ? job.imageUrl : '';
  prev.className = (isEdit && job.imageUrl) ? 'img-preview show' : 'img-preview';
  document.getElementById('jobModal').classList.add('open');
}


function openUserModal() {
  if (!isSA) { showToast('Super Admin only', 'er'); return; }
  document.getElementById('userModal').classList.add('open');
}

function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ── Tab switching ─────────────────────────────────────────────────
var tabTitles = { dashboard:'Overview', jobs:'Job Listings', contacts:'Contact Enquiries', applications:'Candidate Applications', settings:'Settings', users:'User Management', security:'Security Audit Logs' };

function showTab(id, el) {
  if (!isSA && (id === 'settings' || id === 'users' || id === 'security')) { showToast('Super Admin only','er'); return; }
  document.querySelectorAll('.tab-pane').forEach(function(p) { p.classList.remove('active'); });
  document.querySelectorAll('.asb-item').forEach(function(i) { i.classList.remove('act'); });
  document.getElementById('tab-' + id).classList.add('active');
  if (el) el.classList.add('act');
  document.getElementById('topbar-title').textContent = tabTitles[id] || id;
  loadTab(id);
}

function loadTab(id) {
  if (id === 'dashboard')    { loadDashboard(); }
  if (id === 'jobs')         { loadJobs(); }
  if (id === 'contacts')     { loadContacts(); }
  if (id === 'applications') { loadApplications(); }
  if (id === 'users')        { loadUsers(); }
  if (id === 'security')     { loadSecurityLogs(); }
  if (id === 'settings')     { checkIntegrations(); }
}

// ── LABEL MAPS ────────────────────────────────────────────────────
var sectorLabel   = { care:'Care & Healthcare', security:'Security', warehouse:'Warehouse', construction:'Construction', other:'Other' };
var typeLabel     = { 'full-time':'Full Time', 'part-time':'Part Time', temporary:'Temporary', permanent:'Permanent' };
var sectorPill    = { care:'p-recruitment', security:'p-haulage', warehouse:'p-trade', construction:'p-construction', other:'p-read' };
var enquiryPill   = { general:'p-general', contact:'p-general', recruitment:'p-recruitment', haulage:'p-haulage', 'haulage-quote':'p-haulage', trade:'p-trade', 'trade-enquiry':'p-trade' };
var appStatusPill = { new:'p-new', shortlisted:'p-shortlisted', hired:'p-active', rejected:'p-rejected', read:'p-read' };

// ── JOBS ──────────────────────────────────────────────────────────
var _jobs = [];

function loadJobs(cb) {
  apiFetch('/jobs/all').then(function(data) {
    if (!data) return;
    _jobs = Array.isArray(data) ? data : [];
    filterJobs();
    renderDashJobs();
    updateStats();
    if (cb) cb();
  }).catch(function() { showApiOffline(); });
}

function filterJobs() {
  var q      = (document.getElementById('jobs-search')?.value || '').toLowerCase();
  var sector = (document.getElementById('jobs-sector-filter')?.value || '').toLowerCase();
  var status = (document.getElementById('jobs-status-filter')?.value || '').toLowerCase();

  _filteredJobs = _jobs.filter(function(j) {
    var matchQ      = !q      || j.title.toLowerCase().includes(q) || (j.location||'').toLowerCase().includes(q);
    var matchSector = !sector || j.sector === sector;
    var matchStatus = !status || j.status === status;
    return matchQ && matchSector && matchStatus;
  });
  renderJobs();
}

function renderJobs() {
  var tbody = document.getElementById('jobs-tbody');
  if (!tbody) return;
  
  if (!_filteredJobs.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="9">No job listings found matching your filters.</td></tr>';
    document.getElementById('jobs-pagination').innerHTML = '';
    return;
  }

  // Pagination
  var total = _filteredJobs.length;
  var pages = Math.ceil(total / _jobsPerPage);
  var start = (_jobsPage - 1) * _jobsPerPage;
  var slice = _filteredJobs.slice(start, start + _jobsPerPage);

  tbody.innerHTML = slice.map(function(j) {
    var appCount = _apps.filter(function(a){ return a.job_id === j.id || (a.job_title === j.title && !a.job_id); }).length;
    var isExpired = j.closingDate && new Date(j.closingDate) < new Date().setHours(0,0,0,0);
    
    return '<tr>' +
      '<td><input type="checkbox" class="job-cb" value="' + j.id + '"></td>' +
      '<td class="td-name">' + esc(j.title) + (j.imageUrl ? ' <span title="Has image" style="color:var(--gold);">🖼</span>' : '') + '</td>' +
      '<td><span class="pill ' + (sectorPill[j.sector] || 'p-read') + '">' + esc(sectorLabel[j.sector] || j.sector) + '</span></td>' +
      '<td><span class="pill ' + (appCount > 0 ? 'p-haulage' : 'p-read') + '" style="cursor:pointer;" data-id="' + esc(j.title) + '" data-action="filter-apps-by-job">' + appCount + '</span></td>' +
      '<td>' + esc(j.location) + '</td>' +
      '<td class="td-muted">' + esc(typeLabel[j.type] || j.type) + '</td>' +
      '<td style="font-weight:600;">' + esc(j.pay) + '</td>' +
      '<td>' + 
        '<span class="pill ' + (j.status === 'active' ? 'p-active' : 'p-inactive') + '">' + esc(j.status) + '</span>' +
        (isExpired ? '<br><span class="pill p-rejected" style="margin-top:4px; font-size:8px;">Expired</span>' : '') +
      '</td>' +
      '<td style="white-space:nowrap;">' +
        '<button class="btn-sm pr" data-id="' + j.id + '" data-action="edit-job" style="margin-right:4px;">Edit</button>' +
        '<button class="btn-sm dn" data-id="' + j.id + '" data-action="delete-job">Delete</button>' +
      '</td></tr>';
  }).join('');

  // Render Pagination
  var pagHtml = '';
  if (pages > 1) {
    for (var i = 1; i <= pages; i++) {
      pagHtml += '<button class="btn-sm ' + (i === _jobsPage ? 'pr' : 'sc') + '" onclick="_jobsPage=' + i + ';renderJobs();">' + i + '</button>';
    }
  }
  document.getElementById('jobs-pagination').innerHTML = pagHtml;
  updateBulkJobsToolbar();
}

function toggleAllJobs(cb) {
  document.querySelectorAll('.job-cb').forEach(function(el) { el.checked = cb.checked; });
  updateBulkJobsToolbar();
}

function updateBulkJobsToolbar() {
  var checked = document.querySelectorAll('.job-cb:checked').length;
  var tb = document.getElementById('jobs-bulk-toolbar');
  if (tb) {
    tb.style.display = checked > 0 ? 'flex' : 'none';
    var cnt = document.getElementById('jobs-bulk-count');
    if (cnt) cnt.textContent = checked;
    if (checked === 0) {
      var selectAll = document.getElementById('selectAllJobs');
      if (selectAll) selectAll.checked = false;
    }
  }
}

function bulkJobsAction(action) {
  var ids = Array.from(document.querySelectorAll('.job-cb:checked')).map(function(el) { return el.value; });
  if (!ids.length) return;
  if (action === 'delete' && !confirm('Delete ' + ids.length + ' jobs?')) return;
  
  var promises = ids.map(function(id) {
    if (action === 'delete') return apiFetch('/jobs/' + id, { method: 'DELETE' });
    return apiFetch('/jobs/' + id, { method: 'PUT', body: JSON.stringify({ status: action }) });
  });

  Promise.all(promises).then(function() {
    showToast('Updated ' + ids.length + ' jobs', 'ok');
    loadJobs();
  });
}


function renderDashJobs() {
  var tbody = document.getElementById('dash-jobs-tbody');
  if (!tbody) return;
  var slice = _jobs.slice(0, 5);
  if (!slice.length) { tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No jobs yet.</td></tr>'; return; }
  tbody.innerHTML = slice.map(function(j) {
    return '<tr>' +
      '<td class="td-name">' + esc(j.title) + '</td>' +
      '<td><span class="pill ' + (sectorPill[j.sector] || 'p-read') + '">' + esc(sectorLabel[j.sector] || j.sector) + '</span></td>' +
      '<td>' + esc(j.location) + '</td>' +
      '<td>' + esc(j.pay) + '</td>' +
      '<td><span class="pill ' + (j.status === 'active' ? 'p-active' : 'p-inactive') + '">' + esc(j.status) + '</span></td>' +
      '<td><button class="btn-sm dn" data-id="' + j.id + '" data-action="delete-job">Delete</button></td></tr>';
  }).join('');
}

function saveJob() {
  var id    = document.getElementById('j-id').value;
  var title = document.getElementById('j-title').value.trim();
  var pay   = document.getElementById('j-pay').value.trim();
  var err   = document.getElementById('j-err');
  var btn   = document.getElementById('j-save-btn');
  err.classList.remove('show');
  if (!title) { err.textContent = 'Job title is required.'; err.classList.add('show'); return; }
  if (!pay)   { err.textContent = 'Pay / salary is required.'; err.classList.add('show'); return; }

  var payload = {
    title    : title,
    pay      : pay,
    sector   : document.getElementById('j-sector').value,
    type     : document.getElementById('j-type').value,
    location : document.getElementById('j-location').value.trim(),
    status   : document.getElementById('j-status').value,
    closingDate : document.getElementById('j-closing-date').value,
    seoKeywords : document.getElementById('j-seo-keywords').value.trim(),
    seoDesc     : document.getElementById('j-seo-desc').value.trim(),
    desc        : qDesc ? qDesc.root.innerHTML : '',
    req         : qReq ? qReq.root.innerHTML : ''
  };


  // Handle image
  var imgFile = document.getElementById('j-image').files[0];
  var doSave = function(b64) {
    if (b64) payload.imageBase64 = b64;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>Saving…';
    var method = id ? 'PUT' : 'POST';
    var path   = id ? ('/jobs/' + id) : '/jobs';
    apiFetch(path, { method: method, body: JSON.stringify(payload) }).then(function(data) {
      btn.disabled = false;
      btn.textContent = id ? 'Save Changes →' : 'Create Job Listing →';
      if (!data || data.error) { err.textContent = (data && data.error) || 'Save failed.'; err.classList.add('show'); return; }
      closeModal('jobModal');
      document.getElementById('j-image').value = '';
      showToast(id ? 'Job updated!' : 'Job listing created!', 'ok');
      loadJobs();
    });
  };

  if (imgFile) {
    var reader = new FileReader();
    reader.onload = function(e) { doSave(e.target.result.split(',')[1]); };
    reader.readAsDataURL(imgFile);
  } else {
    doSave(null);
  }
}

function toggleJob(id) {
  var j = _jobs.find(function(x) { return x.id === id; });
  if (!j) return;
  var newStatus = j.status === 'active' ? 'inactive' : 'active';
  apiFetch('/jobs/' + id, { method: 'PUT', body: JSON.stringify({ status: newStatus }) }).then(function(data) {
    if (data && !data.error) { showToast('Status updated', 'ok'); loadJobs(); }
    else showToast('Update failed', 'er');
  });
}

function deleteJob(id) {
  if (!confirm('Delete this job listing? This cannot be undone.')) return;
  apiFetch('/jobs/' + id, { method: 'DELETE' }).then(function(data) {
    if (data && data.success) { showToast('Job deleted', 'ok'); loadJobs(); }
    else showToast('Delete failed', 'er');
  });
}

// ── IMAGE PREVIEW ─────────────────────────────────────────────────
function previewImage(input, previewId) {
  var prev = document.getElementById(previewId);
  if (!input.files || !input.files[0]) { prev.classList.remove('show'); return; }
  var reader = new FileReader();
  reader.onload = function(e) { prev.src = e.target.result; prev.classList.add('show'); };
  reader.readAsDataURL(input.files[0]);
}

// ── CONTACTS ──────────────────────────────────────────────────────
var _contacts = [];

function loadContacts(cb) {
  apiFetch('/contacts').then(function(data) {
    if (!data) return;
    _contacts = Array.isArray(data) ? data : [];
    renderContacts();
    renderDashContacts();
    updateStats();
    if (cb) cb();
  }).catch(function() { showApiOffline(); });
}

function renderContacts() {
  var tbody = document.getElementById('contacts-tbody');
  if (!tbody) return;
  if (!_contacts.length) { tbody.innerHTML = '<tr class="empty-row"><td colspan="7">No enquiries recorded yet.</td></tr>'; return; }
  tbody.innerHTML = _contacts.map(function(c) {
    return '<tr style="cursor:pointer;" data-id="' + c.id + '" data-action="view-contact">' +
      '<td class="td-name">' + esc(c.name) + '</td>' +
      '<td>' + esc(c.email) + '</td>' +
      '<td><span class="pill ' + (enquiryPill[c.type] || 'p-general') + '">' + esc(c.type || 'general') + '</span></td>' +
      '<td class="td-muted" style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc((c.message || '').substring(0, 80)) + '</td>' +
      '<td class="td-muted">' + fmtDate(c.date) + '</td>' +
      '<td><span class="pill ' + (c.status === 'new' ? 'p-new' : 'p-read') + '">' + esc(c.status) + '</span></td>' +
      '<td style="white-space:nowrap;">' +
        '<button class="btn-sm sc" data-id="' + c.id + '" data-action="read-contact" style="margin-right:4px;">Read</button>' +
        (isSA ? '<button class="btn-sm dn" data-id="' + c.id + '" data-action="delete-contact">Del</button>' : '') +
      '</td></tr>';
  }).join('');
}

function renderDashContacts() {
  var tbody = document.getElementById('dash-contacts-tbody');
  if (!tbody) return;
  var slice = _contacts.slice(0, 5);
  if (!slice.length) { tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No enquiries yet.</td></tr>'; return; }
  tbody.innerHTML = slice.map(function(c) {
    return '<tr>' +
      '<td class="td-name">' + esc(c.name) + '</td>' +
      '<td><span class="pill ' + (enquiryPill[c.type] || 'p-general') + '">' + esc(c.type || 'general') + '</span></td>' +
      '<td>' + esc(c.email) + '</td>' +
      '<td class="td-muted" style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc((c.message || '').substring(0, 60)) + '</td>' +
      '<td class="td-muted">' + fmtDate(c.date) + '</td>' +
      '<td><span class="pill ' + (c.status === 'new' ? 'p-new' : 'p-read') + '">' + esc(c.status) + '</span></td></tr>';
  }).join('');
}

function viewContact(id) {
  var c = _contacts.find(function(x) { return x.id === id; });
  if (!c) return;
  document.getElementById('cm-title').textContent = c.name || 'Enquiry';
  document.getElementById('cm-sub').textContent = (c.email || '') + ' · ' + (c.type || 'general') + ' · ' + fmtDate(c.date);
  document.getElementById('cm-body').innerHTML =
    '<p style="margin-bottom:8px;"><strong>Phone:</strong> ' + (esc(c.phone) || '—') + '</p>' +
    '<p style="margin-bottom:8px;"><strong>Type:</strong> ' + esc(c.type || 'general') + '</p>' +
    '<p style="margin-bottom:8px;"><strong>Source:</strong> ' + esc(c.source || 'website') + '</p>' +
    '<div style="background:var(--cream);border-radius:6px;padding:14px;margin-top:10px;"><p style="font-size:12px;color:var(--charcoal);line-height:1.75;white-space:pre-wrap;">' + esc(c.message || 'No message') + '</p></div>';
  var readBtn = document.getElementById('cm-read-btn');
  if (readBtn) {
    readBtn.onclick = function() { markContactRead(id); closeModal('contactModal'); };
  }
  var replyBtn = document.getElementById('cm-reply-btn');
  if (replyBtn) {
    replyBtn.onclick = function() { window.location.href = 'mailto:' + c.email + '?subject=Re: Your enquiry to Covenant Crest Group&body=Dear ' + encodeURIComponent(c.name || '') + ',%0D%0A%0D%0AThank you for contacting Covenant Crest Group.%0D%0A%0D%0AKind regards,%0D%0ACovenant Crest Group Ltd%0D%0A07346 809846'; };
  }
  var delBtn = document.getElementById('cm-del-btn');
  if (delBtn) {
    if (isSA) { 
      delBtn.style.display = ''; 
      delBtn.onclick = function() { deleteContact(id); closeModal('contactModal'); }; 
    } else { 
      delBtn.style.display = 'none'; 
    }
  }
  if (c.status === 'new') markContactRead(id);
  document.getElementById('contactModal').classList.add('open');
}

// ── SECURITY LOGS ─────────────────────────────────────────────────
function loadSecurityLogs() {
  if (!isSA) return;
  var tbody = document.getElementById('security-tbody');
  apiFetch('/security-logs').then(function(data) {
    if (!data || !data.length) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="5">No security events recorded.</td></tr>';
      return;
    }
    tbody.innerHTML = data.map(function(l) {
      var time = new Date(l.timestamp).toLocaleString('en-GB');
      var typeLabel = { failed_login: '⚠️ Failed Login', password_change: '🔑 Password Change' }[l.type] || l.type;
      var details = l.role ? ('Role: ' + l.role) : (l.exists === false ? 'Account does not exist' : 'Incorrect password');
      return '<tr>' +
        '<td class="td-muted">' + time + '</td>' +
        '<td style="font-weight:600;">' + typeLabel + '</td>' +
        '<td>' + esc(l.email) + '</td>' +
        '<td><code>' + esc(l.ip) + '</code></td>' +
        '<td class="td-muted">' + details + '</td>' +
        '</tr>';
    }).join('');
  }).catch(function() { showApiOffline(); });
}

function markContactRead(id) {
  apiFetch('/contacts/' + id, { method: 'PUT', body: JSON.stringify({ status: 'read' }) }).then(function(data) {
    if (data && !data.error) { showToast('Marked as read', 'ok'); loadContacts(); }
  });
}

function deleteContact(id) {
  if (!isSA) { showToast('Super Admin only', 'er'); return; }
  if (!confirm('Delete this enquiry?')) return;
  apiFetch('/contacts/' + id, { method: 'DELETE' }).then(function(data) {
    if (data && data.success) { showToast('Enquiry deleted', 'ok'); loadContacts(); }
    else showToast('Delete failed', 'er');
  });
}

function clearContacts() {
  if (!isSA) { showToast('Super Admin only', 'er'); return; }
  showToast('Use "Clear All Enquiries" in Settings → Danger Zone', 'er');
}

// ── APPLICATIONS ──────────────────────────────────────────────────
var _apps = [];

function loadApplications(cb) {
  apiFetch('/applications').then(function(data) {
    if (!data) return;
    _apps = Array.isArray(data) ? data : [];
    renderApplications();
    updateStats();
    if (cb) cb();
  }).catch(function() { showApiOffline(); });
}

function renderApplications() {
  var tbody = document.getElementById('apps-tbody');
  if (!tbody) return;
  if (!_apps.length) { tbody.innerHTML = '<tr class="empty-row"><td colspan="9">No applications yet.</td></tr>'; return; }
  tbody.innerHTML = _apps.map(function(a) {
    return '<tr style="cursor:pointer;" data-id="' + a.id + '" data-action="view-app">' +
      '<td><input type="checkbox" class="app-cb" value="' + a.id + '"></td>' +
      '<td class="td-name">' + esc((a.first_name || '') + ' ' + (a.last_name || '')) + '</td>' +
      '<td>' + esc(a.email) + '</td>' +
      '<td class="td-muted">' + esc(a.phone || '—') + '</td>' +
      '<td><span class="pill ' + (sectorPill[a.sector] || 'p-read') + '">' + esc(sectorLabel[a.sector] || a.sector || '—') + '</span></td>' +
      '<td class="td-muted">' + esc(a.job_title || '—') + '</td>' +
      '<td class="td-muted">' + fmtDate(a.date) + '</td>' +
      '<td><span class="pill ' + (appStatusPill[a.status] || 'p-new') + '">' + esc(a.status || 'new') + '</span></td>' +
      '<td>' +
        (a.cvUrl ? '<a href="' + esc(a.cvUrl) + '" target="_blank" class="btn-sm gd" style="text-decoration:none;" data-id="' + a.id + '" data-action="cv-link">CV</a>' : '<span class="td-muted">No CV</span>') +
      '</td></tr>';
  }).join('');
  updateBulkToolbar();
}

function viewApplication(id) {
  var a = _apps.find(function(x) { return x.id === id; });
  if (!a) return;
  window._curAppId = id;
  var sectorDisplay = sectorLabel[a.sector] || a.sector || '—';
  var availDisplay  = { immediate:'Immediately available', '1week':'Within 1 week', '2weeks':'Within 2 weeks', other:'Other' }[a.availability] || a.availability || '—';
  document.getElementById('am-title').textContent = (a.first_name || '') + ' ' + (a.last_name || '');
  document.getElementById('am-sub').textContent = (a.email || '') + ' · ' + sectorDisplay + ' · ' + fmtDate(a.date);
  document.getElementById('am-body').innerHTML =
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">' +
      '<div style="background:#f8f9fa;border-radius:6px;padding:10px 14px;"><div style="font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:3px;">Phone</div><div style="font-size:13px;font-weight:600;color:var(--navy);">' + esc(a.phone || '—') + '</div></div>' +
      '<div style="background:#f8f9fa;border-radius:6px;padding:10px 14px;"><div style="font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:3px;">Sector</div><div style="font-size:13px;font-weight:600;color:var(--navy);"><span class="pill ' + (sectorPill[a.sector] || 'p-read') + '">' + esc(sectorDisplay) + '</span></div></div>' +
      '<div style="background:#f8f9fa;border-radius:6px;padding:10px 14px;"><div style="font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:3px;">Job Applied For</div><div style="font-size:13px;font-weight:600;color:var(--navy);">' + esc(a.job_title || '—') + '</div></div>' +
      '<div style="background:#f8f9fa;border-radius:6px;padding:10px 14px;"><div style="font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:3px;">Availability</div><div style="font-size:13px;font-weight:600;color:var(--navy);">' + esc(availDisplay) + '</div></div>' +
    '</div>' +
    '<div style="margin-bottom:14px;padding:10px 14px;background:#f8f9fa;border-radius:6px;display:flex;align-items:center;justify-content:space-between;">' +
      '<div style="font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);">Current Status</div>' +
      '<span class="pill ' + (appStatusPill[a.status] || 'p-new') + '" style="font-size:10px;">' + esc(a.status || 'new') + '</span>' +
    '</div>' +
    '<div style="margin-bottom:14px;padding:14px 16px;border-radius:6px;border:1px solid ' + (a.cvUrl ? '#C9A84C' : '#e0e0e0') + ';background:' + (a.cvUrl ? '#fffbf0' : '#f9f9f9') + ';display:flex;align-items:center;gap:12px;">' +
      '<span style="font-size:22px;">' + (a.cvUrl ? '&#x1F4C4;' : '&#x1F4C2;') + '</span>' +
      '<div style="flex:1;">' +
        '<div style="font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:' + (a.cvUrl ? '#C9A84C' : '#aaa') + ';margin-bottom:3px;">CV / Resume</div>' +
        (a.cvUrl ? '<a href="' + esc(a.cvUrl) + '" target="_blank" style="font-size:13px;color:#0D1B2A;font-weight:600;text-decoration:none;">📥 View / Download CV &rarr;</a>' : '<span style="font-size:12px;color:#aaa;">No CV uploaded by candidate</span>') +
      '</div>' +
    '</div>' +
    (a.notes ? '<div style="background:var(--cream);border-radius:6px;padding:14px;margin-bottom:14px;"><p style="font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#aaa;margin-bottom:6px;">Candidate Notes</p><p style="font-size:12px;line-height:1.75;white-space:pre-wrap;">' + esc(a.notes) + '</p></div>' : '') +
    '<div><label class="af-label">Internal Admin Notes</label><textarea id="am-admin-notes" class="af-textarea" placeholder="Private notes about this candidate...">' + esc(a.adminNotes || '') + '</textarea></div>';
  
  var jobSubject = a.job_title ? 'Re: Your application for ' + (a.job_title) + ' — Covenant Crest Group' : 'Re: Your application to Covenant Crest Group';
  
  document.getElementById('am-footer-container').innerHTML = 
    '<div style="margin-top:18px;padding-top:14px;border-top:1px solid var(--border);display:flex;gap:8px;flex-wrap:wrap;align-items:center;">' +
      '<button class="btn-sm sc" id="am-shortlist-btn">Shortlist</button>' +
      '<button class="btn-sm pr" id="am-hired-btn">Mark Hired</button>' +
      '<button class="btn-sm dn" id="am-reject-btn">Reject</button>' +
      '<button class="btn-sm pr" id="am-reply-btn" style="background:#0D1B2A;color:#fff;">Reply by Email</button>' +
      '<div style="flex:1;"></div>' +
      '<button class="btn-primary" style="padding:7px 14px;font-size:9px;" id="am-save-notes-btn">Save Notes</button>' +
    '</div>';

  document.getElementById('am-shortlist-btn').onclick = function() { updateAppStatus(window._curAppId,'shortlisted'); };
  document.getElementById('am-hired-btn').onclick = function() { updateAppStatus(window._curAppId,'hired'); };
  document.getElementById('am-reject-btn').onclick = function() { updateAppStatus(window._curAppId,'rejected'); };
  document.getElementById('am-save-notes-btn').onclick = function() { saveAdminNotes(window._curAppId); };

  document.getElementById('am-reply-btn').onclick = function() { window.location.href = 'mailto:' + a.email + '?subject=' + encodeURIComponent(jobSubject) + '&body=Dear ' + encodeURIComponent((a.first_name || '') + ' ' + (a.last_name || '')) + ',%0D%0A%0D%0AThank you for applying' + (a.job_title ? ' for the ' + a.job_title + ' position' : '') + ' with Covenant Crest Group.%0D%0A%0D%0AKind regards,%0D%0ACovenant Crest Recruitment%0D%0A07346 809846%0D%0Arecruitment@covenantcrest.co.uk'; };
  document.getElementById('appModal').classList.add('open');
}

function updateAppStatus(id, status) {
  if (!id) return;
  apiFetch('/applications/' + id, { method: 'PUT', body: JSON.stringify({ status: status }) }).then(function(data) {
    if (data && !data.error) {
      showToast('Application ' + status, 'ok');
      closeModal('appModal');
      loadApplications();
    } else showToast('Update failed', 'er');
  });
}

function saveAdminNotes(id) {
  var notes = document.getElementById('am-admin-notes').value;
  apiFetch('/applications/' + id, { method: 'PUT', body: JSON.stringify({ adminNotes: notes }) }).then(function(data) {
    if (data && !data.error) {
      showToast('Notes saved successfully', 'ok');
      loadApplications();
    } else showToast('Failed to save notes', 'er');
  });
}

function toggleAllApps(cb) {
  document.querySelectorAll('.app-cb').forEach(function(el) { el.checked = cb.checked; });
  updateBulkToolbar();
}

function updateBulkToolbar() {
  var checked = document.querySelectorAll('.app-cb:checked').length;
  var tb = document.getElementById('bulk-toolbar');
  if (tb) {
    if (checked > 0) {
      tb.style.display = 'flex';
      document.getElementById('bulk-count').textContent = checked;
    } else {
      tb.style.display = 'none';
      document.getElementById('selectAllApps').checked = false;
    }
  }
}

function bulkAction(status) {
  var ids = Array.from(document.querySelectorAll('.app-cb:checked')).map(function(el) { return el.value; });
  if (!ids.length) return;
  if (!confirm('Mark ' + ids.length + ' candidates as ' + status + '?')) return;
  
  var promises = ids.map(function(id) {
    return apiFetch('/applications/' + id, { method: 'PUT', body: JSON.stringify({ status: status }) });
  });
  
  Promise.all(promises).then(function() {
    showToast('Updated ' + ids.length + ' candidates', 'ok');
    document.getElementById('selectAllApps').checked = false;
    loadApplications();
  }).catch(function() {
    showToast('Bulk update encountered an error', 'er');
  });
}

function bulkEmail() {
  var ids = Array.from(document.querySelectorAll('.app-cb:checked')).map(function(el) { return el.value; });
  if (!ids.length) return;
  
  var emails = ids.map(function(id) {
    var a = _apps.find(function(x) { return x.id === id; });
    return a ? a.email : null;
  }).filter(Boolean);
  
  if (emails.length) {
    window.location.href = 'mailto:?bcc=' + encodeURIComponent(emails.join(','));
  }
}

// ── USERS ─────────────────────────────────────────────────────────
var _users = [];

function loadUsers() {
  if (!isSA) return;
  apiFetch('/users').then(function(data) {
    if (!data) return;
    _users = Array.isArray(data) ? data : [];
    renderUsers();
  });
}

function renderUsers() {
  var tbody = document.getElementById('users-tbody');
  if (!tbody) return;
  if (!_users.length) { tbody.innerHTML = '<tr class="empty-row"><td colspan="4">No accounts.</td></tr>'; return; }
  tbody.innerHTML = _users.map(function(u) {
    var isSuperRow = u.role === 'superadmin';
    return '<tr>' +
      '<td class="td-name">' + esc(u.email) + '</td>' +
      '<td><span class="pill ' + (isSuperRow ? 'p-active' : 'p-haulage') + '">' + esc(u.role === 'superadmin' ? 'Super Admin' : 'Employee') + '</span></td>' +
      '<td class="td-muted">' + (u.created ? fmtDate(u.created) : 'Owner') + '</td>' +
      '<td>' + (isSuperRow ? '<span style="font-size:10px;color:var(--muted);">Cannot be deleted</span>' : '<button class="btn-sm dn" data-id="' + u.id + '" data-action="delete-user">Delete Account</button>') + '</td></tr>';
  }).join('');
}

function saveUser() {
  if (!isSA) { showToast('Super Admin only', 'er'); return; }
  var email = document.getElementById('u-email').value.trim();
  var pass  = document.getElementById('u-pass').value;
  var pass2 = document.getElementById('u-pass2').value;
  var err   = document.getElementById('u-err');
  var btn   = document.getElementById('u-save-btn');
  err.classList.remove('show');
  if (!email || !email.includes('@')) { err.textContent = 'Enter a valid email.'; err.classList.add('show'); return; }
  if (pass.length < 8) { err.textContent = 'Password must be at least 8 characters.'; err.classList.add('show'); return; }
  if (pass !== pass2)  { err.textContent = 'Passwords do not match.'; err.classList.add('show'); return; }
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>Creating…';
  apiFetch('/users', { method: 'POST', body: JSON.stringify({ email: email, password: pass }) }).then(function(data) {
    btn.disabled = false; btn.textContent = 'Create Employee Account →';
    if (!data || data.error) { err.textContent = (data && data.error) || 'Create failed.'; err.classList.add('show'); return; }
    closeModal('userModal');
    ['u-email','u-pass','u-pass2'].forEach(function(id) { document.getElementById(id).value = ''; });
    showToast('Employee account created!', 'ok');
    loadUsers();
  });
}

function deleteUser(id) {
  if (!isSA) { showToast('Super Admin only', 'er'); return; }
  if (!confirm('Delete this employee account? They will no longer be able to log in.')) return;
  apiFetch('/users/' + id, { method: 'DELETE' }).then(function(data) {
    if (data && data.success) { showToast('Account deleted', 'ok'); loadUsers(); }
    else showToast('Delete failed', 'er');
  });
}

// ── STATS ─────────────────────────────────────────────────────────
function updateStats() {
  var activeJobs   = _jobs.filter(function(j) { return j.status === 'active'; }).length;
  var newContacts  = _contacts.filter(function(c) { return c.status === 'new'; }).length;
  var newApps      = _apps.filter(function(a) { return a.status === 'new'; }).length;

  document.getElementById('stat-active-jobs').textContent  = activeJobs;
  document.getElementById('stat-new-contacts').textContent = newContacts;
  document.getElementById('stat-total-jobs').textContent   = _jobs.length;
  document.getElementById('stat-new-apps').textContent     = newApps;

  // Update page title badge
  var totalNew = newContacts + newApps;
  document.title = (totalNew > 0 ? '(' + totalNew + ') ' : '') + 'Admin Dashboard — Covenant Crest Group Ltd';

  var cb = document.getElementById('contacts-badge');
  if (newContacts > 0 && cb) { cb.textContent = newContacts; cb.classList.add('show'); } else if(cb) cb.classList.remove('show');
  var ab = document.getElementById('apps-badge');
  if (newApps > 0 && ab) { ab.textContent = newApps; ab.classList.add('show'); } else if(ab) ab.classList.remove('show');

  // Activity timeline — last 7 days
  var cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  var tlApps       = _apps.filter(function(a)      { return new Date(a.date).getTime() > cutoff; }).length;
  var tlEnquiries  = _contacts.filter(function(c)  { return new Date(c.date).getTime() > cutoff; }).length;
  var tlHired      = _apps.filter(function(a)      { return a.status === 'hired' && new Date(a.updatedAt || a.date).getTime() > cutoff; }).length;
  var tlShortlist  = _apps.filter(function(a)      { return a.status === 'shortlisted'; }).length;
  var tlAppsEl = document.getElementById('tl-apps');
  var tlEnqEl  = document.getElementById('tl-enquiries');
  var tlHireEl = document.getElementById('tl-hired');
  var tlShortEl= document.getElementById('tl-shortlisted');
  if (tlAppsEl)  tlAppsEl.textContent  = tlApps;
  if (tlEnqEl)   tlEnqEl.textContent   = tlEnquiries;
  if (tlHireEl)  tlHireEl.textContent  = tlHired;
  if (tlShortEl) tlShortEl.textContent = tlShortlist;
  var upd = document.getElementById('timeline-updated');
  if (upd) upd.textContent = 'Updated ' + new Date().toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit'});
}

// ── DASHBOARD ─────────────────────────────────────────────────────
function loadDashboard() {
  loadJobs(function() {
    loadContacts(function() {
      loadApplications();
    });
  });
}

// ── SEARCH & FILTER ─────────────────────────────────────────────────
function filterContacts() {
  var q = (document.getElementById('contacts-search')?.value || '').toLowerCase();
  var rows = document.querySelectorAll('#contacts-tbody tr:not(.empty-row)');
  var shown = 0;
  rows.forEach(function(row) {
    var text = row.textContent.toLowerCase();
    var match = !q || text.includes(q);
    row.style.display = match ? '' : 'none';
    if (match) shown++;
  });
  // Show empty state if nothing matches
  var empty = document.querySelector('#contacts-tbody .no-results-row');
  if (shown === 0 && q) {
    if (!empty) {
      var tr = document.createElement('tr');
      tr.className = 'empty-row no-results-row';
      tr.innerHTML = '<td colspan="7" style="text-align:center;color:var(--muted);padding:24px;">No results for "' + q + '"</td>';
      document.getElementById('contacts-tbody').appendChild(tr);
    }
  } else if (empty) {
    empty.remove();
  }
}

function filterApps() {
  var q      = (document.getElementById('apps-search')?.value || '').toLowerCase();
  var status = (document.getElementById('apps-status-filter')?.value || '').toLowerCase();
  var sector = (document.getElementById('apps-sector-filter')?.value || '').toLowerCase();
  var rows   = document.querySelectorAll('#apps-tbody tr:not(.empty-row)');
  var shown  = 0;
  rows.forEach(function(row) {
    var text = row.textContent.toLowerCase();
    var matchQ      = !q      || text.includes(q);
    var matchStatus = !status || text.includes(status);
    var matchSector = !sector || text.includes(sector);
    var show = matchQ && matchStatus && matchSector;
    row.style.display = show ? '' : 'none';
    if (show) shown++;
  });
  var empty = document.querySelector('#apps-tbody .no-results-row');
  if (shown === 0 && (q || status || sector)) {
    if (!empty) {
      var tr = document.createElement('tr');
      tr.className = 'empty-row no-results-row';
      tr.innerHTML = '<td colspan="8" style="text-align:center;color:var(--muted);padding:24px;">No matching applications found</td>';
      document.getElementById('apps-tbody').appendChild(tr);
    }
  } else if (empty) {
    empty.remove();
  }
}

// ── CSV EXPORT ────────────────────────────────────────────────────────
function exportCSV(type) {
  var data, filename, headers;
  if (type === 'contacts') {
    data     = _contacts || [];
    filename = 'covenant-crest-enquiries-' + new Date().toISOString().slice(0,10) + '.csv';
    headers  = ['Name','Email','Phone','Type','Message','Date','Status'];
    var rows = data.map(function(c) {
      return [c.name,c.email,c.phone||'',c.type||'',
              (c.message||'').split('"').join("'").split('\n').join(' '),
              c.date ? new Date(c.date).toLocaleDateString('en-GB') : '',
              c.status||''].map(function(v){ return '"'+v+'"'; }).join(',');
    });
  } else {
    data     = _apps || [];
    filename = 'covenant-crest-applications-' + new Date().toISOString().slice(0,10) + '.csv';
    headers  = ['First Name','Last Name','Email','Phone','Sector','Job Title','Availability','Notes','CV URL','Status','Date'];
    var rows = data.map(function(a) {
      return [a.first_name||'',a.last_name||'',a.email||'',a.phone||'',
              a.sector||'',a.job_title||'',a.availability||'',
              (a.notes||'').split('"').join("'").split('\n').join(' '),
              a.cvUrl||'',a.status||'',
              a.date ? new Date(a.date).toLocaleDateString('en-GB') : '']
              .map(function(v){ return '"'+v+'"'; }).join(',');
    });
  }
  var csv  = [headers.join(',')].concat(rows).join('\n');
  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href  = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  showToast('Exported ' + data.length + ' records', 'ok');
}

// ── AUTO-REFRESH every 60 seconds ────────────────────────────────────
setInterval(function() {
  if (document.visibilityState === 'visible') {
    loadContacts();
    loadApplications();
    loadDashboard();
  }
}, 60000);

// ── CHANGE ADMIN PASSWORD ────────────────────────────────────────
function changeAdminPassword() {
  var current = document.getElementById('pwd-current').value;
  var newPwd   = document.getElementById('pwd-new').value;
  var confirm  = document.getElementById('pwd-confirm').value;
  var errEl    = document.getElementById('pwd-error');
  var okEl     = document.getElementById('pwd-success');

  errEl.style.display = 'none';
  okEl.style.display  = 'none';

  if (!current || !newPwd || !confirm) {
    errEl.textContent = 'Please fill in all password fields.';
    errEl.style.display = 'block';
    return;
  }
  if (newPwd.length < 8) {
    errEl.textContent = 'New password must be at least 8 characters.';
    errEl.style.display = 'block';
    return;
  }
  if (newPwd !== confirm) {
    errEl.textContent = 'New passwords do not match.';
    errEl.style.display = 'block';
    return;
  }

  apiFetch('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword: current, newPassword: newPwd })
  }).then(function(data) {
    if (data.success) {
      okEl.style.display = 'block';
      document.getElementById('pwd-current').value = '';
      document.getElementById('pwd-new').value     = '';
      document.getElementById('pwd-confirm').value  = '';
    } else {
      errEl.textContent = data.error || 'Failed to change password.';
      errEl.style.display = 'block';
    }
  }).catch(function() {
    errEl.textContent = 'Network error. Please try again.';
    errEl.style.display = 'block';
  });
}

// ── INTEGRATIONS STATUS ───────────────────────────────────────────
function checkIntegrations() {
  var intApi = document.getElementById('int-api');
  if (intApi) intApi.textContent = 'Checking…';
  fetch(API + '/health').then(function(r) { return r.json(); }).then(function(d) {
    if (intApi) {
      intApi.textContent = d.status === 'healthy' ? '✅ Connected' : '⚠ ' + d.status;
      intApi.style.color = d.status === 'healthy' ? 'var(--success)' : 'var(--warn)';
    }
    var intEmail = document.getElementById('int-email');
    var intCloud = document.getElementById('int-cloud');
    if (intEmail) intEmail.textContent = '— (check Render env: RESEND_API_KEY)';
    if (intCloud) intCloud.textContent = '— (check Render env: CLOUDINARY_CLOUD_NAME)';
  }).catch(function() {
    if (intApi) {
      intApi.textContent = '❌ Offline';
      intApi.style.color = 'var(--danger)';
    }
    showApiOffline();
  });
}

// ── DANGER ZONE ───────────────────────────────────────────────────
function apiClearAll(resource) {
  if (!isSA) { showToast('Super Admin only', 'er'); return; }
  var label = resource === 'contacts' ? 'ALL enquiries' : 'ALL job listings';
  if (!confirm('This will permanently delete ' + label + '. Are you sure?')) return;
  if (!confirm('Final confirmation: delete ' + label + '? This cannot be undone.')) return;
  // Delete each item individually (no bulk-delete endpoint needed)
  var items = resource === 'contacts' ? _contacts : _jobs;
  var promises = items.map(function(item) {
    return apiFetch('/' + resource + '/' + item.id, { method: 'DELETE' });
  });
  Promise.all(promises).then(function() {
    showToast('All ' + resource + ' deleted', 'ok');
    if (resource === 'contacts') loadContacts();
    else loadJobs();
  });
}

// ── API OFFLINE BANNER ────────────────────────────────────────────
function showApiOffline() {
  var bar = document.getElementById('apiStatus');
  if (bar) {
    bar.classList.add('show');
    setTimeout(function() { bar.classList.remove('show'); }, 6000);
  }
}

// ── LOGOUT ────────────────────────────────────────────────────────
function logout() {
  ['cc_jwt','cc_role','cc_email','cc_session'].forEach(function(k) { sessionStorage.removeItem(k); });
  window.location.href = '/login.html';
}

// Attach functions to window for inline onclick handlers
window.openJobModal = openJobModal;
window.openUserModal = openUserModal;
window.closeModal = closeModal;
window.showTab = showTab;
window.toggleJob = toggleJob;
window.deleteJob = deleteJob;
window.saveJob = saveJob;
window.previewImage = previewImage;
window.viewContact = viewContact;
window.markContactRead = markContactRead;
window.deleteContact = deleteContact;
window.clearContacts = clearContacts;
window.viewApplication = viewApplication;
window.updateAppStatus = updateAppStatus;
window.saveAdminNotes = saveAdminNotes;
window.toggleAllApps = toggleAllApps;
window.updateBulkToolbar = updateBulkToolbar;
window.bulkAction = bulkAction;
window.bulkEmail = bulkEmail;
window.saveUser = saveUser;
window.deleteUser = deleteUser;
window.changeAdminPassword = changeAdminPassword;
window.exportCSV = exportCSV;
window.filterContacts = filterContacts;
window.filterApps = filterApps;
window.loadSecurityLogs = loadSecurityLogs;
window.logout = logout;
window.apiClearAll = apiClearAll;
window.loadUsers = loadUsers;
window.checkIntegrations = checkIntegrations;
window.loadDashboard = loadDashboard;
window.loadJobs = loadJobs;
window.loadContacts = loadContacts;
window.loadApplications = loadApplications;
