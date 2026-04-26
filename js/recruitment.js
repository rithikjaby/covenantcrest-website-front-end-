'use strict';

/**
 * Covenant Crest Group - Recruitment Logic
 */

var JOBS = [];  // populated from /api/jobs on load
var sectorLabel = { care: 'Healthcare', security: 'Security', warehouse: 'Warehouse', construction: 'Construction' };
var activeSector = '';

function loadJobsFromAPI() {
    renderSkeleton();
    if (window.CCA && window.CCA.jobs) {
        window.CCA.jobs.list()
            .then(function(data) {
                if (Array.isArray(data)) {
                    JOBS = data;
                }
                renderJobs();
            })
            .catch(function() {
                JOBS = [];
                renderJobs();
            });
    } else {
        // Fallback to direct fetch if CCA not loaded
        fetch('/api/jobs')
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (Array.isArray(data)) JOBS = data;
                renderJobs();
            })
            .catch(function() {
                JOBS = [];
                renderJobs();
            });
    }
}

function renderSkeleton() {
    var container = document.getElementById('jobs-container');
    if (!container) return;
    var cards = '';
    for (var i = 0; i < 6; i++) {
        cards += '<div class="skel-card">' +
            '<div class="skel-i sk-t1"></div>' +
            '<div class="skel-i sk-t2"></div>' +
            '<div class="skel-i sk-t3" style="margin-top:auto;"></div>' +
            '<div class="skel-i sk-t4"></div>' +
            '</div>';
    }
    container.innerHTML = '<div class="jobs-grid">' + cards + '</div>';
    container.classList.add('vs'); // Ensure skeleton is visible immediately
}

function esc(s) { return s ? String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''; }

function renderJobs() {
    var search = (document.getElementById('jf-search')?.value || '').toLowerCase();
    var sectorInput = document.getElementById('jf-sector');
    var sector = sectorInput ? (sectorInput.value || activeSector) : activeSector;
    var type = document.getElementById('jf-type')?.value || '';

    var filtered = JOBS.filter(function(j) {
        var mSec = !sector || j.sector === sector;
        var mType = !type || j.type === type;
        var mSrch = !search || (j.title + ' ' + j.location + ' ' + (j.desc || '')).toLowerCase().includes(search);
        return mSec && mType && mSrch;
    });

    var container = document.getElementById('jobs-container');
    if (!container) return;

    if (!filtered.length) {
        container.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--muted);"><p style="font-size:13px;">No matching jobs found. <a href="#apply" style="color:var(--gold);">Apply for a role</a> and we\'ll contact you when a suitable role becomes available.</p></div>';
        return;
    }

    container.innerHTML = '<div class="jobs-grid">' + filtered.map(function(j) {
        return '<a href="/job.html?id=' + encodeURIComponent(j.id) + '" class="job-card" style="display:block;text-decoration:none;color:inherit;">' +
            '<div class="jc-sector">' + (sectorLabel[j.sector] || j.sector) + '</div>' +
            '<div class="jc-title">' + esc(j.title) + '</div>' +
            '<div class="jc-meta">' +
            (j.location ? '<span class="jc-tag">&#x1F4CD;&nbsp;' + esc(j.location) + '</span>' : '') +
            (j.type ? '<span class="jc-tag">' + esc(j.type) + '</span>' : '') +
            '</div>' +
            '<div class="jc-pay">' + esc(j.pay) + '</div>' +
            '<p class="jc-desc" style="color:var(--muted);">' + esc((j.desc || '').substring(0, 110)) + '&hellip;</p>' +
            '<div class="jc-btn" style="margin-top:14px;display:inline-block;">View &amp; Apply &#8594;</div>' +
            '</a>';
    }).join('') + '</div>';

    // Force reveal now that jobs are rendered
    setTimeout(function() {
        container.classList.add('vs');
    }, 50);
}

function filterSector(sector, btn) {
    activeSector = sector;
    document.querySelectorAll('.sbt').forEach(function(b) { b.classList.remove('act'); });
    if (btn) {
        btn.classList.add('act');
    } else {
        var map = { '': 'sbt-all', 'care': 'sbt-care', 'security': 'sbt-security', 'warehouse': 'sbt-warehouse', 'construction': 'sbt-construction' };
        var el = document.getElementById(map[sector]);
        if (el) el.classList.add('act');
    }
    var sectorInput = document.getElementById('jf-sector');
    if (sectorInput) sectorInput.value = sector;
    renderJobs();
    var liveJobsSec = document.getElementById('live-jobs');
    if (liveJobsSec) liveJobsSec.scrollIntoView({ behavior: 'smooth' });
}

// ── CV FILE HANDLING ──────────────────────────
var _cvBase64 = null;
var _cvFileName = null;

function handleCVSelect(input) {
    var file = input.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
        alert('File is too large. Maximum size is 5 MB.');
        input.value = '';
        return;
    }
    _cvFileName = file.name;
    var label = document.getElementById('cv-label');
    if (label) {
        label.textContent = '📎 ' + file.name;
        label.style.color = 'rgba(255,255,255,.85)';
    }
    var clearBtn = document.getElementById('cv-clear-btn');
    if (clearBtn) clearBtn.style.display = 'inline';

    var zone = document.getElementById('cv-upload-zone');
    if (zone) {
        zone.style.borderColor = 'var(--success)';
        zone.style.background = 'rgba(29, 158, 117, 0.05)';
    }

    var reader = new FileReader();
    reader.onload = function(e) {
        _cvBase64 = e.target.result.split(',')[1];
    };
    reader.readAsDataURL(file);
}

function clearCV(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    _cvBase64 = null;
    _cvFileName = null;
    var input = document.getElementById('cv-file-input');
    if (input) input.value = '';
    var label = document.getElementById('cv-label');
    if (label) {
        label.textContent = 'Click to choose file or drag & drop here';
        label.style.color = 'rgba(255,255,255,.55)';
    }
    var clearBtn = document.getElementById('cv-clear-btn');
    if (clearBtn) clearBtn.style.display = 'none';

    var zone = document.getElementById('cv-upload-zone');
    if (zone) {
        zone.style.borderColor = 'rgba(201,168,76,.35)';
        zone.style.background = 'rgba(255,255,255,.03)';
    }

    var hiddenUrl = document.getElementById('cv-url-hidden');
    if (hiddenUrl) hiddenUrl.value = '';
    var progress = document.getElementById('cv-progress');
    if (progress) progress.style.display = 'none';
}

// ── FORM SUBMISSION — Netlify + API backend ──
function handleFormWithAPI(e, formName, bannerId) {
    e.preventDefault();
    var form = e.target;
    var btn = document.getElementById('apply-submit-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Submitting…'; }

    /* Step 1: always submit to Netlify Forms (backup + email notification) */
    var netlifyData = new URLSearchParams(new FormData(form)).toString();
    fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: netlifyData
    }).catch(function() { /* Netlify submit failed silently */ });

    /* Step 2: build API payload */
    var fd = new FormData(form);
    var payload = {
        first_name: fd.get('first_name') || '',
        last_name: fd.get('last_name') || '',
        email: fd.get('email') || '',
        phone: fd.get('phone') || '',
        sector: fd.get('sector') || '',
        availability: fd.get('availability') || '',
        notes: fd.get('notes') || '',
        job_title: fd.get('job_title') || '',
        job_id: fd.get('job_id') || '',
    };

    function submitToAPI() {
        fetch('/api/applications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            var banner = document.getElementById(bannerId);
            if (banner) banner.classList.add('show');
            form.reset();
            clearCV({ stopPropagation: function() {} });
            if (btn) { btn.disabled = false; btn.textContent = 'Submit Application →'; }
        })
        .catch(function() {
            var banner = document.getElementById(bannerId);
            if (banner) banner.classList.add('show');
            form.reset();
            if (btn) { btn.disabled = false; btn.textContent = 'Submit Application →'; }
        });
    }

    if (_cvBase64) {
        var prog = document.getElementById('cv-progress');
        var bar = document.getElementById('cv-bar');
        var stat = document.getElementById('cv-status');
        if (prog) { prog.style.display = 'block'; }
        if (bar) { bar.style.width = '60%'; }
        if (stat) { stat.textContent = 'Attaching CV…'; }
        
        payload.cvBase64 = _cvBase64;
        payload.cvFileName = _cvFileName || 'cv';
        
        if (bar) { bar.style.width = '100%'; }
        if (stat) { stat.textContent = 'CV attached ✓'; }
        submitToAPI();
    } else {
        submitToAPI();
    }
}

document.addEventListener('DOMContentLoaded', function() {
    loadJobsFromAPI();

    // Contextual Apply - pre-fill form if coming from job.html
    var params = new URLSearchParams(window.location.search);
    var jobTitle = params.get('job_title');
    var jobSector = params.get('sector');
    var jobId = params.get('job_id');
    if (jobTitle) {
        var notesEl = document.querySelector('textarea[name="notes"]');
        if (notesEl) notesEl.value = 'Applying for: ' + jobTitle;
        var hiddenTitle = document.getElementById('hidden-job-title');
        if (hiddenTitle) hiddenTitle.value = jobTitle;
    }
    if (jobId) {
        var hiddenId = document.getElementById('hidden-job-id');
        if (hiddenId) hiddenId.value = jobId;
    }
    if (jobSector) {
        var sectorEl = document.querySelector('select[name="sector"]');
        if (sectorEl) {
            sectorEl.value = jobSector;
            sectorEl.dispatchEvent(new Event('change'));
        }
    }

    // ── Event Listeners ──────────────────────────
    // Sector Buttons
    document.querySelectorAll('.sbt').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var sector = this.getAttribute('data-sector');
            filterSector(sector, this);
        });
    });

    // CV Upload Zone
    var cvZone = document.getElementById('cv-upload-zone');
    if (cvZone) {
        cvZone.addEventListener('click', function() {
            var input = document.getElementById('cv-file-input');
            if (input) input.click();
        });
    }

    // CV Input Change
    var cvInput = document.getElementById('cv-file-input');
    if (cvInput) {
        cvInput.addEventListener('change', function() {
            handleCVSelect(this);
        });
    }

    // Clear CV Button
    var cvClearBtn = document.getElementById('cv-clear-btn');
    if (cvClearBtn) {
        cvClearBtn.addEventListener('click', function(e) {
            clearCV(e);
        });
    }

    // Modal Close
    var modalClose = document.querySelector('.modal-close');
    if (modalClose) {
        modalClose.addEventListener('click', function() {
            var modal = document.getElementById('jobModal');
            if (modal) modal.classList.remove('open');
        });
    }

    // Modal Apply Button
    var mApplyBtn = document.querySelector('.m-apply-btn');
    if (mApplyBtn) {
        mApplyBtn.addEventListener('click', function() {
            applyForJob();
        });
    }

    // Sector and Type selects
    var sectorSelect = document.getElementById('jf-sector');
    if (sectorSelect) {
        sectorSelect.addEventListener('change', function() {
            renderJobs();
        });
    }
    var typeSelect = document.getElementById('jf-type');
    if (typeSelect) {
        typeSelect.addEventListener('change', function() {
            renderJobs();
        });
    }

    // SC-CTA buttons
    document.querySelectorAll('.sc-cta').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var sector = this.getAttribute('data-sector');
            filterSector(sector, null);
        });
    });

    // Candidate Apply Form
    var applyForm = document.getElementById('candidate-apply-form');
    if (applyForm) {
        applyForm.addEventListener('submit', function(e) {
            handleFormWithAPI(e, 'candidate-apply', 'ok-apply');
        });
    }

    // Search Input
    var searchInput = document.getElementById('jf-search');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            renderJobs();
        });
    }
});

function applyForJob() {
    var modal = document.getElementById('jobModal');
    if (modal) modal.classList.remove('open');
    var applyForm = document.getElementById('apply-form');
    if (applyForm) applyForm.scrollIntoView({ behavior: 'smooth' });
}

// Attach to window for now
window.filterSector = filterSector;
window.handleCVSelect = handleCVSelect;
window.clearCV = clearCV;
window.handleFormWithAPI = handleFormWithAPI;
window.renderJobs = renderJobs;
window.applyForJob = applyForJob;
