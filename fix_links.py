import re

# 1. index.html
content = open('index.html', encoding='utf-8').read()
content = content.replace('<a href="#request-staff" class="btn-gold" id="hero-cta-request">Request Staff</a>',
                          '<a href="/hire.html#request-staff-b2b" class="btn-gold" id="hero-cta-request">Request Staff</a>')
content = content.replace('<a href="/index.html#contact" class="nav-cta">Get in Touch</a>',
                          '<a href="/hire.html#request-staff-b2b" class="nav-cta">Request Staff</a>')
open('index.html', 'w', encoding='utf-8').write(content)

# 2. recruitment.html
content = open('recruitment.html', encoding='utf-8').read()
content = content.replace('<a href="#apply-form" class="nav-cta">Register Your Details</a>',
                          '<a href="/hire.html#request-staff-b2b" class="nav-cta">Request Staff</a>')
# Ensure there are no other "#request-staff" broken links
content = content.replace('href="#request-staff"', 'href="/hire.html#request-staff-b2b"')
open('recruitment.html', 'w', encoding='utf-8').write(content)

# 3. hire.html
content = open('hire.html', encoding='utf-8').read()
content = content.replace('<a href="#apply-form" class="nav-cta">Register Your Details</a>',
                          '<a href="#request-staff-b2b" class="nav-cta">Request Staff</a>')
open('hire.html', 'w', encoding='utf-8').write(content)

# 4. about.html
content = open('about.html', encoding='utf-8').read()
content = content.replace('<a href="/index.html#contact" class="nav-cta">Get in Touch</a>',
                          '<a href="/hire.html#request-staff-b2b" class="nav-cta">Request Staff</a>')
open('about.html', 'w', encoding='utf-8').write(content)

print("Links fixed.")
