'use strict';

/**
 * Job Detail Logic
 */

var sectorLabel = { care: 'Healthcare & Care', security: 'Security', warehouse: 'Warehouse & Logistics', construction: 'Construction & Trades', technical: 'IT & Business' };
var urlParams = new URLSearchParams(window.location.search);
var jobId = urlParams.get('id');
var _currentJob = null;
var _inlineCVBase64 = null;

function cleanPay(val) {
    if (!val) return 'Competitive Rate';
    return String(val).replace(/\$/g, '£');
}

// Global Exports
window.openApplyPage = function() {
    if (jobId) window.location.href = '/apply?id=' + jobId;
};

document.addEventListener('DOMContentLoaded', function() {
    if (!jobId) {
        window.location.href = '/recruitment#live-jobs';
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
        if (locationEl) { locationEl.textContent = ''; locationEl.insertAdjacentHTML('beforeend', '&#x1F4CD; '); locationEl.appendChild(document.createTextNode(job.location || 'UK')); }
        
        var typeEl = document.getElementById('job-type');
        if (typeEl) typeEl.textContent = job.type ? (job.type.charAt(0).toUpperCase() + job.type.slice(1).replace('-', ' ')) : 'Full-time';

        // Workplace Policy Pill
        var workplaceEl = document.getElementById('job-workplace');
        var workplaceLabels = { onsite: '🏢 On-site', hybrid: '🏠 Hybrid', remote: '🌐 Remote' };
        if (workplaceEl && job.workplace) {
            var wpLabel = workplaceLabels[job.workplace] || (job.workplace.charAt(0).toUpperCase() + job.workplace.slice(1));
            var wpLabelEl = document.getElementById('job-workplace-label');
            if (wpLabelEl) wpLabelEl.textContent = wpLabel;
            workplaceEl.style.display = 'inline-flex';
        }
        
        var payEl = document.getElementById('job-pay');
        if (payEl) payEl.querySelector('span').textContent = cleanPay(job.pay);
        
        var mabPayEl = document.getElementById('mab-pay');
        if (mabPayEl) mabPayEl.textContent = cleanPay(job.pay);
        
        var canonical = document.getElementById('canonical-url');
        if (canonical) canonical.href = 'https://www.covenantcrest.co.uk/job?id=' + jobId;
        var ogUrl = document.getElementById('og-url');
        if (ogUrl) ogUrl.setAttribute('content', 'https://www.covenantcrest.co.uk/job?id=' + jobId);
        var ogDesc = document.getElementById('og-desc');
        if (ogDesc) ogDesc.setAttribute('content', (job.desc || '').replace(/<[^>]*>/g, '').substring(0, 160));

        var descEl = document.getElementById('job-desc');
        var rawDesc = job.desc || '';
        if (rawDesc.indexOf('&lt;') !== -1 || rawDesc.indexOf('&gt;') !== -1) {
            var txt = document.createElement("textarea");
            txt.innerHTML = rawDesc;
            rawDesc = txt.value;
        }
        var safeDesc = (typeof DOMPurify !== 'undefined') ? DOMPurify.sanitize(rawDesc) : rawDesc;
        if (descEl) descEl.innerHTML = safeDesc;

        var sjhTitle = document.getElementById('sjh-title');
        if (sjhTitle) sjhTitle.textContent = job.title;

        // WhatsApp Apply button — pre-fill with job title and location
        var waApplyEl = document.getElementById('wa-apply-btn');
        if (waApplyEl) {
            var applyMsg = encodeURIComponent('Hi Covenant Crest, I\'d like to apply for the ' + job.title + ' role' + (job.location ? ' in ' + job.location : '') + '. Can you help me register?');
            waApplyEl.href = 'https://wa.me/447346809846?text=' + applyMsg;
        }
        var waDirectEl = document.getElementById('wa-apply-direct');
        if (waDirectEl) {
            var directMsg = encodeURIComponent('Hi, I\'d like to apply for: ' + job.title + (job.location ? ' in ' + job.location : '') + '. My name is ');
            waDirectEl.href = 'https://wa.me/447346809846?text=' + directMsg;
        }

        // Corporate / Professional Role Dynamic Adjustments
        if (job.isCorporate) {
            // 1. Hide WhatsApp apply buttons and notes
            ['wa-apply-btn', 'wa-apply-btn-sb'].forEach(function(id) {
                var el = document.getElementById(id);
                if (el) el.style.display = 'none';
            });
            var applyNotes = document.querySelectorAll('.apply-note');
            applyNotes.forEach(function(el) { el.style.display = 'none'; });
            
            // Hide "We reply in minutes" note under WhatsApp sidebar button
            var promiseCardEl = document.getElementById('promise-card');
            if (promiseCardEl) {
                var replyP = promiseCardEl.querySelector('p');
                if (replyP) replyP.style.display = 'none';
            }

            // 2. Swap Benefit Strip to Corporate Copy
            var benefitStripEl = document.getElementById('benefit-strip');
            if (benefitStripEl) {
                benefitStripEl.innerHTML = `
                  <div class="ben-item">
                    <div class="ben-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>
                    Competitive Salary &amp; Day Rates
                  </div>
                  <div class="ben-item">
                    <div class="ben-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>
                    Top-Tier Corporate Clients
                  </div>
                  <div class="ben-item">
                    <div class="ben-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>
                    Professional Vetting &amp; Compliance
                  </div>
                  <div class="ben-item">
                    <div class="ben-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>
                    Dedicated Recruitment Partner
                  </div>`;
            }

            // 3. Swap Sidebar Promise Card to Corporate Copy
            if (promiseCardEl) {
                promiseCardEl.innerHTML = `
                  <div class="sb-head">Our Professional Match Guarantee</div>
                  <div class="sb-row">
                    <div class="sb-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg></div>
                    <div class="sb-text"><strong>Competitive Salaries &amp; Day Rates</strong><span>Full payroll transparency and prompt payment terms.</span></div>
                  </div>
                  <div class="sb-row">
                    <div class="sb-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
                    <div class="sb-text"><strong>Vetting &amp; Background Screening</strong><span>Reference checks, background screening, and GDPR compliance.</span></div>
                  </div>
                  <div class="sb-row">
                    <div class="sb-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div>
                    <div class="sb-text"><strong>Direct Corporate Placements</strong><span>Matched directly with top-tier corporate and enterprise employers.</span></div>
                  </div>
                  <button class="btn-sb-apply" id="side-apply-btn" onclick="openApplyPage()">Apply Now &rarr;</button>`;
            }
        }

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
            var rawReq = job.req || '';
            if (rawReq.indexOf('&lt;') !== -1 || rawReq.indexOf('&gt;') !== -1) {
                var txt = document.createElement("textarea");
                txt.innerHTML = rawReq;
                rawReq = txt.value;
            }
            var safeReq = (typeof DOMPurify !== 'undefined') ? DOMPurify.sanitize(rawReq) : rawReq;
            if (reqEl) reqEl.innerHTML = safeReq;
            var reqContainer = document.getElementById('job-req-container');
            if (reqContainer) reqContainer.style.display = 'block';
        }

        // Handle Expiry
        if (job.closingDate) {
            var isExpired = new Date(job.closingDate) < new Date().setHours(0,0,0,0);
            if (isExpired) {
                var expEl = document.getElementById('job-expiry');
                if (expEl) expEl.style.display = 'inline-block';
                document.querySelectorAll('[id$="-apply-btn"], button.f-submit').forEach(function(btn) {
                    btn.disabled = true;
                    btn.textContent = 'This application has closed';
                    btn.style.opacity = '0.5';
                    btn.style.cursor = 'not-allowed';
                    btn.onclick = function(e) { e.preventDefault(); };
                });
            }
        }


        // Schema.org
        var schema = {
            "@context": "https://schema.org/",
            "@type": "JobPosting",
            "title": job.title,
            "description": job.desc,
            "datePosted": job.posted || new Date().toISOString(),
            "validThrough": job.closingDate ? new Date(job.closingDate).toISOString() : undefined,
            "employmentType": job.type === 'part-time' ? "PART_TIME" : job.type === 'temporary' ? "TEMPORARY" : "FULL_TIME",
            "hiringOrganization": {
                "@type": "Organization",
                "name": "Covenant Crest Group Ltd",
                "sameAs": "https://www.covenantcrest.co.uk",
                "logo": "https://www.covenantcrest.co.uk/favicon.svg"
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
            },
            "identifier": {
                "@type": "PropertyValue",
                "name": "Covenant Crest",
                "value": job.id
            },
            "directApply": true
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
            loadingEl.innerHTML = '<p style="color:var(--danger);">Error loading job details. <a href="/recruitment#live-jobs" style="color:var(--gold);">Return to jobs list</a>.</p>';
        }
    });
    // Sticky Header Scroll Logic
    var stickyHdr = document.getElementById('sticky-hdr');
    var trigger = document.getElementById('ph-trigger');
    if (stickyHdr && trigger) {
        window.addEventListener('scroll', function() {
            var rect = trigger.getBoundingClientRect();
            if (rect.bottom < 72) {
                stickyHdr.classList.add('show');
            } else {
                stickyHdr.classList.remove('show');
            }
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
