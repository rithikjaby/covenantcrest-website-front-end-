import re

# ── 1. Fix font size 13px → 12px across all pages ────────────────────
import os
html_files = [f for f in os.listdir('.') if f.endswith('.html')]
for fname in html_files:
    c = open(fname, encoding='utf-8').read()
    c = c.replace('.nl{font-size:13px;', '.nl{font-size:12px;')
    open(fname, 'w', encoding='utf-8').write(c)
print("Font size updated to 12px on all pages.")

# ── 2. Fix hire.html JS: move navToggle listener into DOMContentLoaded ──
content = open('hire.html', encoding='utf-8').read()

# Remove the inline <script> block in the <head> that fires before DOM is ready
old_head_script = re.search(
    r'<script>\s*function setCookie.*?</script>',
    content, re.DOTALL
)
if old_head_script:
    content = content.replace(old_head_script.group(), '')
    print("Removed bad head script.")

# Place a clean <script> just before </body>
new_script = """
<script>
/* ── COOKIE ── */
function setCookie(v){
  localStorage.setItem('cc_consent',v);
  document.getElementById('cc-bar').classList.remove('show');
  if(v==='accept') loadGA4();
}

/* ── B2B FORM HANDLER ── */
function handleReqStaff(e){
  e.preventDefault();
  var form = e.target;
  var btn  = document.getElementById('rsb-submit-btn');
  if(btn){ btn.disabled=true; btn.textContent='Sending\u2026'; }
  fetch('/', {
    method : 'POST',
    headers: {'Content-Type':'application/x-www-form-urlencoded'},
    body   : new URLSearchParams(new FormData(form)).toString()
  })
  .then(function(){
    document.getElementById('ok-req-b2b').classList.add('show');
    form.reset();
    if(btn){ btn.disabled=false; btn.textContent='Send Employer Enquiry \u2192'; }
  })
  .catch(function(){
    alert('Problem submitting. Please email recruitment@covenantcrest.co.uk or call 07346 809846.');
    if(btn){ btn.disabled=false; btn.textContent='Send Employer Enquiry \u2192'; }
  });
}

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', function(){
  /* Cookie consent */
  if(localStorage.getItem('cc_consent')==='accept') loadGA4();
  if(!localStorage.getItem('cc_consent')){
    setTimeout(function(){ document.getElementById('cc-bar').classList.add('show'); }, 1400);
  }

  /* Hamburger */
  var tog = document.getElementById('navToggle');
  if(tog){
    tog.addEventListener('click', function(){
      var l = document.getElementById('navLinks');
      var o = l.classList.toggle('open');
      this.innerHTML = o ? '&#x2715;' : '&#x2630;';
    });
  }

  /* Scroll reveal */
  var obs = new IntersectionObserver(function(en){
    en.forEach(function(e){
      if(e.isIntersecting){ e.target.classList.add('vs'); obs.unobserve(e.target); }
    });
  }, {threshold:.1});
  document.querySelectorAll('.rv').forEach(function(el){
    obs.observe(el); el.classList.add('vs');
  });
});
</script>
"""

content = content.replace('</body>', new_script + '</body>')
open('hire.html', 'w', encoding='utf-8').write(content)
print("hire.html JS fixed.")
