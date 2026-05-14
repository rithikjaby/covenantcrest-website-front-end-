import os

for f in os.listdir('.'):
    if not f.endswith('.html'): continue
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()

    # 1. Increase Logo Size
    content = content.replace('<svg width="28" height="28" viewBox="0 0 80 80"', '<svg width="42" height="42" viewBox="0 0 80 80"')

    # 2. Add Mobile-Only Nav Links
    start_str = '<a href="/about.html" class="nl">About Us</a>'
    end_str = '<a href="/about.html" class="nl">About Us</a>\n      <a href="/haulage.html" class="nl mob-only" style="display:none;">Haulage &amp; Freight</a>\n      <a href="/trade.html" class="nl mob-only" style="display:none;">Import &amp; Trade</a>'
    
    if 'mob-only' not in content:
        content = content.replace(start_str, end_str)
    
    # 3. Add Mobile CSS (Hide group button, show mob-only)
    css_start = '.nav-group-wrap {'
    css_end = '.nav-group-wrap { display: none !important; }\n      .mob-only { display: block !important; color: var(--gold) !important; }\n      .nav-group-wrap.old {'
    if '.mob-only {' not in content and '@media(max-width:860px)' in content:
        # only replace the first occurrence of .nav-group-wrap { after the media query
        parts = content.split('@media(max-width:860px) {')
        if len(parts) > 1:
            parts[1] = parts[1].replace(css_start, css_end, 1)
            content = '@media(max-width:860px) {'.join(parts)

    with open(f, 'w', encoding='utf-8') as file:
        file.write(content)
print('Done nav updates')
