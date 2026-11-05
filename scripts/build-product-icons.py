"""Original outline glyphs for IDEA Workspace. Build: Python + fonttools 4.60.1."""
import math
import json
from pathlib import Path
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

ROOT = Path(__file__).resolve().parents[1]
paths = {}
pen = None

def polygon(points):
    pen.moveTo((round(points[0][0]*40), round((24-points[0][1])*40)))
    for x,y in points[1:]: pen.lineTo((round(x*40), round((24-y)*40)))
    pen.closePath()

def line(a,b,width=1.5):
    dx,dy=b[0]-a[0],b[1]-a[1]
    length=math.hypot(dx,dy)
    nx,ny=-dy/length*width/2,dx/length*width/2
    polygon([(a[0]+nx,a[1]+ny),(b[0]+nx,b[1]+ny),(b[0]-nx,b[1]-ny),(a[0]-nx,a[1]-ny)])

def path(points,closed=False):
    for a,b in zip(points,points[1:]):line(a,b)
    if closed:line(points[-1],points[0])

def circle(x,y,r):
    pts=[(x+math.cos(i*math.tau/32)*r,y+math.sin(i*math.tau/32)*r) for i in range(33)]
    path(pts)

def rect(x,y,w,h):path([(x,y),(x+w,y),(x+w,y+h),(x,y+h)],True)

def glyph(name,draw):
    global pen
    pen=TTGlyphPen(None);draw();paths[name]=pen.glyph()

glyph('.notdef',lambda:None)
glyph('files',lambda:path([(3,7),(9,7),(12,10),(21,10),(21,20),(3,20)],True))
glyph('search',lambda:(circle(10,10,6),line((14.5,14.5),(21,21))))
glyph('source-control',lambda:(circle(6,5,2.2),circle(6,19,2.2),circle(18,5,2.2),line((6,7.2),(6,16.8)),path([(18,7.2),(18,10),(6,15)])))
glyph('debug-alt',lambda:(rect(7,8,10,12),path([(9,8),(9,5),(15,5),(15,8)]),line((12,9),(12,19)),*[line(a,b) for a,b in [((3,10),(7,11)),((3,15),(7,15)),((3,20),(7,18)),((17,11),(21,10)),((17,15),(21,15)),((17,18),(21,20))]]))
glyph('extensions',lambda:tuple(rect(x,y,6,6) for x,y in [(3,4),(12,4),(3,13),(13,14)]))
glyph('terminal',lambda:(rect(2,4,20,16),path([(6,8),(10,12),(6,16)]),line((12,16),(18,16))))
glyph('settings-gear',lambda:(circle(12,12,4),circle(12,12,8),*[line((12+math.cos(i*math.tau/8)*8,12+math.sin(i*math.tau/8)*8),(12+math.cos(i*math.tau/8)*11,12+math.sin(i*math.tau/8)*11),2.5) for i in range(8)]))
glyph('account',lambda:(circle(12,8,4),path([(4,21),(4,18),(8,15),(16,15),(20,18),(20,21)])))
glyph('debug-start',lambda:path([(6,3),(21,12),(6,21)],True))
glyph('debug-pause',lambda:(rect(5,4,4,16),rect(15,4,4,16)))
glyph('debug-stop',lambda:rect(5,5,14,14))
glyph('close',lambda:(line((6,6),(18,18)),line((6,18),(18,6))))
glyph('chevron-right',lambda:path([(9,5),(16,12),(9,19)]))
glyph('chevron-down',lambda:path([(5,9),(12,16),(19,9)]))

# Semantic outline/navigation glyphs share the file icons' thin geometric language.
glyph('symbol-class',lambda:(circle(12,12,8),path([(14.8,8.5),(12,7.5),(9.3,9),(8.7,12),(9.3,15),(12,16.5),(14.8,15.5)])))
glyph('symbol-interface',lambda:(circle(12,12,8),line((9,7.5),(15,7.5)),line((12,7.5),(12,16.5)),line((9,16.5),(15,16.5))))
glyph('symbol-enum',lambda:(circle(12,12,8),path([(15,7.5),(9,7.5),(9,16.5),(15,16.5)]),line((9,12),(14,12))))
glyph('symbol-method',lambda:path([(12,4),(19,8),(19,16),(12,20),(5,16),(5,8)],True))
glyph('symbol-field',lambda:(circle(12,12,8),path([(15,7.5),(9,7.5),(9,17)]),line((9,12),(14,12))))
glyph('package',lambda:(path([(3,7),(12,2),(21,7),(21,17),(12,22),(3,17)],True),path([(3,7),(12,12),(21,7)]),line((12,12),(12,22))))
glyph('database',lambda:(path([(4,6),(6,3),(12,2),(18,3),(20,6),(18,9),(12,10),(6,9)],True),path([(4,6),(4,19),(6,21),(12,22),(18,21),(20,19),(20,6)]),path([(4,13),(6,15),(12,16),(18,15),(20,13)])))
glyph('testing',lambda:(path([(9,3),(9,10),(3,20),(5,22),(19,22),(21,20),(15,10),(15,3)]),line((7,3),(17,3)),line((6,16),(18,16))))
glyph('bell',lambda:(path([(5,17),(7,14),(7,8),(9,5),(15,5),(17,8),(17,14),(19,17)],True),line((10,21),(14,21)),line((12,2),(12,5))))
glyph('list-tree',lambda:(path([(4,3),(4,18),(8,18)]),path([(4,10),(8,10)]),rect(10,6,10,6),rect(10,15,10,6)))

names=list(paths)
fb=FontBuilder(1000,isTTF=True)
fb.setupGlyphOrder(names)
fb.setupCharacterMap({0xE000+i:name for i,name in enumerate(names[1:])})
fb.setupGlyf(paths)
fb.setupHorizontalMetrics({name:(960,0) for name in names})
fb.setupHorizontalHeader(ascent=960,descent=0)
fb.setupNameTable({'familyName':'NhpDev Workspace UI','styleName':'Regular','uniqueFontIdentifier':'NhpDev-Workspace-UI-1','fullName':'NhpDev Workspace UI','psName':'NhpDevWorkspaceUI','version':'Version 1.0','copyright':'Original glyphs, IDEA Workspace contributors. MIT License.'})
fb.setupOS2(sTypoAscender=960,sTypoDescender=0,usWinAscent=960,usWinDescent=0)
fb.setupPost();fb.setupMaxp()
fb.font.flavor='woff'
fb.save(ROOT/'media'/'workspace-ui.woff')
theme={'fonts':[{'id':'nhpdev-workspace-ui','src':[{'path':'../media/workspace-ui.woff','format':'woff'}],'weight':'normal','style':'normal'}], 'iconDefinitions':{name:{'fontCharacter':hex(0xE000+i).replace('0x','\\'),'fontId':'nhpdev-workspace-ui'} for i,name in enumerate(names[1:])}}
theme['iconDefinitions']['search-large']=theme['iconDefinitions']['search']
for alias,source in {'symbol-constructor':'symbol-class','symbol-property':'symbol-field','symbol-constant':'symbol-class','folder':'files','folder-opened':'files','beaker':'testing'}.items():
    theme['iconDefinitions'][alias]=theme['iconDefinitions'][source]
(ROOT/'themes'/'product-icons.json').write_text(json.dumps(theme,indent=2)+'\n')
print('Built',len(names)-1,'original product glyphs')
