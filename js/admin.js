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
          // Robust Base64URL-safe decoding implementation
          var base64Url = parts[1];
          var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          var pad = base64.length % 4;
          if (pad) {
            if (pad === 2) { base64 += '=='; }
            else if (pad === 3) { base64 += '='; }
          }
          var jsonStr = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
          var payload = JSON.parse(jsonStr);

          sessionStorage.setItem('cc_jwt',   token);
          sessionStorage.setItem('cc_role',  payload.role  || 'superadmin');
          sessionStorage.setItem('cc_email', payload.email || '');
          history.replaceState(null, '', '/admin');
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
var toolbarOptions = [
  ['bold', 'italic', 'underline'],
  [{ 'list': 'ordered'}, { 'list': 'bullet' }],
  ['clean']
];

// Pagination
var _jobsPage = 1, _jobsPerPage = 10;
var _filteredJobs = [];


// Redirect to login if no token — use setTimeout to let functions define first
if (!jwt) {
  setTimeout(function() { window.location.replace('/login'); }, 0);
} else {
  document.body.style.display = '';
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
    qDesc = new Quill('#j-desc-editor', { theme: 'snow', modules: { toolbar: toolbarOptions } });
    qReq  = new Quill('#j-req-editor', { theme: 'snow', modules: { toolbar: toolbarOptions } });
  } else {
    // FALLBACK: If Quill is blocked or fails, show standard textareas
    var dEd = document.getElementById('j-desc-editor');
    var rEd = document.getElementById('j-req-editor');
    var dFb = document.getElementById('j-desc-fallback');
    var rFb = document.getElementById('j-req-fallback');
    if (dEd) dEd.style.display = 'none';
    if (rEd) rEd.style.display = 'none';
    if (dFb) dFb.style.display = 'block';
    if (rFb) rFb.style.display = 'block';
    console.warn('Quill not loaded - using textarea fallback');
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

  // Talent Pool Search/Filter
  var talentSearch = document.getElementById('talent-search');
  if (talentSearch) talentSearch.addEventListener('input', renderTalentPool);
  var talentSector = document.getElementById('talent-sector-filter');
  if (talentSector) talentSector.addEventListener('change', renderTalentPool);

  // Compliance Filters
  var compSearch = document.getElementById('comp-search');
  if (compSearch) compSearch.addEventListener('input', renderCompliance);
  var compSector = document.getElementById('comp-sector-filter');
  if (compSector) compSector.addEventListener('change', renderCompliance);
  var compUrgency = document.getElementById('comp-urgency-filter');
  if (compUrgency) compUrgency.addEventListener('change', renderCompliance);
  var compPool = document.getElementById('comp-pool-filter');
  if (compPool) compPool.addEventListener('change', renderCompliance);
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
    clearAllContactsBtn.addEventListener('click', function() { openDangerConfirm('contacts'); });
  }
  var clearAllJobsBtn = document.getElementById('clearAllJobsBtn');
  if (clearAllJobsBtn) {
    clearAllJobsBtn.addEventListener('click', function() { openDangerConfirm('jobs'); });
  }
  // Confirm modal
  var confirmOkBtn = document.getElementById('confirm-ok-btn');
  if (confirmOkBtn) {
    confirmOkBtn.addEventListener('click', function() {
      closeModal('confirmModal');
      if (_confirmCallback) { _confirmCallback(); _confirmCallback = null; }
    });
  }
  var confirmCancelBtn = document.getElementById('confirm-cancel-btn');
  if (confirmCancelBtn) {
    confirmCancelBtn.addEventListener('click', function() {
      closeModal('confirmModal');
      _confirmCallback = null;
    });
  }

  // Session timeout
  var sessionStayBtn = document.getElementById('session-stay-btn');
  if (sessionStayBtn) {
    sessionStayBtn.addEventListener('click', function() {
      closeModal('sessionModal');
      resetIdleTimers();
    });
  }

  // Escape key closes any open modal
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(function(m) { m.classList.remove('open'); });
    }
  });

  var dangerConfirmBtn = document.getElementById('danger-confirm-btn');
  if (dangerConfirmBtn) {
    dangerConfirmBtn.addEventListener('click', function() {
      var inputEl = document.getElementById('danger-confirm-input');
      if (!inputEl || inputEl.value.trim().toUpperCase() !== 'DELETE') {
        inputEl.style.borderColor = 'var(--danger)';
        inputEl.placeholder = 'Type DELETE exactly';
        return;
      }
      if (_dangerResource) apiClearAll(_dangerResource);
    });
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
  var tbodies = ['jobs-tbody', 'dash-jobs-tbody', 'contacts-tbody', 'dash-contacts-tbody', 'apps-tbody', 'users-tbody', 'talent-tbody', 'planner-tbody', 'compliance-tbody'];
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
      if (target.matches('.app-cb') || action === 'cv-link' || action === 'download-cv') {
        if (target.matches('.app-cb')) updateBulkToolbar();
        if (action === 'download-cv') {
          var a = null;
          for(var i=0; i<_apps.length; i++) { if(_apps[i].id === rowId) { a = _apps[i]; break; } }
          if (a) downloadApplicationCV(a);
        }
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

  // Pagination Delegation
  var jobsPag = document.getElementById('jobs-pagination');
  if (jobsPag) {
    jobsPag.addEventListener('click', function(e) {
      var page = e.target.getAttribute('data-page');
      if (page) {
        _jobsPage = parseInt(page);
        renderJobs();
      }
    });
  }
});

// ── API helper ────────────────────────────────────────────────────
function apiFetch(path, options) {
  options = options || {};
  var headers = { 'Authorization': 'Bearer ' + jwt, 'Content-Type': 'application/json' };
  if (options.headers) {
    for (var key in options.headers) { headers[key] = options.headers[key]; }
  }
  options.headers = headers;
  return fetch(API + path, options).then(function(r) {
    if (r.status === 401) { logout(); return; }
    return r.json();
  });
}

// ── Helpers ───────────────────────────────────────────────────────
function esc(s) { if (!s) return ''; var r = String(s); r = r.replace(/&/g,'&amp;'); r = r.replace(/</g,'&lt;'); r = r.replace(/>/g,'&gt;'); r = r.split('"').join('&quot;'); return r; }
function fmtDate(d) { try { return new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); } catch(e) { return ''; } }

function daysAgo(dateStr) {
  if (!dateStr) return null;
  var d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : Math.floor((Date.now() - d.getTime()) / 86400000);
}
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
  document.getElementById('j-save-btn').textContent = isEdit ? 'Save Changes' : 'Create Job Listing';
  document.getElementById('j-id').value      = isEdit ? job.id    : '';
  document.getElementById('j-title').value   = isEdit ? job.title : '';
  document.getElementById('j-pay').value     = isEdit ? job.pay   : '';
  document.getElementById('j-sector').value  = isEdit ? job.sector   : 'care';
  document.getElementById('j-type').value    = isEdit ? job.type     : 'full-time';
  document.getElementById('j-location').value= isEdit ? job.location : '';
  document.getElementById('j-status').value  = isEdit ? job.status   : 'active';
  document.getElementById('j-closing-date').value = (isEdit && job.closingDate) ? job.closingDate : '';
  document.getElementById('j-seo-keywords').value = (isEdit && job.seoKeywords) ? job.seoKeywords : '';
  document.getElementById('j-seo-desc').value = (isEdit && job.seoDesc) ? job.seoDesc : '';
  
  if (qDesc) qDesc.root.innerHTML = isEdit ? (job.desc || '') : '';
  if (qReq)  qReq.root.innerHTML  = isEdit ? (job.req  || '') : '';
  
  // Fallback values
  var dFb = document.getElementById('j-desc-fallback');
  var rFb = document.getElementById('j-req-fallback');
  if (dFb) dFb.value = isEdit ? (job.desc || '') : '';
  if (rFb) rFb.value = isEdit ? (job.req  || '') : '';

  // Force re-init if somehow lost (rare)
  if (!qDesc && typeof Quill !== 'undefined') {
    qDesc = new Quill('#j-desc-editor', { theme: 'snow', modules: { toolbar: toolbarOptions } });
    qReq  = new Quill('#j-req-editor', { theme: 'snow', modules: { toolbar: toolbarOptions } });
  }

  document.getElementById('j-err').classList.remove('show');
  var prev = document.getElementById('j-img-preview');
  prev.src = (isEdit && job.imageUrl) ? job.imageUrl : '';
  prev.className = (isEdit && job.imageUrl) ? 'img-preview show' : 'img-preview';
  document.getElementById('jobModal').classList.add('open');

  // Fix: some browsers need a tiny delay to enable editing in modals
  setTimeout(function() {
    if (qDesc) qDesc.focus();
  }, 200);
}


function openUserModal() {
  if (!isSA) { showToast('Super Admin only', 'er'); return; }
  document.getElementById('userModal').classList.add('open');
}

function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ── Tab switching ─────────────────────────────────────────────────
var tabTitles = { dashboard:'Overview', jobs:'Job Listings', contacts:'Contact Enquiries', applications:'Candidate Applications', talent:'Talent Pool', planner:'Interview Planner', compliance:'Compliance Dashboard', settings:'Settings', users:'User Management', security:'Security Audit Logs' };

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
  if (id === 'talent')       { loadApplications(renderTalentPool); }
  if (id === 'planner')      { loadApplications(renderPlanner); }
  if (id === 'compliance')   { loadApplications(renderCompliance); }
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
  var qInput = document.getElementById('jobs-search');
  var sInput = document.getElementById('jobs-sector-filter');
  var stInput = document.getElementById('jobs-status-filter');
  var q      = (qInput ? qInput.value : '').toLowerCase();
  var sector = (sInput ? sInput.value : '').toLowerCase();
  var status = (stInput ? stInput.value : '').toLowerCase();

  _filteredJobs = _jobs.filter(function(j) {
    var titleL = j.title.toLowerCase();
    var locL = (j.location || '').toLowerCase();
    var matchQ      = !q      || titleL.indexOf(q) !== -1 || locL.indexOf(q) !== -1;
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
    var isActive = j.status === 'active';
    
    return '<tr>' +
      '<td><input type="checkbox" class="job-cb" value="' + j.id + '"></td>' +
      '<td class="td-name">' + esc(j.title) + (j.imageUrl ? ' <span title="Has image" style="color:var(--gold);">🖼</span>' : '') + (isExpired ? ' <span style="color:var(--danger);font-size:9px;font-weight:700;">EXPIRED</span>' : '') + '</td>' +
      '<td><span class="pill ' + (sectorPill[j.sector] || 'p-read') + '">' + esc(sectorLabel[j.sector] || j.sector) + '</span></td>' +
      '<td><span class="pill ' + (appCount > 0 ? 'p-haulage' : 'p-read') + '" style="cursor:pointer;" data-id="' + esc(j.title) + '" data-action="filter-apps-by-job" title="View applicants">' + appCount + ' App' + (appCount !== 1 ? 's' : '') + '</span></td>' +
      '<td>' + esc(j.location) + '</td>' +
      '<td class="td-muted">' + esc(typeLabel[j.type] || j.type) + '</td>' +
      '<td style="font-weight:600;">' + esc(j.pay) + '</td>' +
      '<td><span class="pill ' + (isActive ? 'p-active' : 'p-inactive') + '">' + esc(j.status) + '</span></td>' +
      '<td style="white-space:nowrap;">' +
        '<button class="btn-sm ' + (isActive ? 'pr' : 'sc') + '" data-id="' + j.id + '" data-action="toggle-job" style="margin-right:4px;" title="' + (isActive ? 'Deactivate' : 'Activate') + '">' + (isActive ? '⏸' : '▶') + '</button>' +
        '<button class="btn-sm pr" data-id="' + j.id + '" data-action="edit-job" style="margin-right:4px;">Edit</button>' +
        '<button class="btn-sm dn" data-id="' + j.id + '" data-action="delete-job">Del</button>' +
      '</td></tr>';
  }).join('');

  // Render Pagination
  var pagHtml = '';
  if (pages > 1) {
    for (var i = 1; i <= pages; i++) {
      pagHtml += '<button class="btn-sm ' + (i === _jobsPage ? 'pr' : 'sc') + '" data-page="' + i + '">' + i + '</button>';
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
  var doJobBulk = function() {
    var promises = ids.map(function(id) {
      if (action === 'delete') return apiFetch('/jobs/' + id, { method: 'DELETE' });
      return apiFetch('/jobs/' + id, { method: 'PUT', body: JSON.stringify({ status: action }) });
    });
    Promise.all(promises).then(function() {
      showToast('Updated ' + ids.length + ' jobs', 'ok');
      loadJobs();
    });
  };
  if (action === 'delete') { openConfirm('Permanently delete ' + ids.length + ' job listing' + (ids.length > 1 ? 's' : '') + '?', doJobBulk); return; }
  doJobBulk();
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
    desc        : qDesc ? qDesc.root.innerHTML : (document.getElementById('j-desc-fallback') ? document.getElementById('j-desc-fallback').value : ''),
    req         : qReq ? qReq.root.innerHTML : (document.getElementById('j-req-fallback') ? document.getElementById('j-req-fallback').value : '')
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
  openConfirm('Delete this job listing? This cannot be undone.', function() {
    apiFetch('/jobs/' + id, { method: 'DELETE' }).then(function(data) {
      if (data && data.success) { showToast('Job deleted', 'ok'); loadJobs(); }
      else showToast('Delete failed', 'er');
    });
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
  var searchVal = (document.getElementById('contacts-search') ? document.getElementById('contacts-search').value : '').toLowerCase();
  
  // Sort by date descending to ensure previous requests are at top/visible
  _contacts.sort(function(a, b) {
     return new Date(b.date || 0) - new Date(a.date || 0);
  });

  var filtered = searchVal ? _contacts.filter(function(c) {
    return (c.name||'').toLowerCase().indexOf(searchVal) !== -1 || 
           (c.email||'').toLowerCase().indexOf(searchVal) !== -1 ||
           (c.message||'').toLowerCase().indexOf(searchVal) !== -1;
  }) : _contacts;
  if (!filtered.length) { tbody.innerHTML = '<tr class="empty-row"><td colspan="8">No enquiries recorded yet.</td></tr>'; return; }
  tbody.innerHTML = filtered.map(function(c) {
    return '<tr style="cursor:pointer;" data-id="' + c.id + '" data-action="view-contact">' +
      '<td class="td-name">' + esc(c.name) + '</td>' +
      '<td>' + esc(c.email) + '</td>' +
      '<td>' + (c.phone ? '<a href="tel:' + esc(c.phone) + '" style="color:var(--navy);font-weight:600;" onclick="event.stopPropagation();">' + esc(c.phone) + '</a>' : '<span class="td-muted">—</span>') + '</td>' +
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
  var noteEl = document.getElementById('cm-admin-note');
  if (noteEl) noteEl.value = c.adminNotes || '';
  var saveNoteBtn = document.getElementById('cm-save-note-btn');
  if (saveNoteBtn) saveNoteBtn.onclick = function() { saveContactNote(id); };
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
      var typeLabel = { failed_login: 'Failed Login', password_change: 'Password Change' }[l.type] || l.type;
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
  openConfirm('Delete this enquiry? This cannot be undone.', function() {
    apiFetch('/contacts/' + id, { method: 'DELETE' }).then(function(data) {
      if (data && data.success) { showToast('Enquiry deleted', 'ok'); loadContacts(); }
      else showToast('Delete failed', 'er');
    });
  });
}

function clearContacts() {
  if (!isSA) { showToast('Super Admin only', 'er'); return; }
  showToast('Use "Clear All Enquiries" in Settings → Danger Zone', 'er');
}

// ── APPLICATIONS ──────────────────────────────────────────────────
var _apps = [];

function loadApplications(cb) {
  apiFetch('/applications/all').then(function(data) {
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
  if (!_apps.length) { tbody.innerHTML = '<tr class="empty-row"><td colspan="10">No applications yet.</td></tr>'; return; }

  // Build email frequency map for returning-applicant detection
  var emailCount = {};
  _apps.forEach(function(a) { if (a.email) emailCount[a.email] = (emailCount[a.email] || 0) + 1; });

  tbody.innerHTML = _apps.map(function(a) {
    var cvLink = '—';
    if (a.cvBase64 || a.cvUrl) {
      cvLink = '<button class="btn-sm gd" style="border:none;cursor:pointer;" data-id="' + a.id + '" data-action="download-cv">CV</button>';
    }
    var days = daysAgo(a.date);
    var isNew = a.status === 'new';
    var rowStyle = '';
    if (isNew && days !== null) {
      if (days >= 7) rowStyle = ' style="background:#FFF8F8;"';
      else if (days >= 3) rowStyle = ' style="background:#FFFDF5;"';
    }
    var daysText = days === null ? '—' : (days === 0 ? 'Today' : days + 'd');
    var daysColor = (isNew && days >= 7) ? 'var(--danger)' : (isNew && days >= 3) ? 'var(--warn)' : 'var(--muted)';
    var isReturning = emailCount[a.email] > 1;
    var starsHtml = '';
    if (a.rating) {
      starsHtml = ' <span style="color:#C9A84C;font-size:9px;">' + '&#9733;'.repeat(a.rating) + '</span>';
    }
    return '<tr' + rowStyle + ' data-id="' + a.id + '" data-action="view-app" style="cursor:pointer' + (rowStyle ? '' : '') + '">' +
      '<td><input type="checkbox" class="app-cb" value="' + a.id + '"></td>' +
      '<td class="td-name">' + esc((a.first_name || '') + ' ' + (a.last_name || '')) + starsHtml +
        (isReturning ? '<span class="pill p-haulage" style="font-size:8px;margin-left:4px;padding:2px 5px;">Returning</span>' : '') + '</td>' +
      '<td>' + esc(a.email) + '</td>' +
      '<td class="td-muted">' + esc(a.phone || '—') + '</td>' +
      '<td><span class="pill ' + (sectorPill[a.sector] || 'p-read') + '">' + esc(sectorLabel[a.sector] || a.sector || '—') + '</span></td>' +
      '<td class="td-muted">' + esc(a.job_title || '—') + '</td>' +
      '<td class="td-muted">' + fmtDate(a.date) + '</td>' +
      '<td><span style="font-size:11px;font-weight:700;color:' + daysColor + ';">' + daysText + '</span></td>' +
      '<td><span class="pill ' + (appStatusPill[a.status] || 'p-new') + '">' + esc(a.status || 'new') + '</span></td>' +
      '<td>' + cvLink + '</td></tr>';
  }).join('');
  updateBulkToolbar();
}

function viewApplication(id) {
    var a = null;
    for(var i=0; i<_apps.length; i++) { if(_apps[i].id === id) { a = _apps[i]; break; } }
    if (!a) return;
  window._curAppId = id;
  var sectorDisplay = sectorLabel[a.sector] || a.sector || '—';
  var availDisplay  = { immediate:'Immediately available', '1week':'Within 1 week', '2weeks':'Within 2 weeks', other:'Other' }[a.availability] || a.availability || '—';
  document.getElementById('am-title').textContent = (a.first_name || '') + ' ' + (a.last_name || '');
  document.getElementById('am-sub').textContent = (a.email || '') + ' · ' + sectorDisplay + ' · ' + fmtDate(a.date);
    var hasCV = !!(a.cvBase64 || a.cvUrl);
  var dbsStatus = getDocStatus(a.dbs_expiry_date);
  var siaStatus = getDocStatus(a.sia_expiry_date);
  var rtwStatus = getDocStatus(a.rtw_expiry_date);
  var mhStatus  = getDocStatus(a.manual_handling_cert);
  var compHtml =
    '<div id="am-compliance-section" style="margin-top:18px;border-top:2px solid var(--border);padding-top:16px;">' +
    '<div style="font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:var(--muted);margin-bottom:12px;">Compliance Records</div>' +
    // DBS
    '<div style="background:#f8f9fa;border-radius:6px;padding:12px;margin-bottom:8px;">' +
      '<div style="font-size:10px;font-weight:700;color:var(--navy);margin-bottom:8px;display:flex;align-items:center;gap:8px;">DBS Check <span class="comp-status ' + dbsStatus.cls + '">' + dbsStatus.label + '</span></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">' +
        '<div><label class="af-label">Level</label>' +
          '<select class="af-select" id="cm-dbs-level">' +
            '<option value=""' + (!a.dbs_level ? ' selected' : '') + '>Not Required</option>' +
            '<option value="enhanced"' + (a.dbs_level === 'enhanced' ? ' selected' : '') + '>Enhanced</option>' +
            '<option value="standard"' + (a.dbs_level === 'standard' ? ' selected' : '') + '>Standard</option>' +
            '<option value="basic"' + (a.dbs_level === 'basic' ? ' selected' : '') + '>Basic</option>' +
          '</select></div>' +
        '<div><label class="af-label">Certificate No.</label>' +
          '<input class="af-input" id="cm-dbs-cert" value="' + esc(a.dbs_cert_number || '') + '" placeholder="e.g. 001234567890"></div>' +
        '<div><label class="af-label">Expiry / Renewal Date</label>' +
          '<input type="date" class="af-input" id="cm-dbs-expiry" value="' + esc(a.dbs_expiry_date || '') + '"></div>' +
      '</div>' +
    '</div>' +
    // SIA
    '<div style="background:#f8f9fa;border-radius:6px;padding:12px;margin-bottom:8px;">' +
      '<div style="font-size:10px;font-weight:700;color:var(--navy);margin-bottom:8px;display:flex;align-items:center;gap:8px;">SIA Licence <span class="comp-status ' + siaStatus.cls + '">' + siaStatus.label + '</span></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
        '<div><label class="af-label">Licence Number</label>' +
          '<input class="af-input" id="cm-sia-number" value="' + esc(a.sia_licence_number || '') + '" placeholder="e.g. 1234-5678-9012-3456"></div>' +
        '<div><label class="af-label">Expiry Date</label>' +
          '<input type="date" class="af-input" id="cm-sia-expiry" value="' + esc(a.sia_expiry_date || '') + '"></div>' +
      '</div>' +
    '</div>' +
    // RTW
    '<div style="background:#f8f9fa;border-radius:6px;padding:12px;margin-bottom:8px;">' +
      '<div style="font-size:10px;font-weight:700;color:var(--navy);margin-bottom:8px;display:flex;align-items:center;gap:8px;">Right to Work <span class="comp-status ' + rtwStatus.cls + '">' + (a.rtw_verified ? '✓ Verified · ' : '') + rtwStatus.label + '</span></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
        '<div><label class="af-label">Document Type</label>' +
          '<select class="af-select" id="cm-rtw-type">' +
            '<option value=""' + (!a.rtw_doc_type ? ' selected' : '') + '>Not Recorded</option>' +
            '<option value="british_passport"' + (a.rtw_doc_type === 'british_passport' ? ' selected' : '') + '>British / Irish Passport</option>' +
            '<option value="eu_settled"' + (a.rtw_doc_type === 'eu_settled' ? ' selected' : '') + '>EU Settled Status</option>' +
            '<option value="visa"' + (a.rtw_doc_type === 'visa' ? ' selected' : '') + '>Visa</option>' +
            '<option value="brp"' + (a.rtw_doc_type === 'brp' ? ' selected' : '') + '>Biometric Residence Permit</option>' +
            '<option value="other"' + (a.rtw_doc_type === 'other' ? ' selected' : '') + '>Other</option>' +
          '</select></div>' +
        '<div><label class="af-label">Document Expiry (if applicable)</label>' +
          '<input type="date" class="af-input" id="cm-rtw-expiry" value="' + esc(a.rtw_expiry_date || '') + '"></div>' +
      '</div>' +
      '<div style="margin-top:6px;"><label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;">' +
        '<input type="checkbox" id="cm-rtw-verified"' + (a.rtw_verified ? ' checked' : '') + '> Right to Work document verified by compliance officer</label></div>' +
    '</div>' +
    // Manual Handling
    '<div style="background:#f8f9fa;border-radius:6px;padding:12px;margin-bottom:8px;">' +
      '<div style="font-size:10px;font-weight:700;color:var(--navy);margin-bottom:8px;display:flex;align-items:center;gap:8px;">Manual Handling Certificate <span class="comp-status ' + mhStatus.cls + '">' + mhStatus.label + '</span></div>' +
      '<div style="max-width:220px;">' +
        '<label class="af-label">Expiry Date</label>' +
        '<input type="date" class="af-input" id="cm-mh-expiry" value="' + esc(a.manual_handling_cert || '') + '">' +
      '</div>' +
    '</div>' +
    // Compliance Notes
    '<div style="margin-bottom:12px;"><label class="af-label">Compliance Notes</label>' +
      '<textarea id="cm-compliance-notes" class="af-textarea" placeholder="Internal compliance notes...">' + esc(a.compliance_notes || '') + '</textarea></div>' +
    '<button class="btn-primary" style="width:100%;padding:10px;" id="am-save-compliance-btn">Save Compliance Records</button>' +
    '</div>';
    document.getElementById('am-body').innerHTML =
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">' +
        '<div style="background:#f8f9fa;border-radius:6px;padding:10px 14px;"><div style="font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:3px;">Phone</div><div style="font-size:13px;font-weight:600;color:var(--navy);">' + esc(a.phone || '—') + '</div></div>' +
        '<div style="background:#f8f9fa;border-radius:6px;padding:10px 14px;"><div style="font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:3px;">Sector</div><div style="font-size:13px;font-weight:600;color:var(--navy);"><span class="pill ' + (sectorPill[a.sector] || 'p-read') + '">' + esc(sectorDisplay) + '</span></div></div>' +
        '<div style="background:#f8f9fa;border-radius:6px;padding:10px 14px;"><div style="font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:3px;">Job Applied For</div><div style="font-size:13px;font-weight:600;color:var(--navy);">' + esc(a.job_title || '—') + '</div></div>' +
        '<div style="background:#f8f9fa;border-radius:6px;padding:10px 14px;"><div style="font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:3px;">Availability</div><div style="font-size:13px;font-weight:600;color:var(--navy);">' + esc(availDisplay) + '</div></div>' +
        '<div style="background:#f8f9fa;border-radius:6px;padding:10px 14px;"><div style="font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:3px;">Right to Work</div><div style="font-size:13px;font-weight:600;color:var(--navy);">' + esc(a.rtw_status ? (a.rtw_status === 'british_irish' ? 'UK/Irish Passport' : (a.rtw_status === 'visa' ? 'Visa' : a.rtw_status)) : 'Not Specified') + '</div></div>' +
        (a.visa_details ? '<div style="background:#fff4e5;border-radius:6px;padding:10px 14px;grid-column: span 2;"><div style="font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#d35400;margin-bottom:3px;">Visa Specifics</div><div style="font-size:13px;font-weight:600;color:#d35400;">' + esc(a.visa_details) + '</div></div>' : '') +
        (a.is_veteran === 'yes' ? '<div style="background:#eef8f3;border-radius:6px;padding:10px 14px;grid-column: span 2;border-left:3px solid var(--success);"><div style="font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--success);margin-bottom:3px;">Armed Forces Background</div><div style="font-size:13px;font-weight:600;color:var(--navy);">British Armed Forces Veteran</div></div>' : '') +
      '</div>' +
      (a.assistance ? '<div style="background:#fefefe;border:1px solid #ffccbc;border-radius:6px;padding:10px 14px;margin-bottom:14px;"><div style="font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#ff5722;margin-bottom:3px;">Assistance Required</div><div style="font-size:12px;color:var(--navy);">' + esc(a.assistance) + '</div></div>' : '') +
      '<div style="margin-bottom:14px;padding:10px 14px;background:#f8f9fa;border-radius:6px;display:flex;align-items:center;justify-content:space-between;">' +
        '<div style="font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);">Current Status</div>' +
        '<span class="pill ' + (appStatusPill[a.status] || 'p-new') + '" style="font-size:10px;">' + esc(a.status || 'new') + '</span>' +
      '</div>' +
      '<div style="margin-bottom:14px;padding:10px 14px;background:#f8f9fa;border-radius:6px;display:flex;align-items:center;justify-content:space-between;">' +
        '<div style="font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);">Candidate Rating</div>' +
        '<div id="am-stars" style="display:flex;gap:2px;">' +
          [1,2,3,4,5].map(function(n) { return '<button data-star="' + n + '" title="' + n + ' star' + (n>1?'s':'') + '" style="background:none;border:none;font-size:20px;cursor:pointer;color:' + (n <= (a.rating || 0) ? '#C9A84C' : '#ddd') + ';padding:0 1px;line-height:1;">&#9733;</button>'; }).join('') +
        '</div>' +
      '</div>' +
      '<div style="margin-bottom:14px;padding:10px 14px;background:#f0f8ff;border-left:4px solid #0077b5;border-radius:6px;display:flex;align-items:center;justify-content:space-between;">' +
        '<div style="font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#0077b5;">AI Match Score</div>' +
        '<span style="font-size:14px;font-weight:700;color:#0077b5;">' + (a.matchScore != null ? a.matchScore + '% Match' : 'N/A') + '</span>' +
      '</div>' +
      '<div style="margin-bottom:14px;padding:14px 16px;border-radius:6px;border:1px solid ' + (hasCV ? '#C9A84C' : '#e0e0e0') + ';background:' + (hasCV ? '#fffbf0' : '#f9f9f9') + ';display:flex;align-items:center;gap:12px;">' +
        '<span style="display:flex;align-items:center;color:' + (hasCV ? '#C9A84C' : '#aaa') + '"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span>' +
        '<div style="flex:1;">' +
          '<div style="font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:' + (hasCV ? '#C9A84C' : '#aaa') + ';margin-bottom:3px;">CV / Resume</div>' +
          (hasCV ? '<button id="am-download-cv" style="background:none;border:none;padding:0;font-size:13px;color:#0D1B2A;font-weight:600;text-decoration:underline;cursor:pointer;">Download CV &rarr;</button>' : '<span style="font-size:12px;color:#aaa;">No CV uploaded by candidate</span>') +
        '</div>' +
      '</div>' +
    (a.notes ? '<div style="background:var(--cream);border-radius:6px;padding:14px;margin-bottom:14px;"><p style="font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#aaa;margin-bottom:6px;">Candidate Notes</p><p style="font-size:12px;line-height:1.75;white-space:pre-wrap;">' + esc(a.notes) + '</p></div>' : '') +
    '<div><label class="af-label">Internal Admin Notes</label><textarea id="am-admin-notes" class="af-textarea" placeholder="Private notes about this candidate...">' + esc(a.adminNotes || '') + '</textarea></div>';

  document.getElementById('am-body').insertAdjacentHTML('beforeend', compHtml);
  var saveCompBtn = document.getElementById('am-save-compliance-btn');
  if (saveCompBtn) saveCompBtn.onclick = function() { saveCompliance(window._curAppId); };

  var jobSubject = a.job_title ? 'Re: Your application for ' + (a.job_title) + ' — Covenant Crest Group' : 'Re: Your application to Covenant Crest Group';
  
  document.getElementById('am-footer-container').innerHTML = 
    '<div style="margin-top:18px;padding-top:14px;border-top:1px solid var(--border);display:flex;gap:8px;flex-wrap:wrap;align-items:center;">' +
      '<button class="btn-sm sc" id="am-shortlist-btn">Shortlist</button>' +
      '<button class="btn-sm pr" id="am-hired-btn">Mark Hired</button>' +
      '<button class="btn-sm dn" id="am-reject-btn">Reject</button>' +
      '<button class="btn-sm dn" id="am-blacklist-btn" style="background:#000;color:#fff;">Blacklist</button>' +
      '<button class="btn-sm pr" id="am-reply-btn" style="background:#0D1B2A;color:#fff;">Reply by Email</button>' +
      '<button class="btn-sm pr" id="am-pitch-btn" style="background:var(--gold);color:var(--navy);">Generate Client Pitch PDF</button>' +
      '<div style="flex:1;"></div>' +
      '<button class="btn-primary" style="padding:7px 14px;font-size:9px;" id="am-save-notes-btn">Save Notes</button>' +
    '</div>';

  document.getElementById('am-shortlist-btn').onclick = function() { updateAppStatus(window._curAppId,'shortlisted'); };
  document.getElementById('am-hired-btn').onclick = function() { updateAppStatus(window._curAppId,'hired'); };
  document.getElementById('am-reject-btn').onclick = function() { updateAppStatus(window._curAppId,'rejected'); };
  document.getElementById('am-blacklist-btn').onclick = function() { openConfirm('Blacklist this candidate? They will be permanently marked.', function() { updateAppStatus(window._curAppId,'blacklisted'); }); };
  document.getElementById('am-save-notes-btn').onclick = function() { saveAdminNotes(window._curAppId); };

  document.getElementById('am-reply-btn').onclick = function() { window.location.href = 'mailto:' + a.email + '?subject=' + encodeURIComponent(jobSubject) + '&body=Dear ' + encodeURIComponent((a.first_name || '') + ' ' + (a.last_name || '')) + ',%0D%0A%0D%0AThank you for applying' + (a.job_title ? ' for the ' + a.job_title + ' position' : '') + ' with Covenant Crest Group.%0D%0A%0D%0AKind regards,%0D%0ACovenant Crest Recruitment%0D%0A07346 809846%0D%0Arecruitment@covenantcrest.co.uk'; };

  document.getElementById('am-pitch-btn').onclick = function() {
    var pitchHTML = "<html><head><title>Candidate Pitch - Covenant Crest Group</title><style>body{font-family:sans-serif;padding:40px;line-height:1.6;} .header{text-align:center;border-bottom:2px solid #C9A84C;padding-bottom:20px;margin-bottom:20px;} .c-name{font-size:24px;color:#0D1B2A;} .c-details{margin-bottom:20px;} .c-notes{background:#f9f9f9;padding:20px;border-left:4px solid #C9A84C;}</style></head><body>" +
      "<div class='header'><h1 style='color:#0D1B2A;'>Covenant Crest Group Ltd</h1><p style='color:#7A8694;'>Confidential Candidate Submission</p></div>" +
      "<div class='c-details'><div class='c-name'>Candidate: " + esc(a.first_name || 'A') + " " + esc((a.last_name || '').charAt(0)) + ".</div>" +
      "<p><strong>Sector:</strong> " + esc(sectorDisplay) + "</p>" +
      "<p><strong>Availability:</strong> " + esc(availDisplay) + "</p></div>" +
      "<div class='c-notes'><h3>Consultant Notes:</h3><p>" + esc(a.adminNotes || a.notes || 'Strong candidate. Fully vetted.') + "</p></div>" +
      "<p style='margin-top:40px;font-size:12px;color:#7A8694;text-align:center;'>This is a strictly confidential document provided by Covenant Crest Group. Please contact us directly to arrange an interview.</p>" +
      "</body></html>";
    var blob = new Blob([pitchHTML], { type: 'text/html' });
    var url = window.URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'Covenant_Crest_Pitch_' + (a.first_name || 'Candidate') + '.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  var amDownload = document.getElementById('am-download-cv');
  if (amDownload) {
    amDownload.onclick = function() { downloadApplicationCV(a); };
  }

  // Star rating
  var starsEl = document.getElementById('am-stars');
  if (starsEl) {
    starsEl.addEventListener('click', function(e) {
      var btn = e.target.closest('button[data-star]');
      if (!btn) return;
      var rating = parseInt(btn.getAttribute('data-star'), 10);
      saveRating(window._curAppId, rating);
    });
  }

  document.getElementById('appModal').classList.add('open');
}

function downloadApplicationCV(a) {
  var data = a.cvBase64 || a.cvUrl;
  if (!data) return showToast('No CV on record for this candidate', 'er');

  var safeName = ((a.first_name || 'Candidate') + '_' + (a.last_name || 'CV')).replace(/\s+/g, '_');
  var filename = a.cvFileName || (safeName + '.pdf');

  function triggerDownload(blob, fname) {
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = fname;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function() { URL.revokeObjectURL(url); }, 2000);
  }

  // URL-based CV (Cloudinary or any direct link)
  if (data.indexOf('http') === 0 || data.indexOf('//') === 0) {
    var fetchUrl = data;
    if (data.indexOf('cloudinary.com') !== -1 && data.indexOf('fl_attachment') === -1) {
      var safeFl = safeName.replace(/[^a-zA-Z0-9_-]/g, '_');
      fetchUrl = data.replace('/upload/', '/upload/fl_attachment:' + safeFl + '/');
    }
    showToast('Preparing CV download…', 'ok');
    fetch(fetchUrl)
      .then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.blob();
      })
      .then(function(blob) {
        // Derive extension from blob mime type if filename has none
        if (!filename.match(/\.(pdf|docx|doc)$/i)) {
          if (blob.type === 'application/pdf') filename += '.pdf';
          else if (blob.type.indexOf('word') !== -1) filename += '.docx';
        }
        triggerDownload(blob, filename);
      })
      .catch(function() {
        // CORS fallback — open in new tab as last resort
        window.open(fetchUrl, '_blank');
      });
    return;
  }

  // Base64 CV (stored directly in DB)
  try {
    var b64 = data.indexOf('base64,') !== -1 ? data.split('base64,')[1] : data;
    var chars = atob(b64);
    var bytes = new Uint8Array(chars.length);
    for (var i = 0; i < chars.length; i++) bytes[i] = chars.charCodeAt(i);

    var mimeType = 'application/octet-stream';
    var ext = '.pdf';
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
      mimeType = 'application/pdf'; ext = '.pdf';
    } else if (bytes[0] === 0x50 && bytes[1] === 0x4B) {
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'; ext = '.docx';
    } else if (bytes[0] === 0xD0 && bytes[1] === 0xCF) {
      mimeType = 'application/msword'; ext = '.doc';
    }

    if (!filename.match(/\.(pdf|docx|doc)$/i)) filename += ext;

    triggerDownload(new Blob([bytes], { type: mimeType }), filename);
  } catch(e) {
    console.error('CV download error:', e);
    showToast('Could not process CV file — please contact support', 'er');
  }
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
  var cbs = document.querySelectorAll('.app-cb:checked');
  var ids = [];
  for(var i=0; i<cbs.length; i++) { ids.push(cbs[i].value); }
  if (!ids.length) return;
  openConfirm('Mark ' + ids.length + ' candidate' + (ids.length > 1 ? 's' : '') + ' as ' + status + '?', function() {
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
  });
}

function bulkEmail() {
  var cbs = document.querySelectorAll('.app-cb:checked');
  var ids = [];
  for(var i=0; i<cbs.length; i++) { ids.push(cbs[i].value); }
  if (!ids.length) return;
  var emails = [];
  for(var j=0; j<ids.length; j++) {
    var found = null;
    for(var k=0; k<_apps.length; k++) { if(_apps[k].id === ids[j]) { found = _apps[k]; break; } }
    if (found && found.email) emails.push(found.email);
  }
  if (!emails.length) return;
  var text = emails.join(', ');
  var label = emails.length + ' email address' + (emails.length > 1 ? 'es' : '') + ' copied to clipboard';
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(function() { showToast(label, 'ok'); }).catch(function() { _fallbackCopy(text, label); });
  } else {
    _fallbackCopy(text, label);
  }
}
function _fallbackCopy(text, label) {
  var ta = document.createElement('textarea');
  ta.value = text; ta.style.position = 'fixed'; ta.style.top = '-9999px';
  document.body.appendChild(ta); ta.focus(); ta.select();
  try { document.execCommand('copy'); showToast(label, 'ok'); }
  catch(e) { showToast('Could not copy automatically', 'er'); }
  document.body.removeChild(ta);
}

function renderTalentPool() {
  var tbody = document.getElementById('talent-tbody');
  if (!tbody) return;
  var qInput = document.getElementById('talent-search');
  var sInput = document.getElementById('talent-sector-filter');
  var q = (qInput ? qInput.value : '').toLowerCase();
  var sector = (sInput ? sInput.value : '').toLowerCase();
  
  var filtered = _apps.filter(function(a) {
    var text = (a.first_name + ' ' + a.last_name + ' ' + a.email + ' ' + (a.notes||'')).toLowerCase();
    return (!q || text.indexOf(q) !== -1) && (!sector || a.sector === sector);
  });

  if (!filtered.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="7">No candidates found matching your criteria.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(function(a) {
    var hasCV = !!(a.cvBase64 || a.cvUrl);
    return '<tr style="cursor:pointer;" data-id="' + a.id + '" data-action="view-app">' +
      '<td class="td-name">' + esc((a.first_name || '') + ' ' + (a.last_name || '')) + '</td>' +
      '<td>' + esc(a.email) + '</td>' +
      '<td class="td-muted">' + esc(a.phone || '—') + '</td>' +
      '<td><span class="pill ' + (sectorPill[a.sector] || 'p-read') + '">' + esc(sectorLabel[a.sector] || a.sector || '—') + '</span></td>' +
      '<td class="td-muted">' + fmtDate(a.date) + '</td>' +
      '<td>' + (hasCV ? '<button class="btn-sm gd" data-id="' + a.id + '" data-action="download-cv">CV</button>' : '<span class="td-muted">—</span>') + '</td>' +
      '<td><button class="btn-sm pr" data-id="' + a.id + '" data-action="view-app">Details</button></td>' +
      '</tr>';
  }).join('');
}

function renderPlanner() {
  var tbody = document.getElementById('planner-tbody');
  if (!tbody) return;
  var shortlisted = _apps.filter(function(a) { return a.status === 'shortlisted'; });

  if (!shortlisted.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No candidates currently shortlisted. Mark candidates as "Shortlist" to see them here.</td></tr>';
    return;
  }

  tbody.innerHTML = shortlisted.map(function(a) {
    return '<tr style="cursor:pointer;" data-id="' + a.id + '" data-action="view-app">' +
      '<td class="td-name">' + esc((a.first_name || '') + ' ' + (a.last_name || '')) + '</td>' +
      '<td>' + esc(a.job_title || 'General Application') + '</td>' +
      '<td class="td-muted">' + esc(a.email) + '<br>' + esc(a.phone || '') + '</td>' +
      '<td class="td-muted">' + fmtDate(a.date) + '</td>' +
      '<td class="td-muted" style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(a.notes || '—') + '</td>' +
      '<td><button class="btn-sm sc" onclick="updateAppStatus(\''+a.id+'\',\'hired\'); event.stopPropagation();">Hire</button></td>' +
      '</tr>';
  }).join('');
}

// ── COMPLIANCE ────────────────────────────────────────────────────
function daysUntil(dateStr) {
  if (!dateStr) return null;
  var today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  var exp = new Date(dateStr + 'T00:00:00Z');
  if (isNaN(exp.getTime())) return null;
  return Math.floor((exp - today) / (1000 * 60 * 60 * 24));
}

function getDocStatus(expiryDate) {
  var d = daysUntil(expiryDate);
  if (d === null) return { cls: 'comp-unknown', label: '—', days: null };
  if (d < 0)    return { cls: 'comp-expired',  label: 'EXPIRED',       days: d };
  if (d <= 30)  return { cls: 'comp-critical', label: d + 'd left',    days: d };
  if (d <= 90)  return { cls: 'comp-warn',     label: d + 'd left',    days: d };
  return          { cls: 'comp-ok',      label: 'Valid · ' + d + 'd', days: d };
}

function worstStatus(arr) {
  var order = ['comp-expired', 'comp-critical', 'comp-warn', 'comp-ok', 'comp-unknown'];
  var worst = order.length - 1;
  for (var i = 0; i < arr.length; i++) {
    var idx = order.indexOf(arr[i].cls);
    if (idx !== -1 && idx < worst) worst = idx;
  }
  return order[worst];
}

function renderCompliance() {
  var tbody = document.getElementById('compliance-tbody');
  if (!tbody) return;

  var q       = ((document.getElementById('comp-search')         || {}).value || '').toLowerCase();
  var sector  = ((document.getElementById('comp-sector-filter')  || {}).value || '');
  var urgency = ((document.getElementById('comp-urgency-filter') || {}).value || '');
  var pool    = ((document.getElementById('comp-pool-filter')    || {}).value || 'hired');

  var workers = _apps.filter(function(a) {
    if (pool === 'hired' && a.status !== 'hired') return false;
    if (sector && a.sector !== sector) return false;
    var name = ((a.first_name || '') + ' ' + (a.last_name || '')).toLowerCase();
    return !q || name.indexOf(q) !== -1;
  });

  // Stats
  var counts = { expired: 0, critical: 0, warn: 0, ok: 0 };
  workers.forEach(function(a) {
    var docs = [getDocStatus(a.dbs_expiry_date), getDocStatus(a.rtw_expiry_date), getDocStatus(a.manual_handling_cert)];
    if (a.sector === 'security') docs.push(getDocStatus(a.sia_expiry_date));
    var w = worstStatus(docs);
    if (w === 'comp-expired')        counts.expired++;
    else if (w === 'comp-critical')  counts.critical++;
    else if (w === 'comp-warn')      counts.warn++;
    else if (w === 'comp-ok')        counts.ok++;
  });
  var setEl = function(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; };
  setEl('comp-stat-expired',  counts.expired);
  setEl('comp-stat-critical', counts.critical);
  setEl('comp-stat-warn',     counts.warn);
  setEl('comp-stat-ok',       counts.ok);

  // Urgency filter (applied after stats are calculated)
  if (urgency) {
    workers = workers.filter(function(a) {
      var docs = [getDocStatus(a.dbs_expiry_date), getDocStatus(a.rtw_expiry_date), getDocStatus(a.manual_handling_cert)];
      if (a.sector === 'security') docs.push(getDocStatus(a.sia_expiry_date));
      var w = worstStatus(docs);
      if (urgency === 'expired')    return w === 'comp-expired';
      if (urgency === 'critical')   return w === 'comp-critical';
      if (urgency === 'warn')       return w === 'comp-warn';
      if (urgency === 'ok')         return w === 'comp-ok';
      if (urgency === 'incomplete') return w === 'comp-unknown';
      return true;
    });
  }

  if (!workers.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="7">No workers found matching your criteria.</td></tr>';
    return;
  }

  var rtwLabels = { british_passport: 'UK Passport', eu_settled: 'EU Settled', visa: 'Visa', brp: 'BRP', other: 'Other' };

  tbody.innerHTML = workers.map(function(a) {
    var dbsS = getDocStatus(a.dbs_expiry_date);
    var siaS = getDocStatus(a.sia_expiry_date);
    var rtwS = getDocStatus(a.rtw_expiry_date);
    var mhS  = getDocStatus(a.manual_handling_cert);

    var allDocs = [dbsS, rtwS, mhS];
    if (a.sector === 'security') allDocs.push(siaS);
    var worst = worstStatus(allDocs);
    var rowCls = (worst === 'comp-expired') ? 'cmp-row-expired' : (worst === 'comp-critical') ? 'cmp-row-critical' : '';

    var dbsCell = '<span class="comp-status ' + dbsS.cls + '">' + (a.dbs_level ? esc(a.dbs_level) + ' · ' : '') + dbsS.label + '</span>';
    var siaCell = (a.sector === 'security') ? '<span class="comp-status ' + siaS.cls + '">' + siaS.label + '</span>' : '<span class="td-muted">N/A</span>';
    var rtwCell = '<span class="comp-status ' + rtwS.cls + '">' + (a.rtw_doc_type ? (esc(rtwLabels[a.rtw_doc_type] || a.rtw_doc_type) + ' · ') : '') + rtwS.label + '</span>' + (a.rtw_verified ? ' <span style="color:var(--success);font-size:9px;" title="Verified">✓</span>' : '');
    var mhCell  = '<span class="comp-status ' + mhS.cls + '">' + mhS.label + '</span>';

    return '<tr class="' + rowCls + '" style="cursor:pointer;" data-id="' + a.id + '" data-action="view-app">' +
      '<td class="td-name">' + esc((a.first_name || '') + ' ' + (a.last_name || '')) + '</td>' +
      '<td><span class="pill ' + (sectorPill[a.sector] || 'p-read') + '">' + esc(sectorLabel[a.sector] || a.sector || '—') + '</span></td>' +
      '<td>' + dbsCell + '</td>' +
      '<td>' + siaCell + '</td>' +
      '<td>' + rtwCell + '</td>' +
      '<td>' + mhCell  + '</td>' +
      '<td><button class="btn-sm gd" data-id="' + a.id + '" data-action="view-app">Update</button></td>' +
      '</tr>';
  }).join('');
}

function saveCompliance(id) {
  var dbsLevel  = (document.getElementById('cm-dbs-level')  || { value: '' }).value;
  var dbsCert   = (document.getElementById('cm-dbs-cert')   || { value: '' }).value;
  var dbsExpiry = (document.getElementById('cm-dbs-expiry') || { value: '' }).value;
  var siaNum    = (document.getElementById('cm-sia-number') || { value: '' }).value;
  var siaExpiry = (document.getElementById('cm-sia-expiry') || { value: '' }).value;
  var rtwType   = (document.getElementById('cm-rtw-type')   || { value: '' }).value;
  var rtwExpiry = (document.getElementById('cm-rtw-expiry') || { value: '' }).value;
  var rtwEl     = document.getElementById('cm-rtw-verified');
  var rtwVerif  = !!(rtwEl && rtwEl.checked);
  var mhExpiry  = (document.getElementById('cm-mh-expiry')  || { value: '' }).value;
  var compNotes = (document.getElementById('cm-compliance-notes') || { value: '' }).value;

  // Auto-calculate compliance_status (all comparisons in UTC to avoid timezone offset)
  var today = new Date(); today.setUTCHours(0, 0, 0, 0);
  var d30   = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  var exps  = [dbsExpiry, siaExpiry, rtwExpiry, mhExpiry].filter(Boolean);
  var compStatus = exps.length ? 'compliant' : 'incomplete';
  for (var i = 0; i < exps.length; i++) {
    var d = new Date(exps[i] + 'T00:00:00Z');
    if (d < today) { compStatus = 'expired'; break; }
    if (d <= d30 && compStatus === 'compliant') compStatus = 'expiring';
  }

  var payload = {
    dbs_level:            dbsLevel,
    dbs_cert_number:      dbsCert,
    dbs_expiry_date:      dbsExpiry,
    sia_licence_number:   siaNum,
    sia_expiry_date:      siaExpiry,
    rtw_doc_type:         rtwType,
    rtw_expiry_date:      rtwExpiry,
    rtw_verified:         rtwVerif,
    manual_handling_cert: mhExpiry,
    compliance_notes:     compNotes,
    compliance_status:    compStatus,
  };

  apiFetch('/applications/' + id, { method: 'PUT', body: JSON.stringify(payload) }).then(function(data) {
    if (data && !data.error) {
      // Update local cache so re-opening the modal shows fresh data
      for (var j = 0; j < _apps.length; j++) {
        if (_apps[j].id === id) {
          _apps[j].dbs_level            = dbsLevel;
          _apps[j].dbs_cert_number      = dbsCert;
          _apps[j].dbs_expiry_date      = dbsExpiry;
          _apps[j].sia_licence_number   = siaNum;
          _apps[j].sia_expiry_date      = siaExpiry;
          _apps[j].rtw_doc_type         = rtwType;
          _apps[j].rtw_expiry_date      = rtwExpiry;
          _apps[j].rtw_verified         = rtwVerif;
          _apps[j].manual_handling_cert = mhExpiry;
          _apps[j].compliance_notes     = compNotes;
          _apps[j].compliance_status    = compStatus;
          break;
        }
      }
      showToast('Compliance records saved', 'ok');
      var compTab = document.getElementById('tab-compliance');
      if (compTab && compTab.classList.contains('active')) renderCompliance();
      updateStats();
    } else {
      showToast('Failed to save compliance data', 'er');
    }
  });
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
  if (!email || email.indexOf('@') === -1) { err.textContent = 'Enter a valid email.'; err.classList.add('show'); return; }
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
  openConfirm('Delete this employee account? They will no longer be able to log in.', function() {
    apiFetch('/users/' + id, { method: 'DELETE' }).then(function(data) {
      if (data && data.success) { showToast('Account deleted', 'ok'); loadUsers(); }
      else showToast('Delete failed', 'er');
    });
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
  var totalApps  = _apps.length;
  var totalHired = _apps.filter(function(a) { return a.status === 'hired'; }).length;
  var rateEl = document.getElementById('tl-rate');
  if (rateEl) rateEl.textContent = totalApps > 0 ? Math.round((totalHired / totalApps) * 100) + '% placement rate' : '—';

  // Compliance sidebar badge — expired + expiring ≤30 days among placed workers
  var compAlert = 0;
  _apps.filter(function(a) { return a.status === 'hired'; }).forEach(function(a) {
    var dates = [a.dbs_expiry_date, a.sia_expiry_date, a.rtw_expiry_date, a.manual_handling_cert].filter(Boolean);
    for (var di = 0; di < dates.length; di++) {
      var dv = daysUntil(dates[di]);
      if (dv !== null && dv <= 30) { compAlert++; break; }
    }
  });
  var compBadgeEl = document.getElementById('compliance-badge');
  if (compBadgeEl) {
    if (compAlert > 0) { compBadgeEl.textContent = compAlert; compBadgeEl.classList.add('show'); }
    else compBadgeEl.classList.remove('show');
  }
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
  var qEl = document.getElementById('contacts-search');
  var q = (qEl ? qEl.value : '').toLowerCase();
  var rows = document.querySelectorAll('#contacts-tbody tr:not(.empty-row)');
  var shown = 0;
  rows.forEach(function(row) {
    var text = row.textContent.toLowerCase();
    var match = !q || text.indexOf(q) !== -1;
    row.style.display = match ? '' : 'none';
    if (match) shown++;
  });
  // Show empty state if nothing matches
  var empty = document.querySelector('#contacts-tbody .no-results-row');
  if (shown === 0 && q) {
    if (!empty) {
      var tr = document.createElement('tr');
      tr.className = 'empty-row no-results-row';
      tr.innerHTML = '<td colspan="7" style="text-align:center;color:var(--muted);padding:24px;">No results for &ldquo;' + esc(q) + '&rdquo;</td>';
      document.getElementById('contacts-tbody').appendChild(tr);
    }
  } else if (empty) {
    empty.remove();
  }
}

function filterApps() {
  var qInput = document.getElementById('apps-search');
  var sInput = document.getElementById('apps-status-filter');
  var scInput = document.getElementById('apps-sector-filter');
  var q      = (qInput ? qInput.value : '').toLowerCase();
  var status = (sInput ? sInput.value : '').toLowerCase();
  var sector = (scInput ? scInput.value : '').toLowerCase();
  var rows   = document.querySelectorAll('#apps-tbody tr:not(.empty-row)');
  var shown  = 0;
  rows.forEach(function(row) {
    var text = row.textContent.toLowerCase();
    var matchQ      = !q      || text.indexOf(q)      !== -1;
    var matchStatus = !status || text.indexOf(status) !== -1;
    var matchSector = !sector || text.indexOf(sector) !== -1;
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
  var data, filename, headers, rows;
  if (type === 'contacts') {
    data     = _contacts || [];
    filename = 'covenant-crest-enquiries-' + new Date().toISOString().slice(0,10) + '.csv';
    headers  = ['Name','Email','Phone','Type','Message','Date','Status'];
    rows     = data.map(function(c) {
      return [c.name,c.email,c.phone||'',c.type||'',
              (c.message||'').split('"').join("'").split('\n').join(' '),
              c.date ? new Date(c.date).toLocaleDateString('en-GB') : '',
              c.status||''].map(function(v){ return '"'+v+'"'; }).join(',');
    });
  } else if (type === 'talent') {
    data     = _apps || [];
    filename = 'covenant-crest-talent-pool-' + new Date().toISOString().slice(0,10) + '.csv';
    headers  = ['First Name','Last Name','Email','Phone','Sector','Status','Last Applied'];
    rows     = data.map(function(a) {
      return [a.first_name||'',a.last_name||'',a.email||'',a.phone||'',a.sector||'',a.status||'',
              a.date ? new Date(a.date).toLocaleDateString('en-GB') : '']
              .map(function(v){ return '"'+v+'"'; }).join(',');
    });
  } else {
    data     = _apps || [];
    filename = 'covenant-crest-applications-' + new Date().toISOString().slice(0,10) + '.csv';
    headers  = ['First Name','Last Name','Email','Phone','Sector','Job Title','Availability','Notes','CV URL','Status','Date'];
    rows     = data.map(function(a) {
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
  var intApi     = document.getElementById('int-api');
  var intDb      = document.getElementById('int-db');
  var intHubspot = document.getElementById('int-hubspot');
  var intResend  = document.getElementById('int-resend');
  var intSso     = document.getElementById('int-sso');

  if (intApi)     intApi.textContent     = 'Checking…';
  if (intDb)      intDb.textContent      = 'Checking…';
  if (intHubspot) intHubspot.textContent = 'Checking…';
  if (intResend)  intResend.textContent  = 'Checking…';
  if (intSso)     intSso.textContent     = 'Checking…';
  
  fetch(API + '/health').then(function(r) { return r.json(); }).then(function(d) {
    if (intApi) {
      intApi.textContent = d.status === 'healthy' ? 'Connected' : 'Warning: ' + d.status;
      intApi.style.color = d.status === 'healthy' ? 'var(--success)' : 'var(--warn)';
    }
    if (intDb) {
      intDb.textContent = d.databaseConnected ? 'Connected' : 'Disconnected';
      intDb.style.color = d.databaseConnected ? 'var(--success)' : 'var(--danger)';
    }
    if (intHubspot) {
      intHubspot.textContent = d.hubspotConfigured ? 'Active (Syncing)' : 'Not Configured (CRM Sync Inactive)';
      intHubspot.style.color = d.hubspotConfigured ? 'var(--success)' : 'var(--danger)';
    }
    if (intResend) {
      intResend.textContent = d.resendConfigured ? 'Active (Delivery Active)' : 'Not Configured (Emails Blocked)';
      intResend.style.color = d.resendConfigured ? 'var(--success)' : 'var(--danger)';
    }
    if (intSso) {
      intSso.textContent = d.microsoftSSOConfigured ? 'Enabled (Azure SSO)' : 'Not Configured (Pwd Login Only)';
      intSso.style.color = d.microsoftSSOConfigured ? 'var(--success)' : 'var(--warn)';
    }
  }).catch(function() {
    var errorText = 'API Offline';
    var errorColor = 'var(--danger)';
    if (intApi) { intApi.textContent = 'Offline'; intApi.style.color = errorColor; }
    if (intDb) { intDb.textContent = errorText; intDb.style.color = errorColor; }
    if (intHubspot) { intHubspot.textContent = errorText; intHubspot.style.color = errorColor; }
    if (intResend) { intResend.textContent = errorText; intResend.style.color = errorColor; }
    if (intSso) { intSso.textContent = errorText; intSso.style.color = errorColor; }
    showApiOffline();
  });
}

// ── CONTACT NOTES ─────────────────────────────────────────────────
function saveContactNote(id) {
  var noteEl = document.getElementById('cm-admin-note');
  if (!noteEl) return;
  apiFetch('/contacts/' + id, { method: 'PUT', body: JSON.stringify({ adminNotes: noteEl.value.trim() }) }).then(function(data) {
    if (data && !data.error) showToast('Note saved', 'ok');
    else showToast('Failed to save note', 'er');
  });
}

// ── STAR RATING ───────────────────────────────────────────────────
function saveRating(id, rating) {
  apiFetch('/applications/' + id, { method: 'PUT', body: JSON.stringify({ rating: rating }) }).then(function(d) {
    if (d && !d.error) {
      for (var i = 0; i < _apps.length; i++) { if (_apps[i].id === id) { _apps[i].rating = rating; break; } }
      showToast('Rating saved', 'ok');
      var stars = document.querySelectorAll('#am-stars button');
      stars.forEach(function(s, idx) { s.style.color = idx < rating ? '#C9A84C' : '#ddd'; });
    }
  });
}

// ── CONFIRM MODAL ─────────────────────────────────────────────────
var _confirmCallback = null;
function openConfirm(msg, onConfirm) {
  _confirmCallback = onConfirm;
  var msgEl = document.getElementById('confirm-modal-msg');
  if (msgEl) msgEl.textContent = msg;
  document.getElementById('confirmModal').classList.add('open');
}

// ── DANGER ZONE ───────────────────────────────────────────────────
var _dangerResource = null;

function openDangerConfirm(resource) {
  if (!isSA) { showToast('Super Admin only', 'er'); return; }
  _dangerResource = resource;
  var label = resource === 'contacts' ? 'all enquiries' : 'all job listings';
  var titleEl = document.getElementById('danger-modal-title');
  var descEl  = document.getElementById('danger-modal-desc');
  var inputEl = document.getElementById('danger-confirm-input');
  if (titleEl) titleEl.textContent = resource === 'contacts' ? 'Delete All Enquiries' : 'Delete All Jobs';
  if (descEl)  descEl.textContent  = 'This will permanently delete ' + label + '. This action cannot be undone.';
  if (inputEl) inputEl.value = '';
  document.getElementById('dangerModal').classList.add('open');
}

function apiClearAll(resource) {
  if (!isSA) { showToast('Super Admin only', 'er'); return; }
  closeModal('dangerModal');
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
  window.location.href = '/login';
}

// ── SESSION IDLE TIMEOUT ──────────────────────────────────────────
var _idleWarnTimer = null, _idleLogoutTimer = null;
function resetIdleTimers() {
  clearTimeout(_idleWarnTimer);
  clearTimeout(_idleLogoutTimer);
  _idleWarnTimer  = setTimeout(function() { document.getElementById('sessionModal').classList.add('open'); }, 25 * 60 * 1000);
  _idleLogoutTimer = setTimeout(function() { closeModal('sessionModal'); logout(); }, 30 * 60 * 1000);
}
['mousemove', 'keypress', 'click', 'touchstart'].forEach(function(evt) {
  document.addEventListener(evt, resetIdleTimers, { passive: true });
});
resetIdleTimers();

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
window.openDangerConfirm = openDangerConfirm;
window.openConfirm = openConfirm;
window.saveContactNote = saveContactNote;
window.saveRating = saveRating;
window._fallbackCopy = _fallbackCopy;
window.resetIdleTimers = resetIdleTimers;
window.filterContacts = filterContacts;
window.filterApps = filterApps;
window.renderTalentPool = renderTalentPool;
window.renderPlanner = renderPlanner;
window.renderCompliance = renderCompliance;
window.saveCompliance = saveCompliance;
window.daysUntil = daysUntil;
window.getDocStatus = getDocStatus;
window.loadSecurityLogs = loadSecurityLogs;
window.logout = logout;
window.apiClearAll = apiClearAll;
window.loadUsers = loadUsers;
window.checkIntegrations = checkIntegrations;
window.loadDashboard = loadDashboard;
window.loadJobs = loadJobs;
window.loadContacts = loadContacts;
window.loadApplications = loadApplications;
