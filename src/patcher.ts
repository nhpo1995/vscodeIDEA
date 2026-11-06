import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
const START='<!-- idea-workspace:start -->';
const END='<!-- idea-workspace:end -->';
function strip(html:string):string {
  const start=html.indexOf(START), end=html.indexOf(END);
  if(start<0 && end<0) return html;
  if(start<0 || end<start || html.indexOf(START,start+START.length)>=0 || html.indexOf(END,end+END.length)>=0) throw new Error('Custom UI markers are damaged. No file was changed.');
  return html.slice(0,start)+html.slice(end+END.length);
}
async function replaceFile(target:string,content:string):Promise<void>{
  const stat=await fs.stat(target);
  const temp=target+'.idea-'+randomUUID()+'.tmp';
  try {
    await fs.writeFile(temp,content,{mode:stat.mode,flag:'wx'});
    if(process.platform!=='win32'){
      const created=await fs.stat(temp);
      if(created.uid!==stat.uid || created.gid!==stat.gid)await fs.chown(temp,stat.uid,stat.gid);
      await fs.chmod(temp,stat.mode & 0o777);
    }
    await fs.rename(temp,target);
  }
  finally {await fs.rm(temp,{force:true}).catch(()=>undefined);}
}
function rendererName(source:string):string{return 'idea-workspace-menu-'+createHash('sha256').update(source).digest('hex').slice(0,32)+'.js';}
export function renderPatch(css:string,renderer?:string):string{
 return START+'<style id="idea-workspace-custom-ui">'+css+'</style>'+(renderer?'<script type="module" src="./'+rendererName(renderer)+'"></script>':'')+END;
}
export async function rendererAssetValid(target:string,source:string):Promise<boolean>{
 try{const file=path.join(path.dirname(target),rendererName(source));return !(await fs.lstat(file)).isSymbolicLink() && await fs.readFile(file,'utf8')===source;}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return false;throw error;}
}
async function removeRendererAssets(target:string,html:string,keep?:string):Promise<void>{
 const a=html.indexOf(START),b=html.indexOf(END);if(a<0||b<a)return;
 for(const match of html.slice(a,b).matchAll(/src="\.\/(idea-workspace-menu-([a-f0-9]{32})\.js)"/g)){
  if(match[1]===keep)continue;
  const file=path.join(path.dirname(target),match[1]);
  try{if(!(await fs.lstat(file)).isSymbolicLink() && createHash('sha256').update(await fs.readFile(file)).digest('hex').slice(0,32)===match[2])await fs.unlink(file);}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
 }
}
export async function applyPatch(target:string,storage:string,css:string,version:string,renderer?:string):Promise<boolean>{
  if(/<\//i.test(css)) throw new Error('CSS contains an HTML closing tag.');
  const current=await fs.readFile(target,'utf8');
  const clean=strip(current);
  if(!/<\/head\s*>/i.test(clean)) throw new Error('Unsupported workbench HTML: no head element.');
  const meta=clean.match(/<meta\b[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/i)?.[0];
  const content=meta?.match(/content="([^"]*)"/i)?.[1];
  if(!content || !/style-src\s+[^;]*'unsafe-inline'/i.test(content) || !/img-src\s+[^;]*\bdata:/i.test(content)) throw new Error('Unsupported workbench CSP. This extension will not disable CSP.');
  if(renderer && !/script-src\s+[^;]*'self'/i.test(content))throw new Error('Unsupported renderer CSP. This extension will not disable CSP.');
  let assetChanged=false;
  if(renderer && !await rendererAssetValid(target,renderer)){
   const file=path.join(path.dirname(target),rendererName(renderer));
   try{const stat=await fs.lstat(file);if(stat.isSymbolicLink()||!stat.isFile())throw Error('Refusing non-file renderer asset.');await replaceFile(file,renderer);}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;await fs.writeFile(file,renderer,{flag:'wx',mode:(await fs.stat(target)).mode});}
   assetChanged=true;
  }
  const block=renderPatch(css,renderer);
  const next=clean.replace(/<\/head\s*>/i,block+'</head>');
  if(next===current) return assetChanged;
  await fs.mkdir(storage,{recursive:true});
  const hash=createHash('sha256').update(clean).digest('hex');
  const backup=path.join(storage,version.replace(/[^\w.-]/g,'_')+'-'+hash+'.html');
  try{await fs.writeFile(backup,clean,{flag:'wx'});}catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST')throw e;}
  await replaceFile(target,next);
  await removeRendererAssets(target,current,renderer?rendererName(renderer):undefined);
  return true;
}
export async function restorePatch(target:string):Promise<boolean>{
  const current=await fs.readFile(target,'utf8'), clean=strip(current);
  if(clean===current)return false;
  await replaceFile(target,clean);await removeRendererAssets(target,current);return true;
}
export async function findWorkbench(appRoot:string):Promise<string>{
  for(const rel of ['out/vs/code/electron-browser/workbench/workbench.html','out/vs/code/electron-sandbox/workbench/workbench.html']){
    const candidate=path.join(appRoot,rel);
    try{await fs.access(candidate);return candidate;}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
  }
  throw new Error('Unsupported VS Code desktop layout. No files were changed.');
}
export async function logoDataUri(file:string):Promise<string>{
  const stat=await fs.stat(file);
  if(stat.size>1024*1024)throw new Error('Logo must be at most 1 MB.');
  const data=await fs.readFile(file),ext=path.extname(file).toLowerCase();
  if(ext==='.svg'){
    const text=data.toString('utf8');
    if(!/<svg\b/i.test(text)||!/<\/svg\s*>/i.test(text)||/<(?:script|foreignObject|iframe|image|use|style|animate|set)\b|\bon\w+\s*=|\b(?:href|src)\s*=|<!DOCTYPE|<!ENTITY|url\s*\(|<\?xml-stylesheet/i.test(text))throw new Error('SVG must be a self-contained static vector without scripts, references or embedded content.');
    return 'data:image/svg+xml;base64,'+data.toString('base64');
  }
  if(ext==='.png'){
    if(data.length<24 || !data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) || data.toString('ascii',12,16)!=='IHDR')throw new Error('Invalid PNG logo.');
    return 'data:image/png;base64,'+data.toString('base64');
  }
  throw new Error('Choose an SVG or PNG logo.');
}
export function renderCss(uri:string,compact:boolean,wordmark=false,navigation=false):string{
  if(!/^data:image\/(?:png|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(uri))throw new Error('Invalid logo data URI.');
  return `/* idea-workspace:ui-0.4.1 — appearance only */
.monaco-workbench .part.titlebar .window-appicon {
 background-image: url("${uri}") !important;
 background-size: ${wordmark?'100px 28px':'24px 24px'} !important;
 background-position: center !important;
 background-repeat: no-repeat !important;
 background-color: transparent !important;
 filter: none !important;
 width: ${wordmark?108:32}px !important; height: 28px !important; margin: 0 6px;
 border-radius: 5px; align-self: center;
}
.monaco-workbench .part.titlebar .window-appicon.codicon::before { content: "" !important; }
.monaco-workbench {
 --idea-surface: #1E1F22; --idea-border: #34373B; --idea-hover: #34373B;
 --vscode-cornerRadius-medium: 5px;
}
.monaco-workbench .part.titlebar { border-bottom: 1px solid var(--idea-border); background-image: linear-gradient(105deg, #214447 0%, #243536 28%, #202326 55%, #1E1F22 100%) !important; }
.monaco-workbench .part.titlebar > .titlebar-container { background-color: transparent !important; }
.monaco-workbench .part.titlebar.inactive { background-image: linear-gradient(105deg, #263B3D 0%, #252D2F 32%, #1E1F22 72%) !important; }
.monaco-workbench .part.titlebar .menubar-menu-button { border-radius: 5px; }
.monaco-workbench .part.titlebar .command-center .action-item.command-center-center {
 background: rgba(18, 22, 24, .35) !important; border-color: rgba(125, 171, 171, .2) !important;
 border-radius: 5px !important; max-width: 340px !important;
}
.monaco-workbench .part.titlebar .command-center .action-item.command-center-center:hover { border-color: #6F737A !important; }
.monaco-workbench .part.activitybar { border-right: 1px solid var(--idea-border); }
.monaco-workbench .part.activitybar .monaco-action-bar .action-item .action-label {
 border-radius: 7px; color: #9DA0A8;
}
.monaco-workbench .part.activitybar .monaco-action-bar .action-item.checked .action-label {
 color: #DFE1E5 !important; background-color: #2E436E;
}
.monaco-workbench .part.activitybar .active-item-indicator { border-left: 0 !important; }
.monaco-workbench .part.sidebar, .monaco-workbench .part.auxiliarybar { border-color: var(--idea-border); }
.monaco-workbench .part.sidebar .composite.title,
.monaco-workbench .part.auxiliarybar .composite.title { text-transform: none; font-size: 13px; font-weight: 500; }
.monaco-workbench .part.sidebar .composite.title .title-label h2 { font-size: 13px; font-weight: 500; text-transform: none; }
.monaco-workbench .part.sidebar .pane-header { font-weight: 500; border-color: var(--idea-border); }
.monaco-workbench .part.sidebar .monaco-list-row { border-radius: 4px; }
.monaco-workbench .part.sidebar .monaco-list-row .label-name { font-size: 13px; }
.monaco-workbench .part.editor .tabs-and-actions-container { background: var(--idea-surface); }
.monaco-workbench .part.editor .tabs-container .tab { border-radius: 0 !important; font-size: 13px; }
.monaco-workbench .part.editor .tabs-container .tab.active { box-shadow: inset 0 -2px #6C8FFF !important; }
.monaco-workbench .part.editor .tab.active .tab-fill { box-shadow: inset 0 -2px #6C8FFF !important; background-color: var(--vscode-tab-activeBackground) !important; border-radius: 0 !important; }
.monaco-workbench .part.editor, .monaco-workbench .part.sidebar, .monaco-workbench .part.panel { border-radius: 0 !important; }
.monaco-workbench .part.editor .tabs-container .tab .tab-border-top-container { background: transparent !important; }
.monaco-workbench .part.editor .editor-actions .action-label { border-radius: 5px; }
.monaco-workbench .part.editor .editor-actions .action-label.codicon-debug-start { color: #6AAB73; }
.monaco-workbench .part.editor .editor-actions .action-label.codicon-debug-alt { color: #6AAB73; }
.monaco-workbench .part.editor .breadcrumbs-below-tabs { border-bottom: 1px solid var(--idea-border); }
.monaco-workbench .part.panel .composite.title { border-bottom: 1px solid var(--idea-border); }
.monaco-workbench .part.panel .composite-bar .action-label { text-transform: none; font-size: 12px; }
.monaco-workbench .part.titlebar { font-size: 14px !important; }
.monaco-workbench .part.titlebar .menubar-menu-button, .monaco-workbench .part.titlebar .window-title { font-size: 14px !important; }
.monaco-workbench .part.statusbar, .monaco-workbench .part.statusbar .statusbar-item { border-color: var(--idea-border); font-size: 13px !important; }
.monaco-workbench .monaco-scrollable-element > .scrollbar > .slider { border-radius: 5px; }
.monaco-workbench .quick-input-widget { border: 1px solid #4E5157; border-radius: 8px; }
${navigation?`/* idea-workspace:navigation-1 — preserve native geometry and interaction */
.monaco-workbench .part.sidebar, .monaco-workbench .part.auxiliarybar {
 border-radius: 10px !important;
 outline: 1px solid var(--idea-border); outline-offset: -1px;
}
.monaco-workbench .part.sidebar .composite.title,
.monaco-workbench .part.auxiliarybar .composite.title { border-radius: 10px 10px 0 0; }
.monaco-workbench .part.activitybar .action-item:hover .action-label { background-color: #34373B; }
.monaco-workbench .part.activitybar .action-item.checked .action-label { background-color: #35404D; }
.monaco-workbench .quick-input-widget {
 border: 1px solid #4E5157 !important; border-radius: 10px !important;
 box-shadow: 0 12px 32px #00000066 !important;
 background: var(--vscode-quickInput-background, #2B2D30) !important;
}
.monaco-workbench .quick-input-widget .monaco-inputbox { border-radius: 6px !important; }
.monaco-workbench .quick-input-widget .monaco-list-row { border-radius: 5px; }
.monaco-workbench .quick-input-widget .monaco-list-row.focused { outline-offset: -1px; }
.monaco-workbench .monaco-menu .monaco-action-bar.vertical .action-item .action-label { border-radius: 5px; }
`:''}
${compact?`.monaco-workbench .part.sidebar .composite.title { padding-left: 12px; }`:''}`;
}
