import os

html_files = [f for f in os.listdir('.') if f.endswith('.html')]

for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Nav Links
    content = content.replace('.nl{font-size:10px;', '.nl{font-size:13px;')
    content = content.replace('.nl{padding:10px 0;font-size:11px;', '.nl{padding:10px 0;font-size:14px;')

    # Logo Sizes
    content = content.replace('.nav-name{font-family:\'Cormorant Garamond\',serif;font-size:30px;', '.nav-name{font-family:\'Cormorant Garamond\',serif;font-size:34px;')
    content = content.replace('.ft-logo-name{font-family:\'Cormorant Garamond\',serif;font-size:30px;', '.ft-logo-name{font-family:\'Cormorant Garamond\',serif;font-size:34px;')

    # Wait, in privacy.html and terms.html and maybe others:
    # let's be careful and just do regex replacement if it varies.
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)

print("Fonts updated.")
