import re, os

# Check hire.html
content = open('hire.html', encoding='utf-8').read()

hero = re.search(r'hero-btns.*?</div>', content, re.DOTALL)
print('HERO BUTTONS:', hero.group()[:300] if hero else 'NOT FOUND')

form_section = 'id="request-staff-b2b"' in content
print('Has request-staff-b2b section:', form_section)

form_tag = '<form' in content
print('Has form tag:', form_tag)

handleReqStaff = 'handleReqStaff' in content
print('Has handleReqStaff JS function:', handleReqStaff)

# Check recruitment.html for hire staff button
rec = open('recruitment.html', encoding='utf-8').read()
hire_links = re.findall(r'href="[^"]*hire[^"]*"', rec)
print('Hire links in recruitment.html:', hire_links)

request_links = re.findall(r'href="[^"]*request[^"]*"', rec)
print('Request links in recruitment.html:', request_links)
