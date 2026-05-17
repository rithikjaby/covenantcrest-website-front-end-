'use strict';

/**
 * Covenant Crest Group - Common JS
 * Shared logic for Nav, Cookies, Forms, and Reveal
 */

// ── Google Analytics 4 ──────────────────────────────────────────
window.__GA_ID = window.__GA_ID || 'G-9GK6PRM1NC';
window.__gaLoaded = false;

function loadGA4() {
    if (window.__gaLoaded) return;
    window.__gaLoaded = true;
    var s = document.createElement('script');
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + window.__GA_ID;
    s.async = true;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function() { dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', window.__GA_ID, { anonymize_ip: true });
}

// ── Cookie Banner ───────────────────────────────────────────────
function setCookie(v) {
    localStorage.setItem('cc_consent', v);
    var bar = document.getElementById('cc-bar');
    if (bar) bar.classList.remove('show');
    if (v === 'accept') {
        loadGA4();
        // Update GA4 consent state once script is ready
        setTimeout(function() {
            if (window.gtag) {
                gtag('consent', 'update', {
                    analytics_storage: 'granted',
                    functionality_storage: 'granted'
                });
            }
        }, 500);
    } else {
        if (window.gtag) {
            gtag('consent', 'update', {
                analytics_storage: 'denied',
                functionality_storage: 'denied'
            });
        }
    }
}

// ── Inline Error Helper ─────────────────────────────────────
function showFormError(anchorEl, msg) {
    var parent = anchorEl && anchorEl.parentNode;
    var existing = parent && parent.querySelector('.ccg-form-err');
    if (existing) { existing.textContent = msg; return; }
    var el = document.createElement('div');
    el.className = 'ccg-form-err';
    el.style.cssText = 'background:#E24B4A;color:#fff;font-size:12px;font-weight:600;padding:12px 16px;border-radius:4px;margin:12px 0;line-height:1.4;';
    el.textContent = msg;
    if (parent) { parent.insertBefore(el, anchorEl.nextSibling); } else { document.body.appendChild(el); }
    setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 8000);
}

// ── API Form Submission ─────────────────────────────────────
function handleForm(e, formName, bannerId) {
    e.preventDefault();
    var form = e.target;
    var banner = document.getElementById(bannerId);
    var btn = form.querySelector('button[type="submit"]');
    var originalText = btn ? btn.textContent : '';

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Sending...';
    }
    
    var formData = new FormData(form);
    var body = {};
    var multiKeys = {};
    formData.forEach(function(value, key) {
        if (key in multiKeys) {
            multiKeys[key].push(value);
        } else if (key in body) {
            multiKeys[key] = [body[key], value];
            delete body[key];
        } else {
            body[key] = value;
        }
    });
    for (var mk in multiKeys) { body[mk] = multiKeys[mk].join(', '); }

    var CRM_KEYS = ['crm_lead_source', 'crm_module', 'crm_type'];
    var EXCLUDE_KEYS = ['name', 'contact_name', 'email', 'phone', 'bot-field', 'form-name', 'gdpr_consent'].concat(CRM_KEYS);
    var messageParts = [];
    for (var key in body) {
        if (EXCLUDE_KEYS.indexOf(key) === -1) {
            messageParts.push(key.toUpperCase() + ': ' + body[key]);
        }
    }

    var contactPayload = {
        name: body.name || body.contact_name || 'Unknown',
        email: body.email || 'no-email@provided.com',
        phone: body.phone || '',
        type: formName || 'general',
        crm_lead_source: body.crm_lead_source || '',
        crm_module: body.crm_module || '',
        crm_type: body.crm_type || '',
        message: messageParts.join('\n') || 'No additional details.'
    };

    if (window.CCA && window.CCA.contacts) {
        window.CCA.contacts.submit(contactPayload)
        .then(function() {
            if (banner) banner.classList.add('show');
            form.reset();
            if (typeof clearCV === 'function') {
                clearCV({ stopPropagation: function() {} });
            }
            if (window.gtag) {
                gtag('event', 'form_submission', {
                    form_name: formName || 'general',
                    form_id: form.id || '',
                    event_category: 'engagement'
                });
            }
        })
        .catch(function(err) {
            console.error('API submit error:', err);
            showFormError(btn || form, 'Problem submitting form. Please email info@covenantcrest.co.uk or call 07346 809846.');
        })
        .finally(function() {
            if (btn) {
                btn.disabled = false;
                btn.textContent = originalText;
            }
        });
    } else {
        // Fallback to Netlify Forms if API not loaded
        var urlBody = new URLSearchParams(formData).toString();
        fetch('/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: urlBody
        })
        .then(function() {
            if (banner) banner.classList.add('show');
            form.reset();
        })
        .catch(function() {
            showFormError(btn || form, 'Problem submitting form. Please email info@covenantcrest.co.uk or call 07346 809846.');
        })
        .finally(function() {
            if (btn) {
                btn.disabled = false;
                btn.textContent = originalText;
            }
        });
    }
}

// ── Init on DOM Content Loaded ──────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
    // 1. Hamburger Menu
    var navToggle = document.getElementById('navToggle');
    var navLinks = document.getElementById('navLinks');
    if (navToggle && navLinks) {
        navToggle.addEventListener('click', function() {
            var open = navLinks.classList.toggle('open');
            this.innerHTML = open ? '&#x2715;' : '&#x2630;';
            this.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        });
    }

    // 1.5 Group Toggle (Mobile)
    var groupToggle = document.getElementById('groupToggle');
    if (groupToggle) {
        groupToggle.addEventListener('click', function(e) {
            if (window.innerWidth <= 860) {
                this.classList.toggle('open');
            }
        });
    }

    // 1.6 Quick Enquiry Toggle (Home)
    var qeBtn = document.getElementById('toggleEnquiry');
    var qeWrap = document.getElementById('qeFormWrap');
    if (qeBtn && qeWrap) {
        qeBtn.addEventListener('click', function() {
            var isOpen = qeWrap.classList.toggle('open');
            this.setAttribute('aria-expanded', isOpen);
            this.textContent = isOpen ? 'Close Enquiry ✕' : 'Send an Enquiry →';
            if (isOpen) {
                setTimeout(function() {
                    qeWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 300);
            }
        });
    }

    // 2. Cookie Banner Logic
    var consent = localStorage.getItem('cc_consent');
    if (consent === 'accept') {
        loadGA4();
    } else if (!consent) {
        var bar = document.getElementById('cc-bar');
        if (bar) {
            setTimeout(function() {
                bar.classList.add('show');
            }, 1400);
        }
    }
    
    var acceptBtn = document.querySelector('.cc-ok');
    var declineBtn = document.querySelector('.cc-no');
    if (acceptBtn) acceptBtn.addEventListener('click', function() { setCookie('accept'); });
    if (declineBtn) declineBtn.addEventListener('click', function() { setCookie('decline'); });

    // 3. Scroll Reveal
    var rvElements = document.querySelectorAll('.rv');
    if (rvElements.length > 0) {
        var observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('vs');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.05, rootMargin: '0px 0px -20px 0px' });

        rvElements.forEach(function(el) {
            observer.observe(el);
        });
    }

    // 4. Form Auto-attachment
    document.querySelectorAll('form[data-form-name]').forEach(function(form) {
        form.addEventListener('submit', function(e) {
            var name = this.getAttribute('data-form-name');
            var banner = this.getAttribute('data-banner-id');
            handleForm(e, name, banner);
        });
    });
});

// Attach to window for inline onclick handlers
window.setCookie = setCookie;
window.loadGA4 = loadGA4;
window.handleForm = handleForm;
