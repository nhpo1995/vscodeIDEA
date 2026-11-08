"""Original small outline file icons, inspired by the supplied IDEA screenshot.
No third-party artwork or font dependency. Run with Python standard library.
"""
from pathlib import Path
import json

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'media'/'files'
OUT.mkdir(parents=True,exist_ok=True)
GRAY='#9DA0A8'; BLUE='#6C95EB'; GREEN='#6AAB73'; ORANGE='#CF8E6D'; YELLOW='#D6B46C'; PURPLE='#B990DB'; CYAN='#6CBCC5'
icons={}
def svg(name,body,color=GRAY):
    icons[name]={'iconPath':'../media/files/'+name+'.svg'}
    text=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="{color}" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">{body}</svg>\n'
    (OUT/(name+'.svg')).write_text(text)
def sheet(body='',color=GRAY):
    return '<path d="M3 1.5h6l4 4v9H3zM9 1.5v4h4"/>'+body

# Centered semantic marks; paired folder silhouettes preserve meaning when expanded.
FOLDER_MARKS = {
    'source': '<path d="m6 8-2 2 2 2m4-4 2 2-2 2"/>',
    'controller': '<path d="M8 7v3M4.5 10h7M4.5 10v2M11.5 10v2"/><circle cx="8" cy="7" r=".7"/>',
    'service': '<path d="M8 7v1m0 4v1m-3-3H4m8 0h-1M6 8 5 7m5 1 1-1m-5 5-1 1m5-1 1 1"/><circle cx="8" cy="10" r="2"/>',
    'repository': '<path d="m4 8 4-1.5L12 8l-4 1.5zm0 2 4 1.5 4-1.5M4 12l4 1.5 4-1.5"/>',
    'entity': '<path d="m5 8 3-1.5L11 8v4l-3 1.5L5 12zm0 0 3 1.5L11 8m-3 1.5v4"/>',
    'dto': '<rect x="4" y="7" width="4" height="4" rx=".5"/><rect x="8" y="10" width="4" height="3" rx=".5"/>',
    'mapper': '<path d="M4 8h8m-2-2 2 2-2 2M12 12H4m2-2-2 2 2 2"/>',
    'config': '<path d="M4 8h8M4 12h8"/><circle cx="6" cy="8" r="1"/><circle cx="10" cy="12" r="1"/>',
    'security': '<path d="M8 6.5 11 8v2c0 2-3 3.5-3 3.5S5 12 5 10V8z"/><path d="m6.5 10 1 1 2-2"/>',
    'resources': '<path d="m4 8 2 2 2-2 2 2 2-2M4 12h8"/>',
    'database': '<ellipse cx="8" cy="8" rx="3.5" ry="1.2"/><path d="M4.5 8v4c0 1.6 7 1.6 7 0V8m-7 2c0 1.6 7 1.6 7 0"/>',
    'docs': '<path d="M5.5 6.5h5v7h-5zM7 9h2M7 11h2"/>',
    'test': '<path d="M6 6.5h4M7 6.5v3l-2.5 4h7L9 9.5v-3M6 11h4"/>',
    'build': '<path d="m4.5 8 3.5-1.5L11.5 8v4.5L8 14l-3.5-1.5zm0 0L8 9.5 11.5 8M8 9.5V14"/>',
    'robot': '<path d="M8 6.5v1"/><rect x="4.5" y="7.5" width="7" height="5.5" rx="1"/><path d="M6.5 11.5h3"/><circle cx="6.5" cy="9.5" r=".5"/><circle cx="9.5" cy="9.5" r=".5"/>',
}
FOLDER_PALETTES = {
    'dark': {'gray':'#A6B0BF','blue':'#79A7F2','cyan':'#72C8D5','purple':'#BE9AE5','teal':'#62C6AD','orange':'#DFA17D','yellow':'#D8BD77','green':'#91BE82'},
    'light': {'gray':'#596B80','blue':'#356ABA','cyan':'#24758A','purple':'#8350AD','teal':'#247C69','orange':'#A45C30','yellow':'#8A6B19','green':'#467937'},
}
FOLDER_STYLES = {
    'folder': ('', 'gray'), 'source-folder': ('source','blue'),
    'controller-folder': ('controller','cyan'), 'service-folder': ('service','purple'),
    'repository-folder': ('repository','teal'), 'entity-folder': ('entity','orange'),
    'dto-folder': ('dto','cyan'), 'mapper-folder': ('mapper','purple'),
    'config-folder': ('config','gray'), 'security-folder': ('security','yellow'),
    'resource-folder': ('resources','yellow'), 'database-folder': ('database','teal'),
    'docs-folder': ('docs','blue'), 'ai-folder': ('robot','purple'),
    'test-folder': ('test','green'), 'build-folder': ('build','orange'),
}
for name, (mark, color_key) in FOLDER_STYLES.items():
    for mode, palette in FOLDER_PALETTES.items():
        for opened in (False, True):
            # Larger neutral frame within the native 16px slot; no row scaling.
            body = '<path d="M.75 3h5L7.5 4.75h7.75V15H.75z"/>'
            if opened:
                body = '<path d="M.75 11V3h5L7.5 4.75h7.75M2.25 5.5h13L13.75 15h-13z"/>'
            # Separate neutral silhouette and colored mark; inset leaves a gap
            # from both silhouettes without painting a theme-specific background.
            symbol = FOLDER_MARKS.get(mark, '')
            if symbol:
                body += f'<g stroke="{palette[color_key]}" transform="translate(.8 .8) scale(.9)">{symbol}</g>'
            suffix = ('-open' if opened else '') + ('-light' if mode == 'light' else '')
            svg(name + suffix, body, palette['gray'])
svg('root-folder','<path d="M1.5 4.5h4.8L8 6h6.5v7.5h-13z"/><rect x="10.5" y="10" width="4" height="4" fill="#25364C" stroke="'+BLUE+'"/>')
svg('file',sheet('<path d="M5.5 9h5M5.5 11h4"/>'))
svg('java','<circle cx="8" cy="8" r="6" fill="#25364C"/><path d="M10.5 5.5a3.3 3.3 0 1 0 0 5" stroke-width="1.2"/>',BLUE)
svg('java-interface','<circle cx="8" cy="8" r="6" fill="#25382B"/><path d="M6 5h4M8 5v6M6 11h4"/>',GREEN)
svg('java-enum','<circle cx="8" cy="8" r="6" fill="#3C3326"/><path d="M10 5H6v6h4M6 8h3.5"/>',YELLOW)
svg('package','<path d="m2.5 5 5.5-3 5.5 3v6L8 14l-5.5-3zM2.5 5 8 8l5.5-3M8 8v6M5 3.6l5.5 3v2"/>',YELLOW)
svg('kotlin','<path d="M2.5 2.5h11L8 8l5.5 5.5h-11z" fill="#40304F"/><path d="M5 5v6M10.5 5 6 8l4.5 3"/>',PURPLE)
svg('typescript','<rect x="1.5" y="1.5" width="13" height="13" rx="1.5" fill="#22344C"/><path d="M3.5 6h4M5.5 6v5M12 6H9v2.5h3V11H9"/>',BLUE)
svg('javascript','<rect x="1.5" y="1.5" width="13" height="13" rx="1.5" fill="#3C3525"/><path d="M6 6v4c0 1.5-3 1.5-3 0M12 6H9v2.5h3V11H9"/>',YELLOW)
svg('react','<circle cx="8" cy="8" r="1" fill="'+CYAN+'"/><ellipse cx="8" cy="8" rx="6.5" ry="2.5"/><ellipse cx="8" cy="8" rx="6.5" ry="2.5" transform="rotate(60 8 8)"/><ellipse cx="8" cy="8" rx="6.5" ry="2.5" transform="rotate(120 8 8)"/>',CYAN)
svg('json','<path d="M6 2.5H4.5v4L2.5 8l2 1.5v4H6M10 2.5h1.5v4l2 1.5-2 1.5v4H10"/><circle cx="8" cy="6" r=".5"/><circle cx="8" cy="10" r=".5"/>',YELLOW)
svg('xml','<path d="m5 4-4 4 4 4m6-8 4 4-4 4M9.5 2.5l-3 11"/>',ORANGE)
svg('html',sheet('<path d="m6 8-1.5 2L6 12m4-4 1.5 2-1.5 2M9 7.5l-2 5"/>'),ORANGE)
svg('css','<path d="M6 2.5 4 13.5M12 2.5l-2 11M2 6h12M1.5 10h12"/>',PURPLE)
svg('markdown','<rect x="1.5" y="3.5" width="13" height="9" rx="1"/><path d="M4 10V6l2 2 2-2v4M11.5 6v4M10 8.5l1.5 1.5L13 8.5"/>',BLUE)
svg('database','<ellipse cx="8" cy="3.5" rx="5.5" ry="2"/><path d="M2.5 3.5v9c0 2.7 11 2.7 11 0v-9M2.5 8c0 2.7 11 2.7 11 0"/>',CYAN)
svg('yaml','<path d="M3 3h2l2 3 2-3h2M7 6v3M3 11h10M3 13h7"/><circle cx="12.5" cy="6" r=".5"/><circle cx="12.5" cy="8.5" r=".5"/>',YELLOW)
svg('properties','<path d="M6 4h7M6 8h7M6 12h7"/><circle cx="3" cy="4" r="1"/><circle cx="3" cy="8" r="1"/><circle cx="3" cy="12" r="1"/>',ORANGE)
svg('shell','<rect x="1.5" y="2.5" width="13" height="11" rx="1.5"/><path d="m4 6 2.5 2L4 10M8.5 10h3"/>',GREEN)
svg('git','<circle cx="5" cy="3" r="1.5"/><circle cx="5" cy="13" r="1.5"/><circle cx="12" cy="4" r="1.5"/><path d="M5 4.5v7M12 5.5V8L5 10"/>',ORANGE)
svg('docker','<path d="M1.5 8.5h10.8l1-2.5 1.2 1.5H15c-.2 5-4.2 7.5-9 6L3 12z"/><path d="M4 8V5.5h2.5V8M7 8V5.5h2.5V8M7 5V2.5h2.5V5"/>',BLUE)
svg('maven','<path d="M2 11V5.5h2v1C6 4 8 5 8 7v4M8 7c2-3 5-2 5 0v4" stroke-width="1.3"/><path d="m11.5 2 3 1-2 2"/>',BLUE)
svg('gradle','<path d="M2 11V7c0-5 9-5 11-2v5l-2 2V7c-1 3-4 4-7 2v3H2z"/><circle cx="10" cy="5.5" r=".5" fill="'+GREEN+'"/>',GREEN)
svg('image',sheet('<circle cx="6" cy="7" r="1"/><path d="m4.5 12 2-2 1.5 1L10 8.5l2 3.5"/>'),PURPLE)
svg('archive',sheet('<path d="M7 3h2M7 5h2M7 7h2M7 9h2M7 11h2v2H7z"/>'),YELLOW)
svg('pdf',sheet('<path d="M5.5 12 8 6l2.5 6M6.5 10h3"/>'),'#D97979')
svg('config',sheet('<path d="M5 8h6M5 11h6"/><circle cx="7" cy="8" r="1"/><circle cx="9" cy="11" r="1"/>'))
svg('env','<path d="M3 3h10v10H3zM5 6l2 2-2 2M8.5 10h2.5"/>',GREEN)

mapping={
 'java':'java','class':'java','kt':'kotlin','kts':'kotlin','jar':'package',
 'ts':'typescript','js':'javascript','mjs':'javascript','cjs':'javascript','tsx':'react','jsx':'react',
 'json':'json','jsonc':'json','xml':'xml','html':'html','htm':'html','css':'css','scss':'css','less':'css',
 'md':'markdown','mdx':'markdown','sql':'database','db':'database','sqlite':'database',
 'yaml':'yaml','yml':'yaml','properties':'properties','conf':'config','ini':'config','toml':'config',
 'sh':'shell','bash':'shell','zsh':'shell','fish':'shell','bat':'shell','ps1':'shell',
 'png':'image','jpg':'image','jpeg':'image','gif':'image','webp':'image','svg':'image','ico':'image',
 'zip':'archive','gz':'archive','tar':'archive','7z':'archive','pdf':'pdf','gradle':'gradle','env':'env'}
filenames={'pom.xml':'maven','build.gradle':'gradle','settings.gradle':'gradle','build.gradle.kts':'gradle','settings.gradle.kts':'gradle','gradlew':'gradle','gradlew.bat':'gradle','mvnw':'maven','mvnw.cmd':'maven','package.json':'javascript','package-lock.json':'javascript','tsconfig.json':'typescript','jsconfig.json':'javascript','Dockerfile':'docker','docker-compose.yml':'docker','docker-compose.yaml':'docker','compose.yml':'docker','compose.yaml':'docker','.dockerignore':'docker','.gitignore':'git','.gitattributes':'git','.gitmodules':'git','.gitkeep':'git','.env':'env','.env.local':'env','.env.example':'env','package-info.java':'package','module-info.java':'package','README.md':'markdown','LICENSE':'file'}
# Exact, case-insensitive native folder associations; no wildcard scanning.
FOLDER_GROUPS = {
    'source-folder': 'src source sources main java kotlin',
    'controller-folder': 'controller controllers rest api',
    'service-folder': 'service services',
    'repository-folder': 'repository repositories',
    'entity-folder': 'entity entities model models domain enty',
    'dto-folder': 'dto dtos',
    'mapper-folder': 'mapper mappers mapping mappings',
    'config-folder': 'config configs configuration configurations .git .vscode .idea .mvn .gradle .openidea',
    'security-folder': 'security sercurity auth authentication authorization',
    'resource-folder': 'resource resources assets public static',
    'database-folder': 'data database databases db mysql_data mysql-data redis_data redis-data mysql redis migrations migration seed seeds',
    'docs-folder': 'doc docs document documents documentation',
    'ai-folder': 'agent agents .agent .agents codex .codex claude .claude ai .ai',
    'test-folder': 'test tests __tests__',
    'build-folder': 'target build dist out',
}
folders = {name: icon for icon, names in FOLDER_GROUPS.items() for name in names.split()}
theme={'iconDefinitions':icons,'file':'file','folder':'folder','folderExpanded':'folder-open','rootFolder':'root-folder','rootFolderExpanded':'folder-open','folderNames':folders,'folderNamesExpanded':{name:icon+'-open' for name,icon in folders.items()},'fileExtensions':mapping,'fileNames':filenames,'languageIds':{'java':'java','kotlin':'kotlin','typescript':'typescript','javascript':'javascript','typescriptreact':'react','javascriptreact':'react','json':'json','jsonc':'json','xml':'xml','html':'html','css':'css','scss':'css','less':'css','markdown':'markdown','sql':'database','yaml':'yaml','properties':'properties','shellscript':'shell','dockerfile':'docker','gitignore':'git'}}
theme['light'] = {
    'folder': 'folder-light', 'folderExpanded': 'folder-open-light',
    'rootFolderExpanded': 'folder-open-light',
    'folderNames': {name: icon + '-light' for name, icon in folders.items()},
    'folderNamesExpanded': {name: icon + '-open-light' for name, icon in folders.items()},
}
(ROOT/'themes'/'file-icons.json').write_text(json.dumps(theme,indent=2)+'\n')
print('Built',len(icons),'file/folder icons;',len(mapping),'extensions and',len(filenames),'filenames')
