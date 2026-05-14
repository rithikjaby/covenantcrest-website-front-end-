import re

content = open('hire.html', encoding='utf-8').read()

# 1. Update Hero Background CSS
old_hero_bg = r'\.hero-bg\{position:absolute;inset:0;background-image:linear-gradient.*?\}'
new_hero_bg = r'.hero-bg{position:absolute;inset:0;background:url(\'employer-bg.png\') center/cover no-repeat;opacity:0.35;pointer-events:none;mix-blend-mode:luminosity;}'
content = re.sub(old_hero_bg, new_hero_bg, content)

# 2. Add New CSS Classes before </style>
new_css = """
/* ENHANCED HIRE UI */
.hire-card{background:rgba(255,255,255,.02);border:1px solid rgba(201,168,76,.15);border-radius:14px;padding:32px;transition:all .3s;}
.hire-card:hover{background:rgba(201,168,76,.06);border-color:rgba(201,168,76,.4);transform:translateY(-4px);box-shadow:0 12px 30px rgba(0,0,0,.3);}
.hire-icon{width:56px;height:56px;background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.25);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px;margin-bottom:18px;box-shadow:0 0 16px rgba(201,168,76,.05);}
.hire-title{font-family:'Cormorant Garamond',serif;font-size:22px;color:#fff;margin-bottom:8px;}
.hire-desc{font-size:13px;color:rgba(255,255,255,.55);line-height:1.75;}

.comp-box{margin-top:32px;padding:24px 28px;background:rgba(255,255,255,.02);border:1px solid rgba(201,168,76,.15);border-radius:12px;position:relative;overflow:hidden;}
.comp-box::before{content:'';position:absolute;top:0;left:0;width:4px;height:100%;background:var(--gold);}
.comp-title{font-size:10px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--gold);margin-bottom:16px;display:flex;align-items:center;gap:8px;}
.comp-title::after{content:'';height:1px;flex:1;background:rgba(201,168,76,.15);}
.comp-badge{font-size:11px;font-weight:600;color:var(--gold);padding:7px 16px;background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.2);border-radius:24px;transition:all .2s;cursor:default;display:inline-flex;align-items:center;gap:6px;}
.comp-badge::before{content:'✓';font-size:10px;opacity:0.7;}
.comp-badge:hover{background:var(--gold);color:var(--navy);border-color:var(--gold);}

.rsb-form-box{background:var(--navy);border:1px solid rgba(201,168,76,.2);border-radius:16px;padding:40px;box-shadow:0 24px 48px rgba(0,0,0,.4), 0 0 60px rgba(201,168,76,.04);position:relative;}
@media(max-width:860px){
  .rsb-form-box{padding:24px;}
  .comp-box{padding:20px;}
}
"""

# Replace existing .hire-card and .hire-icon and .hire-title and .hire-desc
content = re.sub(r'\.hire-card\{.*?\}', '', content)
content = re.sub(r'\.hire-icon\{.*?\}', '', content)
content = re.sub(r'\.hire-title\{.*?\}', '', content)
content = re.sub(r'\.hire-desc\{.*?\}', '', content)

content = content.replace('</style>', new_css + '</style>')

# 3. Update Compliance Badges HTML
old_comp = r'<div style="margin-top:20px;padding:18px 20px;background:rgba\(255,255,255,\.04\);border:1px solid rgba\(201,168,76,\.12\);border-radius:10px;">.*?</div>\s*</div>\s*</div>'
new_comp = """<div class="comp-box">
      <div class="comp-title">Compliance Standards We Meet</div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;">
        <span class="comp-badge">CQC Reg. 19</span>
        <span class="comp-badge">SIA Verified</span>
        <span class="comp-badge">GLAA App. in Progress</span>
        <span class="comp-badge">BS 7858:2019</span>
        <span class="comp-badge">Enhanced DBS</span>
        <span class="comp-badge">AWR Compliant</span>
        <span class="comp-badge">NMC Verified</span>
        <span class="comp-badge">Right to Work</span>
      </div>
    </div>
  </div>"""

content = re.sub(old_comp, new_comp, content, flags=re.DOTALL)

# 4. Update the form box HTML
old_form_box = r'<div style="background:var\(--navy\);border:1px solid rgba\(201,168,76,\.15\);border-radius:14px;padding:32px;">'
new_form_box = r'<div class="rsb-form-box">'
content = content.replace(old_form_box, new_form_box)

with open('hire.html', 'w', encoding='utf-8') as f:
    f.write(content)
