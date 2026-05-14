import re

# 1. index.html - Request Staff
content = open('index.html', encoding='utf-8').read()
content = content.replace('<a href="/hire.html#request-staff-b2b" class="nav-cta">Request Staff</a>',
                          '<a href="/hire.html#request-staff-b2b" class="nav-cta">Request Staff</a>') # Keep it
open('index.html', 'w', encoding='utf-8').write(content)

# 2. recruitment.html - REVERT TO Register Your Details
content = open('recruitment.html', encoding='utf-8').read()
content = content.replace('<a href="/hire.html#request-staff-b2b" class="nav-cta">Request Staff</a>',
                          '<a href="#apply-form" class="nav-cta">Register Your Details</a>')
open('recruitment.html', 'w', encoding='utf-8').write(content)

# 3. hire.html - Request Staff
content = open('hire.html', encoding='utf-8').read()
content = content.replace('<a href="#request-staff-b2b" class="nav-cta">Request Staff</a>',
                          '<a href="#request-staff-b2b" class="nav-cta">Request Staff</a>') # Keep it
open('hire.html', 'w', encoding='utf-8').write(content)

# 4. about.html - Change to Get in Touch
content = open('about.html', encoding='utf-8').read()
content = content.replace('<a href="/hire.html#request-staff-b2b" class="nav-cta">Request Staff</a>',
                          '<a href="/index.html#contact" class="nav-cta">Get in Touch</a>')
open('about.html', 'w', encoding='utf-8').write(content)

print("Nav CTA buttons updated according to feedback.")
