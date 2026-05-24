'use strict';

/**
 * Covenant Crest Group - Recruitment Logic
 */

var JOBS = [];  // populated from /api/jobs on load
var sectorLabel = { care: 'Healthcare', security: 'Security', warehouse: 'Warehouse', construction: 'Construction' };
var activeSector = '';

// ── Registration Toggle Logic ───────────────────────────────
function toggleReg(shouldOpen) {
    var regBtn = document.getElementById('toggleRegistration');
    var regWrap = document.getElementById('regFormWrap');
    if (!regBtn || !regWrap) return;
    
    var isOpen = regWrap.classList.contains('open');
    if (shouldOpen === true && isOpen) return; // already open
    
    var nextOpen = (shouldOpen === undefined) ? !isOpen : shouldOpen;
    
    if (nextOpen) {
        regWrap.classList.add('open');
    } else {
        regWrap.classList.remove('open');
    }
    
    regBtn.setAttribute('aria-expanded', nextOpen);
    regBtn.innerHTML = nextOpen ? 'Close Registration ✕' : 'Register Your Details &rarr;';
    
    if (nextOpen) {
        setTimeout(function() {
            regWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
    }
}

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
        cards += '<div class="skel-card" style="padding:28px; border-radius:16px;">' +
            '<div class="skel-i sk-t1" style="width:40%; height:10px; margin-bottom:12px;"></div>' +
            '<div class="skel-i sk-t2" style="width:80%; height:28px; margin-bottom:16px;"></div>' +
            '<div class="skel-i sk-t3" style="width:100%; height:80px; margin-bottom:20px;"></div>' +
            '<div class="skel-i sk-t4" style="width:30%; height:14px;"></div>' +
            '</div>';
    }
    container.innerHTML = '<div class="jobs-grid">' + cards + '</div>';
    container.classList.add('vs'); // Ensure skeleton is visible immediately
}

function esc(s) { return s ? String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''; }
function stripHTML(s) { return s ? String(s).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim() : ''; }

function renderJobs() {
    var searchEl = document.getElementById('jf-search');
    var search = (searchEl ? searchEl.value : '').toLowerCase();
    var sectorInput = document.getElementById('jf-sector');
    var sector = sectorInput ? (sectorInput.value || activeSector) : activeSector;
    var typeEl = document.getElementById('jf-type');
    var type = typeEl ? (typeEl.value || '') : '';

    // Update Headings based on sector
    var titleEl = document.getElementById('live-jobs-title');
    var leadEl = document.getElementById('live-jobs-lead');
    if (titleEl) {
        if (sector) titleEl.innerHTML = 'Live <em>' + (sectorLabel[sector] || sector) + '</em> Jobs';
        else titleEl.innerHTML = '<em>Live Jobs</em> Available Now';
    }
    if (leadEl) {
        if (sector) leadEl.textContent = 'Specialist ' + (sectorLabel[sector] || sector) + ' roles currently being filled across the UK.';
        else leadEl.textContent = 'All roles actively being filled. Apply via the form below or call 07346 809846 for immediate availability.';
    }

    // Active Filter Bar
    var filterBar = document.getElementById('active-filters');
    if (filterBar) {
        var chips = '';
        if (sector) chips += '<span class="filter-chip">' + esc(sectorLabel[sector] || sector) + ' <button onclick="resetSector()">✕</button></span>';
        if (type) chips += '<span class="filter-chip">' + esc(type.replace('-',' ')) + ' <button onclick="resetType()">✕</button></span>';
        if (search) chips += '<span class="filter-chip">"' + esc(search) + '" <button onclick="resetSearch()">✕</button></span>';
        
        if (chips) {
            filterBar.innerHTML = chips + '<button onclick="resetAllFilters()" class="clear-all-btn">Clear All</button>';
        } else {
            filterBar.innerHTML = '';
        }
    }

    var filtered = JOBS.filter(function(j) {
        var mSec = !sector || j.sector === sector;
        var mType = !type || j.type === type;
        var mSrch = !search || (j.title + ' ' + j.location + ' ' + (j.desc || '')).toLowerCase().includes(search);
        return mSec && mType && mSrch;
    });

    var container = document.getElementById('jobs-container');
    if (!container) return;

    if (!filtered.length) {
        container.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--muted);"><p style="font-size:13px;">No matching jobs found in this category. <br><br> <button onclick="resetAllFilters()" class="jc-btn" style="color:var(--gold); font-size:12px;">View All Available Jobs &#8594;</button></p></div>';
        return;
    }

    var jobsHtml = '<div class="jobs-grid">' + filtered.map(function(j) {
        return '<a href="/job?id=' + encodeURIComponent(j.id) + '" class="job-card">' +
            '<div class="jc-sector">' + esc(sectorLabel[j.sector] || j.sector) + '</div>' +
            '<div class="jc-title">' + esc(j.title) + '</div>' +
            '<div class="jc-meta">' +
            (j.location ? '<span class="jc-tag">📍 ' + esc(j.location) + '</span>' : '') +
            (j.type ? '<span class="jc-tag">🕒 ' + esc(j.type.replace('-',' ')) + '</span>' : '') +
            '</div>' +
            '<div class="jc-pay">' + esc(j.pay) + '</div>' +
            '<p class="jc-desc">' + esc(stripHTML(j.desc || '').substring(0, 120)) + '&hellip;</p>' +
            '<div class="jc-btn" style="margin-top:auto;">View &amp; Apply</div>' +
            '</a>';
    }).join('') + '</div>';

    // Suggestion for other sectors if filtering
    if (sector && filtered.length > 0) {
        var otherCount = JOBS.filter(function(j){ return j.sector !== sector; }).length;
        if (otherCount > 0) {
            jobsHtml += '<div style="margin-top:32px; text-align:center; padding:24px; border-top:1px solid var(--border);">' +
                '<p style="font-size:12px; color:var(--muted); margin-bottom:12px;">Interested in other sectors? We also have ' + otherCount + ' roles in Healthcare, Security, and more.</p>' +
                '<button onclick="resetAllFilters()" class="btn-ghost" style="border-color:var(--gold); color:var(--gold); font-size:11px; padding:8px 20px;">View All ' + JOBS.length + ' Jobs</button>' +
            '</div>';
        }
    }

    container.innerHTML = jobsHtml;

    // Force reveal now that jobs are rendered
    setTimeout(function() {
        container.classList.add('vs');
    }, 50);
}

function resetSector() {
    var sInput = document.getElementById('jf-sector');
    if (sInput) sInput.value = '';
    activeSector = '';
    document.querySelectorAll('.sbt').forEach(function(b){ b.classList.remove('act'); });
    var sbtAll = document.getElementById('sbt-all');
    if (sbtAll) sbtAll.classList.add('act');
    renderJobs();
}

function resetType() {
    var tInput = document.getElementById('jf-type');
    if (tInput) tInput.value = '';
    renderJobs();
}

function resetSearch() {
    var srch = document.getElementById('jf-search');
    if (srch) srch.value = '';
    renderJobs();
}

function resetAllFilters() {
    activeSector = '';
    var sInput = document.getElementById('jf-sector');
    var tInput = document.getElementById('jf-type');
    var srch = document.getElementById('jf-search');
    if (sInput) sInput.value = '';
    if (tInput) tInput.value = '';
    if (srch) srch.value = '';
    document.querySelectorAll('.sbt').forEach(function(b){ b.classList.remove('act'); });
    var sbtAllReset = document.getElementById('sbt-all');
    if (sbtAllReset) sbtAllReset.classList.add('act');
    renderJobs();
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
var _cvReadPromise = null;

function handleCVSelect(input) {
    var file = input.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
        showFormError(document.getElementById('cv-upload-zone') || input, 'File is too large. Max 5MB allowed.');
        input.value = '';
        return;
    }

    _cvFileName = file.name;
    var clearBtn = document.getElementById('cv-clear-btn');
    if (clearBtn) clearBtn.style.display = 'inline';

    var zone = document.getElementById('cv-upload-zone');
    var progress = document.getElementById('cv-progress');
    if (zone) {
        zone.style.borderColor = 'var(--gold)';
        zone.style.background = 'rgba(201, 168, 76, 0.05)';
    }
    if (progress) {
        progress.style.display = 'block';
        progress.textContent = 'Reading file...';
    }

    _cvReadPromise = new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.onload = function(e) {
            _cvBase64 = e.target.result.split(',')[1];
            if (zone) {
                zone.style.borderColor = 'var(--success)';
                zone.style.background = 'rgba(29, 158, 117, 0.05)';
            }
            if (progress) progress.textContent = 'Ready: ' + _cvFileName;
            resolve(_cvBase64);
        };
        reader.onerror = function() {
            showFormError(document.getElementById('cv-upload-zone') || input, 'Failed to read CV file.');
            reject();
        };
        reader.readAsDataURL(file);
    });
}

function clearCV(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    _cvBase64 = null;
    _cvFileName = null;
    _cvReadPromise = null;
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

// ── DYNAMIC COMPLIANCE FIELDS ────────────────
function adjustComplianceFields(sector) {
    var wrap = document.getElementById('dynamic-certs-wrap');
    var grid = document.getElementById('dynamic-certs-grid');
    var inputsWrap = document.getElementById('dynamic-compliance-inputs-wrap');
    if (!grid || !inputsWrap || !wrap) return;
    
    var checkboxes = '';
    var extraFields = '';
    
    var normalizedSector = (sector || 'general').toLowerCase();
    
    if (normalizedSector.indexOf('care') !== -1 || normalizedSector.indexOf('health') !== -1) {
        wrap.style.display = 'block';
        checkboxes = 
            '<label style="display:flex;align-items:center;gap:8px;font-size:12px;color:rgba(255,255,255,0.6);cursor:pointer;margin-bottom:8px;"><input type="checkbox" name="certs" value="Enhanced DBS" checked style="accent-color:var(--gold);"> <span>Enhanced DBS</span></label>' +
            '<label style="display:flex;align-items:center;gap:8px;font-size:12px;color:rgba(255,255,255,0.6);cursor:pointer;margin-bottom:8px;"><input type="checkbox" name="certs" value="NMC Pin Vetted" style="accent-color:var(--gold);"> <span>NMC Pin Vetted</span></label>' +
            '<label style="display:flex;align-items:center;gap:8px;font-size:12px;color:rgba(255,255,255,0.6);cursor:pointer;margin-bottom:8px;"><input type="checkbox" name="certs" value="Care Certificate" style="accent-color:var(--gold);"> <span>Care Certificate</span></label>' +
            '<label style="display:flex;align-items:center;gap:8px;font-size:12px;color:rgba(255,255,255,0.6);cursor:pointer;margin-bottom:8px;"><input type="checkbox" name="certs" value="Moving & Handling" style="accent-color:var(--gold);"> <span>Moving & Handling</span></label>' +
            '<label style="display:flex;align-items:center;gap:8px;font-size:12px;color:rgba(255,255,255,0.6);cursor:pointer;margin-bottom:8px;"><input type="checkbox" name="certs" value="Safe Meds Cert" style="accent-color:var(--gold);"> <span>Safe Meds Cert</span></label>' +
            '<label style="display:flex;align-items:center;gap:8px;font-size:12px;color:rgba(255,255,255,0.6);cursor:pointer;margin-bottom:8px;"><input type="checkbox" name="certs" value="Right to Work" checked style="accent-color:var(--gold);"> <span>Right to Work in UK</span></label>';
            
        extraFields = 
            '<div class="dk-g2">' +
            '  <div class="dk-fg">' +
            '    <label class="dk-label">DBS Certificate Number *</label>' +
            '    <input type="text" class="dk-input" id="compliance_dbs_number" placeholder="e.g. 001234567890" required>' +
            '  </div>' +
            '  <div class="dk-fg">' +
            '    <label class="dk-label">NMC Pin (if applicable)</label>' +
            '    <input type="text" class="dk-input" id="compliance_nmc_pin" placeholder="e.g. 74A1234E">' +
            '  </div>' +
            '</div>';
    } else if (normalizedSector.indexOf('security') !== -1) {
        wrap.style.display = 'block';
        checkboxes = 
            '<label style="display:flex;align-items:center;gap:8px;font-size:12px;color:rgba(255,255,255,0.6);cursor:pointer;margin-bottom:8px;"><input type="checkbox" name="certs" value="SIA Door Supervisor" checked style="accent-color:var(--gold);"> <span>SIA Door Supervisor</span></label>' +
            '<label style="display:flex;align-items:center;gap:8px;font-size:12px;color:rgba(255,255,255,0.6);cursor:pointer;margin-bottom:8px;"><input type="checkbox" name="certs" value="SIA CCTV Licence" style="accent-color:var(--gold);"> <span>SIA CCTV Licence</span></label>' +
            '<label style="display:flex;align-items:center;gap:8px;font-size:12px;color:rgba(255,255,255,0.6);cursor:pointer;margin-bottom:8px;"><input type="checkbox" name="certs" value="BS 7858 Vetted" style="accent-color:var(--gold);"> <span>BS 7858 Vetted</span></label>' +
            '<label style="display:flex;align-items:center;gap:8px;font-size:12px;color:rgba(255,255,255,0.6);cursor:pointer;margin-bottom:8px;"><input type="checkbox" name="certs" value="First Aid at Work" style="accent-color:var(--gold);"> <span>First Aid at Work</span></label>' +
            '<label style="display:flex;align-items:center;gap:8px;font-size:12px;color:rgba(255,255,255,0.6);cursor:pointer;margin-bottom:8px;"><input type="checkbox" name="certs" value="Right to Work" checked style="accent-color:var(--gold);"> <span>Right to Work in UK</span></label>';
            
        extraFields = 
            '<div class="dk-g2">' +
            '  <div class="dk-fg">' +
            '    <label class="dk-label">SIA Badge Number *</label>' +
            '    <input type="text" class="dk-input" id="compliance_sia_number" placeholder="e.g. 1023456789012345" required>' +
            '  </div>' +
            '  <div class="dk-fg">' +
            '    <label class="dk-label">SIA Badge Expiry *</label>' +
            '    <input type="text" class="dk-input" id="compliance_sia_expiry" placeholder="e.g. MM/YYYY" required>' +
            '  </div>' +
            '</div>';
    } else if (normalizedSector.indexOf('hospitality') !== -1 || normalizedSector.indexOf('event') !== -1) {
        wrap.style.display = 'block';
        checkboxes = 
            '<label style="display:flex;align-items:center;gap:8px;font-size:12px;color:rgba(255,255,255,0.6);cursor:pointer;margin-bottom:8px;"><input type="checkbox" name="certs" value="Food Hygiene Level 2" checked style="accent-color:var(--gold);"> <span>Food Hygiene Lvl 2</span></label>' +
            '<label style="display:flex;align-items:center;gap:8px;font-size:12px;color:rgba(255,255,255,0.6);cursor:pointer;margin-bottom:8px;"><input type="checkbox" name="certs" value="FOH Trained" style="accent-color:var(--gold);"> <span>FOH Trained</span></label>' +
            '<label style="display:flex;align-items:center;gap:8px;font-size:12px;color:rgba(255,255,255,0.6);cursor:pointer;margin-bottom:8px;"><input type="checkbox" name="certs" value="Chef Vetted" style="accent-color:var(--gold);"> <span>Chef Certification</span></label>' +
            '<label style="display:flex;align-items:center;gap:8px;font-size:12px;color:rgba(255,255,255,0.6);cursor:pointer;margin-bottom:8px;"><input type="checkbox" name="certs" value="Right to Work" checked style="accent-color:var(--gold);"> <span>Right to Work in UK</span></label>';
            
        extraFields = 
            '<div class="dk-fg">' +
            '  <label class="dk-label">Food Hygiene Issuer / Date</label>' +
            '  <input type="text" class="dk-input" id="compliance_hygiene_cert" placeholder="e.g. City & Guilds, 2025">' +
            '</div>';
    } else if (normalizedSector.indexOf('warehouse') !== -1 || normalizedSector.indexOf('logistics') !== -1 || normalizedSector.indexOf('haulage') !== -1) {
        wrap.style.display = 'block';
        checkboxes = 
            '<label style="display:flex;align-items:center;gap:8px;font-size:12px;color:rgba(255,255,255,0.6);cursor:pointer;margin-bottom:8px;"><input type="checkbox" name="certs" value="HGV Class 1" style="accent-color:var(--gold);"> <span>HGV Class 1</span></label>' +
            '<label style="display:flex;align-items:center;gap:8px;font-size:12px;color:rgba(255,255,255,0.6);cursor:pointer;margin-bottom:8px;"><input type="checkbox" name="certs" value="HGV Class 2" style="accent-color:var(--gold);"> <span>HGV Class 2</span></label>' +
            '<label style="display:flex;align-items:center;gap:8px;font-size:12px;color:rgba(255,255,255,0.6);cursor:pointer;margin-bottom:8px;"><input type="checkbox" name="certs" value="CPC Vetted" style="accent-color:var(--gold);"> <span>CPC Driver Card</span></label>' +
            '<label style="display:flex;align-items:center;gap:8px;font-size:12px;color:rgba(255,255,255,0.6);cursor:pointer;margin-bottom:8px;"><input type="checkbox" name="certs" value="Forklift Certificate" style="accent-color:var(--gold);"> <span>FLT Certificate</span></label>' +
            '<label style="display:flex;align-items:center;gap:8px;font-size:12px;color:rgba(255,255,255,0.6);cursor:pointer;margin-bottom:8px;"><input type="checkbox" name="certs" value="Right to Work" checked style="accent-color:var(--gold);"> <span>Right to Work in UK</span></label>';
            
        extraFields = 
            '<div class="dk-fg">' +
            '  <label class="dk-label">HGV Licence or FLT Badge Number</label>' +
            '  <input type="text" class="dk-input" id="compliance_hgv_number" placeholder="e.g. HGV1234567">' +
            '</div>';
    } else if (normalizedSector.indexOf('construction') !== -1 || normalizedSector.indexOf('trade') !== -1) {
        wrap.style.display = 'block';
        checkboxes = 
            '<label style="display:flex;align-items:center;gap:8px;font-size:12px;color:rgba(255,255,255,0.6);cursor:pointer;margin-bottom:8px;"><input type="checkbox" name="certs" value="CSCS Card Vetted" checked style="accent-color:var(--gold);"> <span>CSCS Card Vetted</span></label>' +
            '<label style="display:flex;align-items:center;gap:8px;font-size:12px;color:rgba(255,255,255,0.6);cursor:pointer;margin-bottom:8px;"><input type="checkbox" name="certs" value="PPE Compliant" style="accent-color:var(--gold);"> <span>PPE Compliant</span></label>' +
            '<label style="display:flex;align-items:center;gap:8px;font-size:12px;color:rgba(255,255,255,0.6);cursor:pointer;margin-bottom:8px;"><input type="checkbox" name="certs" value="Trade Certs" style="accent-color:var(--gold);"> <span>Trade Certificates</span></label>' +
            '<label style="display:flex;align-items:center;gap:8px;font-size:12px;color:rgba(255,255,255,0.6);cursor:pointer;margin-bottom:8px;"><input type="checkbox" name="certs" value="Right to Work" checked style="accent-color:var(--gold);"> <span>Right to Work in UK</span></label>';
            
        extraFields = 
            '<div class="dk-fg">' +
            '  <label class="dk-label">CSCS Registration Number *</label>' +
            '  <input type="text" class="dk-input" id="compliance_cscs_number" placeholder="e.g. 09876543" required>' +
            '</div>';
    } else {
        wrap.style.display = 'none';
        checkboxes = '';
        extraFields = '';
    }
    
    grid.innerHTML = checkboxes;
    if (extraFields) {
        inputsWrap.innerHTML = extraFields;
        inputsWrap.style.display = 'block';
    } else {
        inputsWrap.innerHTML = '';
        inputsWrap.style.display = 'none';
    }
}

// ── FORM SUBMISSION — Netlify + API backend ──
function handleFormWithAPI(e, formName, bannerId) {
    e.preventDefault();
    var form = e.target;
    var btn = form.querySelector('button[type="submit"]');
    var originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'Sending...';

    // Proceed logic
    var proceed = function() {
        var payload = {};
        new FormData(form).forEach(function(v, k) { 
            if (k !== 'cv-file') {
                // Special handling for checkboxes (veteran status)
                if (k === 'is_veteran') {
                    payload[k] = (v === 'yes' || v === 'on') ? 'yes' : 'no';
                } else {
                    payload[k] = v;
                }
            }
        });

        // Collect dynamic certifications & extra fields
        var certs = [];
        form.querySelectorAll('input[name="certs"]:checked').forEach(function(el) { certs.push(el.value); });
        
        var extraDetails = "";
        var dbsNum = document.getElementById('compliance_dbs_number');
        var nmcPin = document.getElementById('compliance_nmc_pin');
        var siaNum = document.getElementById('compliance_sia_number');
        var siaExp = document.getElementById('compliance_sia_expiry');
        var hygiene = document.getElementById('compliance_hygiene_cert');
        var hgvNum = document.getElementById('compliance_hgv_number');
        var cscsNum = document.getElementById('compliance_cscs_number');
        
        if (dbsNum && dbsNum.value) extraDetails += "\nDBS Number: " + dbsNum.value;
        if (nmcPin && nmcPin.value) extraDetails += "\nNMC Pin: " + nmcPin.value;
        if (siaNum && siaNum.value) extraDetails += "\nSIA Number: " + siaNum.value;
        if (siaExp && siaExp.value) extraDetails += "\nSIA Expiry: " + siaExp.value;
        if (hygiene && hygiene.value) extraDetails += "\nFood Hygiene Details: " + hygiene.value;
        if (hgvNum && hgvNum.value) extraDetails += "\nHGV/FLT Licence Details: " + hgvNum.value;
        if (cscsNum && cscsNum.value) extraDetails += "\nCSCS Number: " + cscsNum.value;

        // Build composite notes field
        var complianceText = "";
        if (certs.length > 0) complianceText += "Certs: " + certs.join(', ') + "\n";
        if (extraDetails) complianceText += extraDetails.trim() + "\n";

        if (complianceText) {
            payload.notes = complianceText + "\n" + (payload.notes || "");
        }
        
        payload.cvBase64 = _cvBase64;
        payload.cvFileName = _cvFileName || (payload.first_name + '_' + payload.last_name + '_CV.pdf');
        
        // Ensure sector/job info is present
        var urlParams = new URLSearchParams(window.location.search);
        if (!payload.job_id) payload.job_id = urlParams.get('id') || urlParams.get('job_id');
        if (!payload.job_title) payload.job_title = "Talent Pool Registration - " + (payload.sector || "General");

        fetch('/api/applications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(function(r) { return r.json(); })
        .then(function(res) {
            if (res.error) throw new Error(res.error);
            var banner = document.getElementById(bannerId);
            if (banner) banner.classList.add('show');
            form.reset();
            clearCV();
            // Reset compliance fields
            var wrap = document.getElementById('dynamic-certs-wrap');
            var grid = document.getElementById('dynamic-certs-grid');
            var inputsWrap = document.getElementById('dynamic-compliance-inputs-wrap');
            if (wrap) wrap.style.display = 'none';
            if (grid) grid.innerHTML = '';
            if (inputsWrap) { inputsWrap.innerHTML = ''; inputsWrap.style.display = 'none'; }
        })
        .catch(function(err) {
            console.error('API Error:', err);
            showFormError(btn, 'There was a problem sending your application: ' + (err.message || 'Please try again.'));
        })
        .finally(function() {
            btn.disabled = false;
            btn.innerHTML = originalText;
        });
    };

    if (_cvReadPromise) {
        _cvReadPromise.then(proceed).catch(function() {
            btn.disabled = false;
            btn.innerHTML = originalText;
        });
    } else {
        proceed();
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
        var sectorEl = document.getElementById('candidate-sector');
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

    // Registration Toggles
    var regBtn = document.getElementById('toggleRegistration');
    if (regBtn) {
        regBtn.addEventListener('click', function() {
            toggleReg();
        });
    }
    var regHeroBtn = document.getElementById('heroRegisterTrigger');
    if (regHeroBtn) {
        regHeroBtn.addEventListener('click', function() {
            toggleReg(true);
        });
    }
    // Candidate Sector selector change listener
    var candidateSector = document.getElementById('candidate-sector');
    if (candidateSector) {
        candidateSector.addEventListener('change', function() {
            adjustComplianceFields(this.value);
        });
    }
});

function applyForJob() {
    var modal = document.getElementById('jobModal');
    if (modal) modal.classList.remove('open');
    toggleReg(true);
}

// Attach to window for now
window.filterSector = filterSector;
window.handleCVSelect = handleCVSelect;
window.clearCV = clearCV;
window.handleFormWithAPI = handleFormWithAPI;
window.renderJobs = renderJobs;
window.applyForJob = applyForJob;
window.toggleReg = toggleReg;
window.adjustComplianceFields = adjustComplianceFields;
