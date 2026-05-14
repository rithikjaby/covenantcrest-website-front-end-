import os
import glob
import re

target_dir = r"c:\Users\jabyk\OneDrive\Desktop(1)\covenant crest\covenantcrest-website-front-end-"
html_files = glob.glob(os.path.join(target_dir, "*.html"))

old_font_url = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Montserrat:wght@300;400;500;600;700&display=swap"
new_font_url = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap"

for filepath in html_files:
    if "job.html" in filepath:
        continue # I already rewrote job.html with the correct fonts
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Update font URLs
    content = content.replace(old_font_url, new_font_url)
    
    # Update font families
    content = content.replace("'Cormorant Garamond', serif", "'Playfair Display', serif")
    content = content.replace("'Cormorant Garamond',serif", "'Playfair Display', serif")
    content = content.replace("'Montserrat', sans-serif", "'Plus Jakarta Sans', sans-serif")
    content = content.replace("'Montserrat',sans-serif", "'Plus Jakarta Sans', sans-serif")
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print(f"Updated fonts in {len(html_files)} HTML files.")
