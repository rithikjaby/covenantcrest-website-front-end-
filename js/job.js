'use strict';

/**
 * Job Detail Logic
 */

var sectorLabel = { care: 'Healthcare & Care', security: 'Security', warehouse: 'Warehouse & Logistics', construction: 'Construction & Trades' };
var urlParams = new URLSearchParams(window.location.search);
var jobId = urlParams.get('id');
var _currentJob = null;
var _inlineCVBase64 = null;
var _inlineCVFileName = null;

function showApplyForm() {
    var jdView = document.getElementById('jd-view');
    var formView = document.getElementById('form-view');
    if (jdView) jdView.style.display = 'none';
    if (formView) {
        formView.classList.add('show');
        window.scrollTo({ top: formView.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' });
    }
}

function showJobDesc() {
    var formView = document.getElementById('form-view');
    var jdView = document.getElementById('jd-view');
    if (formView) formView.classList.remove('show');
    if (jdView) jdView.style.display = 'block';
}

function handleInlineCV(input) {
    var file = input.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
        alert('File must be under 5MB.');
        input.value = '';
        return;
    }
    _inlineCVFileName = file.name;
    var reader = new FileReader();
    reader.onload = function(e) {
        _inlineCVBase64 = e.target.result.split(',')[1];
        var label = document.getElementById('if-cv-label');
        if (label) label.textContent = '📄 ' + file.name;
        var clearBtn = document.getElementById('if-cv-clear');
        if (clearBtn) clearBtn.style.display = 'inline';
    };
    reader.readAsDataURL(file);
}

function clearInlineCV(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    _inlineCVBase64 = null;
    _inlineCVFileName = null;
    var input = document.getElementById('if-cv-input');
    if (input) input.value = '';
    var label = document.getElementById('if-cv-label');
    if (label) label.textContent = 'Upload CV / Resume (Optional — PDF, Word, max 5MB)';
    var clearBtn = document.getElementById('if-cv-clear');
    if (clearBtn) clearBtn.style.display = 'none';
}

function submitInlineForm(e) {
    e.preventDefault();
    if (!_currentJob) return;
    var btn = document.getElementById('if-submit-btn');
    var ok = document.getElementById('if-ok');
    var prog = document.getElementById('if-prog');
    var bar = document.getElementById('if-bar');
    var stat = document.getElementById('if-stat');

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Submitting...';
    }

    if (_inlineCVBase64 && prog && bar && stat) {
        prog.style.display = 'block';
        bar.style.width = '40%';
        stat.textContent = 'Attaching CV...';
    }

    var payload = {
        first_name: document.getElementById('if-first').value.trim(),
        last_name: document.getElementById('if-last').value.trim(),
        email: document.getElementById('if-email').value.trim(),
        phone: document.getElementById('if-phone').value.trim(),
        sector: _currentJob.sector || '',
        job_id: _currentJob.id || '',
        job_title: _currentJob.title || '',
        availability: document.getElementById('if-avail').value,
        notes: document.getElementById('if-notes').value.trim(),
    };

    if (_inlineCVBase64) {
        payload.cvBase64 = _inlineCVBase64;
        payload.cvFileName = _inlineCVFileName || 'cv';
    }

    if (bar) bar.style.width = '80%';

    fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(function(r) { return r.json(); })
    .then(function() {
        if (bar) bar.style.width = '100%';
        if (stat) stat.textContent = _inlineCVBase64 ? 'CV attached ✓' : '';
        if (ok) ok.classList.add('show');
        var form = document.getElementById('inline-apply-form');
        if (form) form.style.display = 'none';
    })
    .catch(function() {
        if (ok) {
            ok.textContent = '✅ Application received! A consultant will contact you within 24 hours.';
            ok.classList.add('show');
        }
        var form = document.getElementById('inline-apply-form');
        if (form) form.style.display = 'none';
    })
    .finally(function() {
        if (btn) {
            btn.disabled = false;
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    if (!jobId) {
        window.location.href = '/recruitment.html#live-jobs';
        return;
    }

    if (typeof CCA === 'undefined') {
        console.error('CCA API client not loaded');
        return;
    }

    CCA.jobs.get(jobId).then(function(job) {
        if (!job) throw new Error('not found');
        _currentJob = job;
        document.title = job.title + ' | Covenant Crest Recruitment';
        
        var metaDesc = document.getElementById('meta-desc');
        if (metaDesc) metaDesc.setAttribute('content', job.seoDesc || (job.desc || '').replace(/<[^>]*>/g, '').substring(0, 160) + '...');
        
        var metaKeywords = document.getElementById('meta-keywords');
        if (metaKeywords && job.seoKeywords) metaKeywords.setAttribute('content', job.seoKeywords);

        
        var sectorEl = document.getElementById('job-sector');
        if (sectorEl) sectorEl.textContent = sectorLabel[job.sector] || job.sector;
        
        var titleEl = document.getElementById('job-title');
        if (titleEl) titleEl.textContent = job.title;
        
        var locationEl = document.getElementById('job-location');
        if (locationEl) locationEl.innerHTML = '&#x1F4CD; ' + (job.location || 'UK');
        
        var typeEl = document.getElementById('job-type');
        if (typeEl) typeEl.textContent = job.type ? (job.type.charAt(0).toUpperCase() + job.type.slice(1).replace('-', ' ')) : 'Full-time';
        
        var payEl = document.getElementById('job-pay');
        if (payEl) payEl.textContent = job.pay;
        
        var mabPayEl = document.getElementById('mab-pay');
        if (mabPayEl) mabPayEl.textContent = job.pay;
        
        var descEl = document.getElementById('job-desc');
        if (descEl) descEl.innerHTML = job.desc || '';

        var sjhTitle = document.getElementById('sjh-title');
        if (sjhTitle) sjhTitle.textContent = job.title;

        // Populate sharing links
        var url = encodeURIComponent(window.location.href);
        var shareTitle = encodeURIComponent("Check out this job: " + job.title + " at Covenant Crest Group");
        var wa = document.getElementById('share-wa');
        if (wa) wa.href = 'https://wa.me/?text=' + shareTitle + '%20' + url;
        var li = document.getElementById('share-li');
        if (li) li.href = 'https://www.linkedin.com/sharing/share-offsite/?url=' + url;
        var mail = document.getElementById('share-mail');
        if (mail) mail.href = 'mailto:?subject=' + shareTitle + '&body=View the job listing here: ' + url;

        // Bottom Pills
        var fbB = document.getElementById('jds-fb');
        if (fbB) fbB.href = 'https://www.facebook.com/sharer/sharer.php?u=' + url;
        var waB = document.getElementById('jds-wa');
        if (waB) waB.href = 'https://wa.me/?text=' + shareTitle + '%20' + url;
        var liB = document.getElementById('jds-li');
        if (liB) liB.href = 'https://www.linkedin.com/sharing/share-offsite/?url=' + url;
        var xB  = document.getElementById('jds-x');
        if (xB)  xB.href  = 'https://twitter.com/intent/tweet?text=' + shareTitle + '&url=' + url;
        var mailB = document.getElementById('jds-mail');
        if (mailB) mailB.href = 'mailto:?subject=' + shareTitle + '&body=View the job listing here: ' + url;

        
        var roleNameEl = document.getElementById('if-role-name');
        if (roleNameEl) roleNameEl.textContent = job.title + (job.location ? ' — ' + job.location : '');
        
        if (job.req) {
            var reqEl = document.getElementById('job-req');
            if (reqEl) reqEl.innerHTML = job.req;
            var reqContainer = document.getElementById('job-req-container');
            if (reqContainer) reqContainer.style.display = 'block';
        }

        // Handle Expiry
        if (job.closingDate) {
            var isExpired = new Date(job.closingDate) < new Date().setHours(0,0,0,0);
            if (isExpired) {
                var expEl = document.getElementById('job-expiry');
                if (expEl) expEl.style.display = 'inline-block';
                var applyBtn = document.getElementById('apply-btn');
                if (applyBtn) {
                    applyBtn.disabled = true;
                    applyBtn.textContent = 'This application has closed';
                    applyBtn.style.opacity = '0.5';
                }
            }
        }


        // Schema.org
        var schema = {
            "@context": "https://schema.org/",
            "@type": "JobPosting",
            "title": job.title,
            "description": job.desc,
            "datePosted": job.posted || new Date().toISOString(),
            "employmentType": job.type === 'part-time' ? "PART_TIME" : job.type === 'temporary' ? "TEMPORARY" : "FULL_TIME",
            "hiringOrganization": {
                "@type": "Organization",
                "name": "Covenant Crest Group Ltd",
                "sameAs": "https://covenantcrest.co.uk"
            },
            "jobLocation": {
                "@type": "Place",
                "address": {
                    "@type": "PostalAddress",
                    "addressLocality": job.location || "UK",
                    "addressCountry": "GB"
                }
            },
            "baseSalary": {
                "@type": "MonetaryAmount",
                "currency": "GBP",
                "value": {
                    "@type": "QuantitativeValue",
                    "value": job.pay,
                    "unitText": "HOUR"
                }
            }
        };
        var s = document.createElement('script');
        s.type = 'application/ld+json';
        s.text = JSON.stringify(schema);
        document.head.appendChild(s);

        var loadingEl = document.getElementById('loading');
        if (loadingEl) loadingEl.style.display = 'none';
        
        var contentEl = document.getElementById('job-content');
        if (contentEl) contentEl.style.display = 'block';

    }).catch(function() {
        var loadingEl = document.getElementById('loading');
        if (loadingEl) {
            loadingEl.innerHTML = '<p style="color:var(--danger);">Error loading job details. <a href="/recruitment.html#live-jobs" style="color:var(--gold);">Return to jobs list</a>.</p>';
        }
    });
    // ── Event Listeners ──────────────────────────
    var applyBtn = document.getElementById('apply-btn');
    if (applyBtn) applyBtn.addEventListener('click', showApplyForm);

    var backBtn = document.querySelector('.if-back');
    if (backBtn) backBtn.addEventListener('click', showJobDesc);

    var cvZone = document.getElementById('if-cv-zone');
    if (cvZone) cvZone.addEventListener('click', function() {
        var input = document.getElementById('if-cv-input');
        if (input) input.click();
    });

    var cvInput = document.getElementById('if-cv-input');
    if (cvInput) cvInput.addEventListener('change', function() {
        handleInlineCV(this);
    });

    var cvClear = document.getElementById('if-cv-clear');
    if (cvClear) cvClear.addEventListener('click', function(e) {
        clearInlineCV(e);
    });

    var applyForm = document.getElementById('inline-apply-form');
    if (applyForm) applyForm.addEventListener('submit', function(e) {
        submitInlineForm(e);
    });

    // Sticky Header Scroll Logic
    var stickyHdr = document.getElementById('sticky-hdr');
    var trigger = document.getElementById('ph-trigger');
    if (stickyHdr && trigger) {
        window.addEventListener('scroll', function() {
            var rect = trigger.getBoundingClientRect();
            // Show sticky bar when the main header has scrolled past the nav (68px)
            if (rect.bottom < 68) {
                stickyHdr.classList.add('show');
            } else {
                stickyHdr.classList.remove('show');
            }
        });
    }

    var sjhApply = document.getElementById('sjh-apply');
    if (sjhApply) {
        sjhApply.addEventListener('click', function(e) {
            e.preventDefault();
            showApplyForm();
        });
    }

    // ── Share Logic ──────────────────────────────
    function updateShareLinks(job) {
        var url = encodeURIComponent(window.location.href);
        var title = encodeURIComponent("Check out this job: " + job.title + " at Covenant Crest Group");
        
        var wa = document.getElementById('share-wa');
        if (wa) wa.href = 'https://wa.me/?text=' + title + '%20' + url;
        
        var li = document.getElementById('share-li');
        if (li) li.href = 'https://www.linkedin.com/sharing/share-offsite/?url=' + url;
        
        var mail = document.getElementById('share-mail');
        if (mail) mail.href = 'mailto:?subject=' + title + '&body=View the job listing here: ' + url;

        // Bottom Pills
        var fbB = document.getElementById('jds-fb');
        if (fbB) fbB.href = 'https://www.facebook.com/sharer/sharer.php?u=' + url;
        var waB = document.getElementById('jds-wa');
        if (waB) waB.href = 'https://wa.me/?text=' + title + '%20' + url;
        var liB = document.getElementById('jds-li');
        if (liB) liB.href = 'https://www.linkedin.com/sharing/share-offsite/?url=' + url;
        var xB  = document.getElementById('jds-x');
        if (xB)  xB.href  = 'https://twitter.com/intent/tweet?text=' + title + '&url=' + url;
        var mailB = document.getElementById('jds-mail');
        if (mailB) mailB.href = 'mailto:?subject=' + title + '&body=View the job listing here: ' + url;
    }

    var copyBtn = document.getElementById('share-copy');
    if (copyBtn) {
        copyBtn.addEventListener('click', function() {
            navigator.clipboard.writeText(window.location.href).then(function() {
                var msg = document.getElementById('copy-msg');
                if (msg) {
                    msg.classList.add('show');
                    setTimeout(function() { msg.classList.remove('show'); }, 2000);
                }
            });
        });
    }

    // Call updateShareLinks once job is loaded
    if (_currentJob) updateShareLinks(_currentJob);
    else {
        // If job is still loading, we'll call it inside the CCA.jobs.get().then() block
    }
});

// Attach to window
window.showApplyForm = showApplyForm;
window.showJobDesc = showJobDesc;
window.handleInlineCV = handleInlineCV;
window.clearInlineCV = clearInlineCV;
window.submitInlineForm = submitInlineForm;
