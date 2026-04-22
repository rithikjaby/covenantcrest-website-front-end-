content = open('hire.html', encoding='utf-8').read()

idx = content.find('class="hero-btns"')
if idx >= 0:
    print("Found hero-btns div:")
    print(content[idx:idx+300])
else:
    print('hero-btns class NOT found in HTML body')
    idx2 = content.find('PAGE HERO')
    print('PAGE HERO comment at index:', idx2)
    if idx2 >= 0:
        print(content[idx2:idx2+600])
