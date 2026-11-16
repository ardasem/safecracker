"""Bundle the original workshop into the standalone pitch without external files."""
from pathlib import Path
import base64
import json

root = Path(__file__).resolve().parent.parent
read = lambda filename: (root / filename).read_text()
font = lambda filename: base64.b64encode((root / filename).read_bytes()).decode()
style = read('style.css').replace('assets/workshop-pixel.ttf', 'data:font/ttf;base64,' + font('assets/workshop-pixel.ttf'))
workshop = read('index.html').replace('<link rel="stylesheet" href="style.css">', '<style>' + style + '</style>')
for filename in ['pixel-art.js', 'economy.js', 'game.js']:
    workshop = workshop.replace(f'  <script src="{filename}" defer></script>\n', '')
workshop = workshop.replace('href="index.html"', 'href="#workshop" data-workshop-home')
workshop = workshop.replace('href="pitch.html"', 'href="#pitch" data-return-pitch')
bridge = '''document.querySelector('[data-return-pitch]').addEventListener('click',e=>{e.preventDefault();parent.postMessage('safecracker:pitch','*');});
document.querySelector('[data-workshop-home]').addEventListener('click',e=>{e.preventDefault();document.getElementById('result-workshop').click();});'''
scripts = ['window.SafecrackerDemo=true;', read('pixel-art.js'), read('economy.js'), read('game.js'), bridge]
workshop = workshop.replace('</body>', '\n'.join('<script>' + source + '</script>' for source in scripts) + '\n</body>')

page = read('pitch.template.html')
for marker, filename in [('/* CSS */','pitch.css'), ('/* ART */','pixel-art.js'), ('/* GAME */','pitch.js')]:
    page = page.replace(marker,read(filename))
page = page.replace('/* FONT */',font('assets/workshop-pixel-tr.ttf'))
page = page.replace('/* WORKSHOP */',json.dumps(workshop,ensure_ascii=False).replace('<','\\u003c'))
(root / 'pitch.html').write_text(page)
print(f'pitch.html: {len(page.encode()):,} bytes; original workshop embedded offline')
