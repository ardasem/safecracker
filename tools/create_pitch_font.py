"""Add Turkish glyphs to the original local pixel font for the pitch page only."""
from pathlib import Path
import json
from fontTools.ttLib import TTFont
from fontTools.pens.ttGlyphPen import TTGlyphPen
root = Path(__file__).resolve().parents[1]
patterns = json.loads((root / 'assets/pixel-glyphs.json').read_text())
font = TTFont(root / 'assets/workshop-pixel.ttf')
extras = {
    'Ç': (patterns['C'] + ['00100', '01000'], 6),
    'Ş': (patterns['S'] + ['00100', '01000'], 6),
    'Ö': (['01010', '00000'] + patterns['O'], 8),
    'Ü': (['01010', '00000'] + patterns['U'], 8),
    'Ğ': (['01010', '00100'] + patterns['G'], 8),
    'İ': (['010', '000'] + patterns['I'], 8),
    'ı': (patterns['I'], 6),
}
order = list(font.getGlyphOrder())
for char, (rows, baseline) in extras.items():
    name = 'turkish' + str(ord(char)); pen = TTGlyphPen(None)
    for y, row in enumerate(rows):
        for x, cell in enumerate(row):
            if cell != '1': continue
            left = x * 100; bottom = (baseline - y) * 100
            pen.moveTo((left, bottom)); pen.lineTo((left+100, bottom)); pen.lineTo((left+100, bottom+100)); pen.lineTo((left, bottom+100)); pen.closePath()
    font['glyf'][name] = pen.glyph(); font['hmtx'][name] = ((len(rows[0])+1)*100, 0); order.append(name)
    for table in font['cmap'].tables:
        if table.isUnicode():
            table.cmap[ord(char)] = name
            if char != 'İ': table.cmap[ord(char.lower())] = name
            else: table.cmap[ord('i')] = name
font.setGlyphOrder(order)
font['OS/2'].usWinAscent = 900
for record in font['name'].names:
    if record.nameID in [1,4,6]:
        value = 'WorkshopPixelTR' if record.nameID == 6 else 'Workshop Pixel TR'
        record.string = value.encode(record.getEncoding())
font.save(root / 'assets/workshop-pixel-tr.ttf')
print('Created Turkish pitch font')
