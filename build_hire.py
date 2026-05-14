import re

with open('recruitment.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Title & Meta
content = re.sub(r'<title>.*?</title>', '<title>Hire Staff — Request Care, Security &amp; Warehouse Staff | Covenant Crest Group Ltd</title>', content)
content = re.sub(r'<meta name="description" content=".*?">', '<meta name="description" content="Hire vetted healthcare, security, warehouse and construction staff across the UK. Fast, reliable, and fully compliant recruitment solutions.">', content)
content = re.sub(r'<link rel="canonical" href=".*?">', '<link rel="canonical" href="https://covenantcrest.co.uk/hire.html">', content)
content = re.sub(r'<meta property="og:url" content=".*?">', '<meta property="og:url" content="https://covenantcrest.co.uk/hire.html">', content)
content = re.sub(r'<meta property="og:title" content=".*?">', '<meta property="og:title" content="Hire Staff — Care, Security &amp; Warehouse Staff | Covenant Crest">', content)
content = re.sub(r'<meta property="og:description" content=".*?">', '<meta property="og:description" content="Hire vetted healthcare, security, warehouse and construction staff across the UK. Fast, reliable, and fully compliant recruitment solutions.">', content)

# 2. Replace the Hero
hero_pattern = re.compile(r'<!-- PAGE HERO -->.*?</section>', re.DOTALL)
new_hero = """<!-- PAGE HERO -->
<section class="page-hero" style="min-height:45vh;padding:120px 48px 60px;">
  <div class="hero-bg"></div>
  <div class="hero-glow"></div>
  <div class="ph-c">
    <div class="s-tag">For Employers</div>
    <h1 class="ph-h1">Hire Staff <em>Fast</em></h1>
    <p class="ph-desc">Fully vetted, compliant professionals across healthcare, security, warehouse and construction. We can often have staff on site within 48 hours.</p>
    <div class="hero-btns">
      <a href="#request-staff-b2b" class="btn-gold">Request Staff</a>
      <a href="tel:07346809846" class="btn-ghost">Call 07346 809846</a>
    </div>
  </div>
</section>"""
content = hero_pattern.sub(new_hero, content)

# 3. Replace the body of recruitment (Sector Bar through Apply Section) with the Hire Staff sections
body_pattern = re.compile(r'<!-- SECTOR TABS -->.*?<!-- APPLY SECTION -->.*?<\/section>', re.DOTALL)

hire_sections = """<!-- HIRE STAFF -->
<section class="sec sec-dk" id="hire" style="padding-top:0;border-top:1px solid rgba(255,255,255,.06);">
  <div class="inner" style="padding-top:60px;">
    <div class="s-tag">Employers</div>
    <h2 class="s-title w" style="margin-bottom:12px;">Hire <em>Staff Fast</em></h2>
    <p style="font-size:13px;color:rgba(255,255,255,.45);line-height:1.8;max-width:560px;margin-bottom:32px;">Call <strong style="color:rgba(255,255,255,.7);">07346 809846</strong> or email recruitment@covenantcrest.co.uk &mdash; we can often have staff on site within 48 hours.</p>
    <div class="hire-grid rv">
      <div class="hire-card"><div class="hire-icon">&#x1F4CB;</div><div class="hire-title">Right to Work Verified</div><p class="hire-desc" style="margin-top:8px;">Mandatory RTW checks on every candidate &mdash; share codes verified, document originals confirmed. Protects you from illegal working civil penalties.</p></div>
      <div class="hire-card"><div class="hire-icon">&#x26A1;</div><div class="hire-title">Emergency Cover</div><p class="hire-desc" style="margin-top:8px;">Last-minute staffing emergencies. We maintain a pool of available, compliant workers ready to be placed at short notice.</p></div>
      <div class="hire-card"><div class="hire-icon">&#x1F91D;</div><div class="hire-title">Flexible Contracts</div><p class="hire-desc" style="margin-top:8px;">Temporary ad-hoc cover, temp-to-permanent, or ongoing framework agreements with a dedicated single point of contact.</p></div>
      <div class="hire-card"><div class="hire-icon">&#x1F4B7;</div><div class="hire-title">Transparent Pricing</div><p class="hire-desc" style="margin-top:8px;">Clear, agreed charge rates with no hidden fees. Invoiced weekly. Volume discounts for regular requirements.</p></div>
    </div>
    <div style="margin-top:20px;padding:18px 20px;background:rgba(255,255,255,.04);border:1px solid rgba(201,168,76,.12);border-radius:10px;">
      <div style="font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--gold);margin-bottom:12px;">Compliance Standards We Meet</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        <span style="font-size:11px;color:rgba(255,255,255,.5);padding:5px 10px;background:rgba(255,255,255,.05);border-radius:4px;">CQC Reg. 19</span>
        <span style="font-size:11px;color:rgba(255,255,255,.5);padding:5px 10px;background:rgba(255,255,255,.05);border-radius:4px;">SIA Verified</span>
        <span style="font-size:11px;color:rgba(255,255,255,.5);padding:5px 10px;background:rgba(255,255,255,.05);border-radius:4px;">GLAA App. in Progress</span>
        <span style="font-size:11px;color:rgba(255,255,255,.5);padding:5px 10px;background:rgba(255,255,255,.05);border-radius:4px;">BS 7858:2019</span>
        <span style="font-size:11px;color:rgba(255,255,255,.5);padding:5px 10px;background:rgba(255,255,255,.05);border-radius:4px;">Enhanced DBS</span>
        <span style="font-size:11px;color:rgba(255,255,255,.5);padding:5px 10px;background:rgba(255,255,255,.05);border-radius:4px;">AWR Compliant</span>
        <span style="font-size:11px;color:rgba(255,255,255,.5);padding:5px 10px;background:rgba(255,255,255,.05);border-radius:4px;">NMC Verified</span>
        <span style="font-size:11px;color:rgba(255,255,255,.5);padding:5px 10px;background:rgba(255,255,255,.05);border-radius:4px;">Right to Work</span>
      </div>
    </div>
  </div>
</section>

<!-- B2B REQUEST STAFF FORM -->
<section class="sec sec-cr" id="request-staff-b2b">
  <div class="inner">
    <div style="display:grid;grid-template-columns:1fr 1.3fr;gap:64px;align-items:start;" class="rsb-grid">
      <div>
        <div class="s-tag">For Employers</div>
        <h2 class="s-title">Request <em>Staff</em></h2>
        <p class="s-lead">Fill in the form and a dedicated consultant will contact you within 2 hours to discuss your staffing requirements.</p>
        <div style="display:flex;flex-direction:column;gap:14px;margin-top:8px;">
          <div style="display:flex;align-items:flex-start;gap:10px;font-size:13px;color:var(--muted);"><span style="color:var(--gold);font-weight:700;flex-shrink:0;">&#x2714;</span>Dedicated account manager from first contact</div>
          <div style="display:flex;align-items:flex-start;gap:10px;font-size:13px;color:var(--muted);"><span style="color:var(--gold);font-weight:700;flex-shrink:0;">&#x2714;</span>All candidates pre-vetted &amp; compliance-ready</div>
          <div style="display:flex;align-items:flex-start;gap:10px;font-size:13px;color:var(--muted);"><span style="color:var(--gold);font-weight:700;flex-shrink:0;">&#x2714;</span>Staff on site within 24&ndash;48 hours where possible</div>
          <div style="display:flex;align-items:flex-start;gap:10px;font-size:13px;color:var(--muted);"><span style="color:var(--gold);font-weight:700;flex-shrink:0;">&#x2714;</span>Transparent charge rates, no hidden fees</div>
          <div style="display:flex;align-items:flex-start;gap:10px;font-size:13px;color:var(--muted);"><span style="color:var(--gold);font-weight:700;flex-shrink:0;">&#x2714;</span>24/7 emergency cover available</div>
          <div style="display:flex;align-items:flex-start;gap:10px;font-size:13px;color:var(--muted);"><span style="color:var(--gold);font-weight:700;flex-shrink:0;">&#x2714;</span>GLAA licence application in progress &mdash; fully compliant labour supply</div>
        </div>
        <div style="margin-top:28px;padding:16px 18px;background:rgba(201,168,76,.08);border-left:3px solid var(--gold);border-radius:0 6px 6px 0;">
          <div style="font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:var(--gold);margin-bottom:4px;">Prefer to call?</div>
          <div style="font-size:15px;font-weight:600;color:var(--navy);">07346 809846</div>
          <div style="font-size:12px;color:var(--muted);margin-top:2px;">recruitment@covenantcrest.co.uk</div>
        </div>
      </div>
      <div style="background:var(--navy);border:1px solid rgba(201,168,76,.15);border-radius:14px;padding:32px;">
        <div style="font-family:'Cormorant Garamond',serif;font-size:24px;color:#fff;margin-bottom:4px;">Request Staff</div>
        <div style="font-size:11px;color:rgba(255,255,255,.3);margin-bottom:22px;">Employer enquiry &mdash; this is <strong style="color:rgba(255,255,255,.45);">not</strong> a candidate application form.</div>
        <div class="ok-banner" id="ok-req-b2b">&#x2705; Request received! A consultant will contact you within 2 hours.</div>
        <form name="recruitment-request-staff" method="POST" data-netlify="true" netlify-honeypot="bot-field" onsubmit="handleReqStaff(event)">
          <input type="hidden" name="form-name" value="recruitment-request-staff">
          <p style="display:none"><label>Do not fill: <input name="bot-field"></label></p>
          <div class="dk-g2">
            <div class="dk-fg"><label class="dk-label">Company Name *</label><input class="dk-input" name="company_name" placeholder="Oakwood Care Home" required></div>
            <div class="dk-fg"><label class="dk-label">Your Job Title *</label><input class="dk-input" name="job_title" placeholder="Operations Manager" required></div>
          </div>
          <div class="dk-g2">
            <div class="dk-fg"><label class="dk-label">Your Name *</label><input class="dk-input" name="contact_name" placeholder="Jane Smith" required></div>
            <div class="dk-fg"><label class="dk-label">Phone *</label><input class="dk-input" type="tel" name="phone" placeholder="07700 000000" required></div>
          </div>
          <div class="dk-fg"><label class="dk-label">Email *</label><input class="dk-input" type="email" name="email" placeholder="jane@company.co.uk" required></div>
          <div class="dk-g2">
            <div class="dk-fg">
              <label class="dk-label">Sector *</label>
              <select class="dk-select" name="sector" required>
                <option value="" disabled selected>Choose sector&hellip;</option>
                <option value="care">Care &amp; Healthcare</option>
                <option value="security">Security</option>
                <option value="warehouse">Warehouse &amp; Logistics</option>
                <option value="multiple">Multiple sectors</option>
              </select>
            </div>
            <div class="dk-fg"><label class="dk-label">Workers Needed</label><input class="dk-input" type="number" name="workers_needed" placeholder="e.g. 3" min="1"></div>
          </div>
          <div class="dk-g2">
            <div class="dk-fg"><label class="dk-label">Start Date</label><input class="dk-input" type="date" name="start_date"></div>
            <div class="dk-fg"><label class="dk-label">Site Postcode</label><input class="dk-input" name="postcode" placeholder="e.g. TF1 1AB"></div>
          </div>
          <div class="dk-fg">
            <label class="dk-label">Compliance Requirements</label>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px;">
              <label style="display:flex;align-items:center;gap:5px;font-size:11px;color:rgba(255,255,255,.5);cursor:pointer;"><input type="checkbox" name="req_dbs" style="accent-color:var(--gold);"> Enhanced DBS</label>
              <label style="display:flex;align-items:center;gap:5px;font-size:11px;color:rgba(255,255,255,.5);cursor:pointer;"><input type="checkbox" name="req_sia" style="accent-color:var(--gold);"> SIA Licence</label>
              <label style="display:flex;align-items:center;gap:5px;font-size:11px;color:rgba(255,255,255,.5);cursor:pointer;"><input type="checkbox" name="req_nmc" style="accent-color:var(--gold);"> NMC Pin</label>
              <label style="display:flex;align-items:center;gap:5px;font-size:11px;color:rgba(255,255,255,.5);cursor:pointer;"><input type="checkbox" name="req_flt" style="accent-color:var(--gold);"> FLT Licence</label>
              <label style="display:flex;align-items:center;gap:5px;font-size:11px;color:rgba(255,255,255,.5);cursor:pointer;"><input type="checkbox" name="req_rtw" style="accent-color:var(--gold);"> Right to Work</label>
              <label style="display:flex;align-items:center;gap:5px;font-size:11px;color:rgba(255,255,255,.5);cursor:pointer;"><input type="checkbox" name="req_cscs" style="accent-color:var(--gold);"> CSCS Card</label>
            </div>
          </div>
          <div class="dk-fg"><label class="dk-label">Additional Notes</label><textarea class="dk-textarea" name="notes" placeholder="Shift patterns, contract duration, specific roles&hellip;"></textarea></div>
          <div class="dk-fg">
            <label style="display:flex;align-items:flex-start;gap:8px;font-size:11px;color:rgba(255,255,255,.5);cursor:pointer;margin-top:12px;">
              <input type="checkbox" name="gdpr_consent" required style="accent-color:var(--gold);margin-top:2px;">
              <span>I consent to my data being processed in accordance with the <a href="/privacy.html" style="color:var(--gold);">Privacy Policy</a> for the purpose of this enquiry.</span>
            </label>
          </div>
          <button type="submit" class="f-submit" id="rsb-submit-btn" aria-label="Send employer enquiry">Send Employer Enquiry &#8594;</button>
          <p style="font-size:10px;color:rgba(255,255,255,.2);text-align:center;margin-top:10px;">Your data is processed under UK GDPR. See our <a href="/privacy.html" style="color:rgba(201,168,76,.55);">Privacy Policy</a>. Covenant Crest Group Ltd &mdash; ICO Reg: ZC100629.</p>
        </form>
      </div>
    </div>
  </div>
</section>"""
content = body_pattern.sub(hire_sections, content)

# 4. Remove Job modal
modal_pattern = re.compile(r'<div class="modal-overlay" id="jobModal">.*?</div>\s*</div>', re.DOTALL)
content = modal_pattern.sub('', content)

with open('hire.html', 'w', encoding='utf-8') as f:
    f.write(content)
