import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
const START='<!-- idea-workspace:start -->';
const END='<!-- idea-workspace:end -->';
const STARTUP_START='<!-- idea-workspace:startup:start -->';
const STARTUP_END='<!-- idea-workspace:startup:end -->';
const digest=(source:string)=>createHash('sha256').update(source).digest('hex').slice(0,32);
interface NativeStartup {original:string;bootstrap:string;core:string}
function startupMetadata(html:string):NativeStartup|undefined{
 const a=html.indexOf(STARTUP_START),b=html.indexOf(STARTUP_END);
 if(a<0&&b<0){return;}
 if(a<0||b<a||html.includes(STARTUP_START,a+1)||html.includes(STARTUP_END,b+1)){throw new Error('Owned startup markers are damaged. No file was changed.');}
 const encoded=/<!-- original:([A-Za-z0-9+/=]+) -->/.exec(html.slice(a,b))?.[1];
 let value:NativeStartup;try{value=JSON.parse(Buffer.from(encoded??'','base64').toString('utf8'));}catch{throw new Error('Owned startup markers are damaged. No file was changed.');}
 if(!value||typeof value.original!=='string'||typeof value.bootstrap!=='string'||typeof value.core!=='string'||!/^<script\s[^>]*>\s*<\/script>$/i.test(value.original)||!/^idea-workspace-startup-[a-f0-9]{32}\.js$/.test(value.bootstrap)||!/^idea-workspace-native-[a-f0-9]{32}\.js$/.test(value.core)||!/^<script\s+(?:src="\.\/workbench\.js"\s+type="module"|type="module"\s+src="\.\/workbench\.js")\s*>\s*<\/script>$/.test(value.original)){throw new Error('Owned startup markers are damaged. No file was changed.');}
 const block=html.slice(a,b+STARTUP_END.length);
 if(block!==startupBlock(value)){throw new Error('Owned startup markers are damaged. No file was changed.');}
 return value;
}
function startupBlock(value:NativeStartup):string{return STARTUP_START+'<!-- original:'+Buffer.from(JSON.stringify(value)).toString('base64')+' --><script src="./'+value.bootstrap+'" type="module"></script>'+STARTUP_END;}
export function stripNativeStartup(html:string):string{
 const metadata=startupMetadata(html);if(!metadata){return html;}
 return html.slice(0,html.indexOf(STARTUP_START))+metadata.original+html.slice(html.indexOf(STARTUP_END)+STARTUP_END.length);
}
interface NativeRailPlan {bootstrap:string;core:string;bootstrapSource:string;coreSource:string}
let railPlanCache:{key:string;plan:NativeRailPlan}|undefined;
async function nativeRailPlan(target:string,source:string):Promise<NativeRailPlan|undefined>{
 const dir=path.dirname(target),coreFile=path.resolve(dir,'../../../workbench/workbench.desktop.main.js'),bootstrapFile=path.join(dir,'workbench.js');
 let coreStat,bootStat;try{[coreStat,bootStat]=await Promise.all([fs.lstat(coreFile),fs.lstat(bootstrapFile)]);}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT'){return;}throw error;}
 if(coreStat.isSymbolicLink()||bootStat.isSymbolicLink()||!coreStat.isFile()||!bootStat.isFile()){throw new Error('Refusing non-file native workbench modules.');}
 const key=JSON.stringify([target,digest(source),coreStat.size,coreStat.mtimeMs,bootStat.size,bootStat.mtimeMs]);if(railPlanCache?.key===key){return railPlanCache.plan;}
 const [core,bootstrap]=await Promise.all([fs.readFile(coreFile,'utf8'),fs.readFile(bootstrapFile,'utf8')]);
 const hook=/this\.workbenchGrid=([A-Za-z_$][\w$]*),this\.workbenchGrid\.edgeSnapping=/g,loader=/await import\(([A-Za-z_$][\w$]*)\)/g;
 if([...core.matchAll(hook)].length!==1||[...bootstrap.matchAll(loader)].length!==1){return;}
 const coreSource=source+'\n'+core.replace(hook,'this.workbenchGrid=$1,ideaWorkspaceInstallNativeRail(this),this.workbenchGrid.edgeSnapping=');
 const coreName='idea-workspace-native-'+digest(coreSource)+'.js';
 const bootstrapSource=bootstrap.replace(loader,(_match,original:string)=>'await import(new URL("../../../workbench/'+coreName+'",import.meta.url).href).catch(()=>import('+original+'))');
 const plan={core:coreName,bootstrap:'idea-workspace-startup-'+digest(bootstrapSource)+'.js',bootstrapSource,coreSource};railPlanCache={key,plan};return plan;
}
export async function nativeRailSupported(target:string,source:string):Promise<boolean>{
 const clean=stripNativeStartup(await fs.readFile(target,'utf8'));
 return /<script\s+(?:src="\.\/workbench\.js"\s+type="module"|type="module"\s+src="\.\/workbench\.js")\s*>\s*<\/script>/.test(clean)&&!!await nativeRailPlan(target,source);
}
export async function nativeRailAssetsValid(target:string,source:string):Promise<boolean>{
 const plan=await nativeRailPlan(target,source);if(!plan){return true;}
 const metadata=startupMetadata(await fs.readFile(target,'utf8'));if(metadata?.core!==plan.core||metadata.bootstrap!==plan.bootstrap){return false;}
 return await ownedAssetValid(path.join(path.dirname(target),plan.bootstrap),plan.bootstrapSource) &&
  await ownedAssetValid(path.resolve(path.dirname(target),'../../../workbench',plan.core),plan.coreSource);
}
async function ownedAssetValid(file:string,content:string):Promise<boolean>{
 try{return !(await fs.lstat(file)).isSymbolicLink() && await fs.readFile(file,'utf8')===content;}
 catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT'){return false;}throw error;}
}
async function writeOwnedAsset(file:string,content:string,target:string):Promise<void>{
 try{const stat=await fs.lstat(file);if(stat.isSymbolicLink()||!stat.isFile()){throw new Error('Refusing non-file owned asset.');}if(await fs.readFile(file,'utf8')!==content){await replaceFile(file,content);}}
 catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT'){throw error;}await createOwnedAsset(file,content,target);}
}
async function createOwnedAsset(file:string,content:string,target:string):Promise<void>{
 const mode=(await fs.stat(target)).mode & 0o777;
 const handle=await fs.open(file,'wx',mode);
 try{
  await handle.writeFile(content);
  // An administrator's private umask must not make shared workbench JS unreadable.
  if(process.platform!=='win32'){await handle.chmod(mode);}
 }finally{await handle.close();}
}
async function removeNativeAssets(target:string,html:string,keep?:NativeRailPlan):Promise<void>{
 const metadata=startupMetadata(html);if(!metadata){return;}
 const assets=[[metadata.bootstrap,path.dirname(target)],[metadata.core,path.resolve(path.dirname(target),'../../../workbench')]];
 await Promise.all(assets.filter(([name])=>name!==keep?.core&&name!==keep?.bootstrap).map(async([name,dir])=>{
  const file=path.join(dir,name);
  try{if(!(await fs.lstat(file)).isSymbolicLink()&&digest(await fs.readFile(file,'utf8'))===/-([a-f0-9]{32})\.js$/.exec(name)?.[1]){await fs.unlink(file);}}
  catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT'){throw error;}}
 }));
}

function strip(html:string):string {
  html=stripNativeStartup(html);
  const start=html.indexOf(START), end=html.indexOf(END);
  if(start<0 && end<0) {return html;}
  if(start<0 || end<start || html.includes(START,start+START.length) || html.includes(END,end+END.length)) {throw new Error('Custom UI markers are damaged. No file was changed.');}
  return html.slice(0,start)+html.slice(end+END.length);
}
async function replaceFile(target:string,content:string):Promise<void>{
  const stat=await fs.stat(target);
  const temp=target+'.idea-'+randomUUID()+'.tmp';
  try {
    await fs.writeFile(temp,content,{mode:stat.mode,flag:'wx'});
    if(process.platform!=='win32'){
      const created=await fs.stat(temp);
      if(created.uid!==stat.uid || created.gid!==stat.gid){await fs.chown(temp,stat.uid,stat.gid);}
      await fs.chmod(temp,stat.mode & 0o777);
    }
    await fs.rename(temp,target);
  }
  finally {await fs.rm(temp,{force:true}).catch(()=>undefined);}
}
function rendererName(source:string):string{return 'idea-workspace-menu-'+createHash('sha256').update(source).digest('hex').slice(0,32)+'.js';}
export function renderPatch(css:string,renderer?:string,rail?:string):string{
 return START+'<style id="idea-workspace-custom-ui">'+css+'</style>'+(renderer?'<script type="module" src="./'+rendererName(renderer)+'"></script>':'')+(rail?'<!-- idea-workspace:rail:'+digest(rail)+' -->':'')+END;
}
export async function rendererAssetValid(target:string,source:string):Promise<boolean>{
 try{const file=path.join(path.dirname(target),rendererName(source));return !(await fs.lstat(file)).isSymbolicLink() && await fs.readFile(file,'utf8')===source;}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT'){return false;}throw error;}
}
async function removeRendererAssets(target:string,html:string,keep?:string):Promise<void>{
 const a=html.indexOf(START),b=html.indexOf(END);if(a<0||b<a){return;}
 const matches=[...html.slice(a,b).matchAll(/src="\.\/(idea-workspace-menu-([a-f0-9]{32})\.js)"/g)];
 await Promise.all(matches.filter(match=>match[1]!==keep).map(async match=>{
  const file=path.join(path.dirname(target),match[1]);
  try{if(!(await fs.lstat(file)).isSymbolicLink() && createHash('sha256').update(await fs.readFile(file)).digest('hex').slice(0,32)===match[2]){await fs.unlink(file);}}
  catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT'){throw error;}}
 }));
}
function cspAllows(content:string,directive:string,source:string):boolean{
 const tokens=content.split(';').map(value=>value.trim().split(/\s+/)).find(parts=>parts[0].toLowerCase()===directive);
 return tokens?.slice(1).some(token=>token.toLowerCase()===source)??false;
}
function validateCsp(html:string,needsScripts:boolean):void{
 const meta=/<meta\b[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/i.exec(html)?.[0];
 const content=/content="([^"]*)"/i.exec(meta??'')?.[1];
 if(!content || !cspAllows(content,'style-src',"'unsafe-inline'") || !cspAllows(content,'img-src','data:')){
  throw new Error('Unsupported workbench CSP. This extension will not disable CSP.');
 }
 if(needsScripts && !cspAllows(content,'script-src',"'self'")){
  throw new Error('Unsupported renderer CSP. This extension will not disable CSP.');
 }
}
async function installRenderer(target:string,renderer:string):Promise<boolean>{
 if(await rendererAssetValid(target,renderer))return false;
 await writeOwnedAsset(path.join(path.dirname(target),rendererName(renderer)),renderer,target);
 return true;
}
export async function applyPatch(target:string,storage:string,css:string,version:string,renderer?:string,rail?:string):Promise<boolean>{
  if(/<\//i.test(css)) {throw new Error('CSS contains an HTML closing tag.');}
  const current=await fs.readFile(target,'utf8');
  const clean=strip(current);
  if(!/<\/head\s*>/i.test(clean)) {throw new Error('Unsupported workbench HTML: no head element.');}
  validateCsp(clean,!!(renderer||rail));
  let assetChanged=renderer?await installRenderer(target,renderer):false;
  const native=rail && await nativeRailSupported(target,rail)?await nativeRailPlan(target,rail):undefined;
  const block=renderPatch(css,renderer,rail);
  let next=clean.replace(/<\/head\s*>/i,block+'</head>');
  if(native){
   const original=/<script\s+(?:src="\.\/workbench\.js"\s+type="module"|type="module"\s+src="\.\/workbench\.js")\s*>\s*<\/script>/.exec(clean)?.[0];
   if(!original){throw new Error('Unsupported native workbench startup. No startup was changed.');}
   const valid=await nativeRailAssetsValid(target,rail!);
   await writeOwnedAsset(path.resolve(path.dirname(target),'../../../workbench',native.core),native.coreSource,target);
   await writeOwnedAsset(path.join(path.dirname(target),native.bootstrap),native.bootstrapSource,target);
   assetChanged ||= !valid;
   next=next.replace(original,startupBlock({original,bootstrap:native.bootstrap,core:native.core}));
  }
  if(next===current) {return assetChanged;}
  await fs.mkdir(storage,{recursive:true});
  const hash=createHash('sha256').update(clean).digest('hex');
  const backup=path.join(storage,version.replace(/[^\w.-]/g,'_')+'-'+hash+'.html');
  try{await fs.writeFile(backup,clean,{flag:'wx'});}catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST'){throw e;}}
  await replaceFile(target,next);
  await removeRendererAssets(target,current,renderer?rendererName(renderer):undefined);
  await removeNativeAssets(target,current,native);
  return true;
}
export async function restorePatch(target:string):Promise<boolean>{
  const current=await fs.readFile(target,'utf8'), clean=strip(current);
  if(clean===current){return false;}
  await replaceFile(target,clean);await removeRendererAssets(target,current);await removeNativeAssets(target,current);return true;
}
export async function findWorkbench(appRoot:string):Promise<string>{
  const browser=path.join(appRoot,'out/vs/code/electron-browser/workbench/workbench.html');
  if(await workbenchExists(browser))return browser;
  const sandbox=path.join(appRoot,'out/vs/code/electron-sandbox/workbench/workbench.html');
  if(await workbenchExists(sandbox))return sandbox;
  throw new Error('Unsupported VS Code desktop layout. No files were changed.');
}
async function workbenchExists(candidate:string):Promise<boolean>{
 try{await fs.access(candidate);return true;}
 catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT'){return false;}throw error;}
}
export async function logoDataUri(file:string):Promise<string>{
  const stat=await fs.stat(file);
  if(stat.size>1024*1024){throw new Error('Logo must be at most 1 MB.');}
  const data=await fs.readFile(file),ext=path.extname(file).toLowerCase();
  if(ext==='.svg'){
    const text=data.toString('utf8');
    if(!/<svg\b/i.test(text)||!/<\/svg\s*>/i.test(text)||/<(?:script|foreignObject|iframe|image|use|style|animate|set)\b/i.test(text)||/\bon\w+\s*=|\b(?:href|src)\s*=|<!DOCTYPE|<!ENTITY|url\s*\(|<\?xml-stylesheet/i.test(text)){throw new Error('SVG must be a self-contained static vector without scripts, references or embedded content.');}
    return 'data:image/svg+xml;base64,'+data.toString('base64');
  }
  if(ext==='.png'){
    if(data.length<24 || !data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) || data.toString('ascii',12,16)!=='IHDR'){throw new Error('Invalid PNG logo.');}
    return 'data:image/png;base64,'+data.toString('base64');
  }
  throw new Error('Choose an SVG or PNG logo.');
}
export function renderCss(uri:string,compact:boolean,wordmark=false,navigation=false):string{
  if(!/^data:image\/(?:png|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(uri)){throw new Error('Invalid logo data URI.');}
  const navigationCss=navigation?`/* idea-workspace:search-2 — visible compact native search and menu lifecycle */
/* Keep all native window controls visible with stable hit targets and theme-aware hover feedback. */
.monaco-workbench .part.titlebar .idea-workspace-window-controls { display:flex !important; align-items:center !important; width:auto !important; background:transparent !important; color:var(--idea-frame-foreground,var(--vscode-foreground)) !important; app-region:no-drag; -webkit-app-region:no-drag; }
.monaco-workbench.fullscreen .part.titlebar .idea-workspace-window-controls { display:none !important; }
.idea-workspace-menu-enhanced .monaco-workbench .part.titlebar .action-toolbar-container .action-item:has(> .action-label:is([class*="codicon-panel-left"],[class*="codicon-panel-right"],[class*="codicon-panel-layout-icon"],[class*="codicon-auxiliarybar-"])) { display:none !important; }
.monaco-workbench .part.titlebar .idea-workspace-window-controls > .window-icon { display:flex !important; flex:0 0 30px !important; align-items:center !important; justify-content:center !important; width:30px !important; height:28px !important; box-sizing:border-box !important; margin:0 2px !important; padding:0 !important; border:0 !important; border-radius:4px !important; background:transparent !important; color:inherit !important; }
.monaco-workbench .part.titlebar .idea-workspace-window-controls > .window-icon:is(:hover,:focus-visible) { color:var(--vscode-focusBorder) !important; }
.monaco-workbench .part.titlebar .idea-workspace-window-controls > .window-close:is(:hover,:focus-visible) { color:var(--vscode-errorForeground,#e5534b) !important; }
.monaco-workbench .part.titlebar .idea-workspace-window-controls > .window-icon::before { color:inherit !important; }
.monaco-workbench .part.titlebar .idea-workspace-window-controls > .window-icon:focus-visible { outline:1px solid var(--vscode-focusBorder); outline-offset:1px; }
@media (prefers-reduced-motion:no-preference) { .monaco-workbench .part.titlebar .idea-workspace-window-controls > .window-icon { transition:color 120ms ease; } }
.idea-workspace-menu-enhanced .monaco-workbench .part.titlebar .titlebar-container:has(.command-center-quick-pick) > .titlebar-left { flex: 1 1 auto !important; min-width: 0; }
.idea-workspace-menu-enhanced .monaco-workbench .part.titlebar .titlebar-container:has(.command-center-quick-pick) > .titlebar-center { position:absolute !important; left:50% !important; top:0 !important; height:100% !important; transform:translateX(-50%) !important; flex:0 0 auto !important; width:clamp(160px,20vw,240px) !important; max-width:none !important; min-width:0 !important; margin:0 !important; z-index:1; }
.idea-workspace-menu-enhanced .monaco-workbench .part.titlebar .titlebar-container:has(.command-center-quick-pick) > .titlebar-right { flex: 0 0 auto !important; }
.idea-workspace-menu-enhanced .monaco-workbench .part.titlebar .command-center .action-item.command-center-center { display:flex !important; width:100% !important; max-width:100% !important; height:28px !important; box-sizing:border-box !important; margin:0 !important; padding:0 !important; border:1px solid var(--vscode-commandCenter-border,transparent) !important; border-radius:6px !important; background:var(--vscode-commandCenter-background,transparent) !important; color:var(--vscode-commandCenter-foreground,var(--idea-frame-foreground)) !important; }
.idea-workspace-menu-enhanced .monaco-workbench .part.titlebar .command-center .command-center-quick-pick { display:flex !important; flex:1 1 auto !important; min-width:0 !important; width:100% !important; height:26px !important; box-sizing:border-box !important; margin:0 !important; padding:0 10px !important; gap:8px; justify-content:flex-start !important; align-items:center !important; app-region:no-drag; -webkit-app-region:no-drag; }
.idea-workspace-menu-enhanced .monaco-workbench .part.titlebar .command-center .command-center-quick-pick::before { content:""; display:block; flex:0 0 16px; width:16px; height:16px; background:currentColor; mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Ccircle cx='6.5' cy='6.5' r='4.5' fill='none' stroke='black' stroke-width='1.4'/%3E%3Cpath d='m10 10 4 4' stroke='black' stroke-width='1.4'/%3E%3C/svg%3E") center/contain no-repeat; }
.idea-workspace-menu-enhanced .monaco-workbench .part.titlebar .command-center .command-center-quick-pick .search-label { position:static !important; flex:1 1 auto; min-width:0; width:auto !important; height:auto !important; clip-path:none !important; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
/* Reserve only the compact control; opening native Quick Input never changes this geometry. */
.idea-workspace-menu-enhanced .monaco-workbench .part.titlebar .titlebar-center:has(.command-center-quick-pick) .window-title { flex:1 1 auto !important; width:100% !important; min-width:0; }
.idea-workspace-menu-enhanced .monaco-workbench .part.titlebar .command-center,
.idea-workspace-menu-enhanced .monaco-workbench .part.titlebar .command-center .monaco-toolbar,
.idea-workspace-menu-enhanced .monaco-workbench .part.titlebar .command-center .actions-container { width:100% !important; min-width:0; }
.idea-workspace-menu-enhanced .monaco-workbench .part.titlebar:has(#idea-workspace-menu-button[aria-expanded="true"]) .titlebar-center { visibility:hidden !important; pointer-events:none; }
@media (max-width:900px) {
 .idea-workspace-menu-enhanced .monaco-workbench .part.titlebar .titlebar-container:has(.command-center-quick-pick) > .titlebar-center { position:static !important; transform:none !important; flex:0 1 200px !important; width:200px !important; min-width:100px !important; max-width:200px !important; margin:0 8px !important; }
}
.idea-workspace-menu-enhanced .monaco-workbench .part.titlebar .command-center .command-center-quick-pick .search-icon,
.idea-workspace-menu-enhanced .monaco-workbench .part.titlebar .command-center .agent-status-container { display:none !important; }
/* Keep the native Agents action next to compact Search without moving native toolbar nodes. */
.idea-workspace-menu-enhanced .monaco-workbench .part.titlebar .titlebar-container:has(.command-center-quick-pick) .open-in-agents-titlebar-widget { position:fixed !important; left:calc(50% + clamp(80px,10vw,120px) + 10px) !important; top:3px !important; display:flex !important; align-items:center !important; justify-content:center !important; width:28px !important; min-width:28px !important; max-width:28px !important; height:28px !important; padding:0 !important; margin:0 !important; border:0 !important; border-radius:4px !important; background:transparent !important; color:var(--idea-frame-foreground,var(--vscode-foreground)) !important; app-region:no-drag; -webkit-app-region:no-drag; }
.idea-workspace-menu-enhanced .monaco-workbench .part.titlebar .open-in-agents-titlebar-widget .open-in-agents-titlebar-widget-label { display:none !important; }
.idea-workspace-menu-enhanced .monaco-workbench .part.titlebar .open-in-agents-titlebar-widget:is(:hover,:focus-visible) { background:var(--vscode-toolbar-hoverBackground) !important; color:var(--vscode-focusBorder) !important; }
.idea-workspace-menu-enhanced .monaco-workbench .part.titlebar .open-in-agents-titlebar-widget:focus-visible { outline:1px solid var(--vscode-focusBorder); outline-offset:-1px; }
.idea-workspace-menu-enhanced .monaco-workbench .part.titlebar:has(#idea-workspace-menu-button[aria-expanded="true"]) .open-in-agents-titlebar-widget { visibility:hidden !important; pointer-events:none; }
@media (max-width:900px) {
 .idea-workspace-menu-enhanced .monaco-workbench .part.titlebar .titlebar-container:has(.command-center-quick-pick) .open-in-agents-titlebar-widget { position:static !important; }
}
.idea-workspace-menu-enhanced .monaco-workbench .part.titlebar .command-center .command-center-quick-pick:hover { background:var(--vscode-toolbar-hoverBackground); }
.idea-workspace-menu-enhanced .monaco-workbench .part.titlebar .command-center .command-center-quick-pick:focus-visible { outline:1px solid var(--vscode-focusBorder); outline-offset:-2px; }
/* Keep native foreground/background pairs for light search controls. */
.idea-workspace-menu-enhanced .monaco-workbench:is(.vs,.hc-light) .part.titlebar .command-center .action-item.command-center-center {
 background: var(--vscode-titleBar-activeBackground) !important; color: var(--vscode-titleBar-activeForeground) !important;
}
.idea-workspace-menu-enhanced .monaco-workbench:is(.vs,.hc-light) .part.titlebar.inactive .command-center .action-item.command-center-center {
 background: var(--vscode-titleBar-inactiveBackground) !important; color: var(--vscode-titleBar-inactiveForeground) !important;
}

/* idea-workspace:navigation-1 — preserve native geometry and interaction */
 .monaco-workbench .part.activitybar .action-item:hover .action-label { background-color: var(--vscode-toolbar-hoverBackground); }
.monaco-workbench .part.activitybar .action-item.checked .action-label { background-color: var(--vscode-activityBar-activeBackground); }
.monaco-workbench .quick-input-widget {
 border: 1px solid var(--vscode-widget-border, transparent) !important; border-radius: 10px !important;
 box-shadow: 0 12px 32px var(--vscode-widget-shadow, transparent) !important;
 background: var(--vscode-quickInput-background) !important;
}
.monaco-workbench .quick-input-widget .monaco-inputbox { border-radius: 6px !important; }
.monaco-workbench .quick-input-widget .monaco-list-row { border-radius: 5px; }
.monaco-workbench .quick-input-widget .monaco-list-row.focused { outline-offset: -1px; }
.monaco-workbench .monaco-menu .monaco-action-bar.vertical .action-item .action-label { border-radius: 5px; }
`:'';
  const compactCss=compact?'.monaco-workbench .part.sidebar .composite.title { padding-left: 12px; }':'';
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
 --idea-surface: var(--vscode-editorGroupHeader-tabsBackground, var(--vscode-editor-background));
 --idea-border: var(--vscode-widget-border, transparent); --idea-hover: var(--vscode-toolbar-hoverBackground);
 --idea-frame: var(--vscode-modernUI-shellBackground, var(--vscode-titleBar-activeBackground, var(--vscode-editor-background)));
 --idea-frame-foreground: var(--vscode-titleBar-activeForeground, var(--vscode-foreground));
 --idea-frame-gradient: linear-gradient(110deg, color-mix(in srgb, var(--vscode-ideaWorkspace-frameGradientStart, var(--vscode-focusBorder, var(--idea-frame))) 28%, var(--idea-frame)) 0%, var(--vscode-ideaWorkspace-frameGradientEnd, var(--idea-frame)) 85%);
 background-image: var(--idea-frame-gradient) !important;
 --vscode-cornerRadius-medium: 5px;
}
/* Native modernUI owns insets, content sizing, sashes and clipping. Paint only. */
.monaco-workbench > .monaco-grid-view { background-color: transparent !important; }
.monaco-workbench .part:is(.titlebar,.activitybar,.statusbar) {
 background-color: transparent !important; background-image: none !important;
 border-color: transparent !important; box-shadow: none !important;
}
.monaco-workbench .part.statusbar { color: var(--idea-frame-foreground) !important; --status-border-top-color: transparent !important; }
/* Reserve native 1px stroke space for its layout math, but paint it as shared frame.
   Native 4px spacing + the two transparent 1px edges exposes a 6px visual gutter. */
html:has(#idea-workspace-custom-ui) .monaco-workbench.floating-panels .part:is(.sidebar,.auxiliarybar,.editor,.panel) {
 border-color: transparent !important; background-clip: padding-box !important; box-shadow: none !important;
}
.monaco-workbench .part.titlebar { border-bottom-color: transparent !important; }
.monaco-workbench.floating-panels .part.activitybar { border-color: transparent !important; }
.monaco-workbench.floating-panels .part.sidebar { border-radius: 8px !important; }
.monaco-workbench .part.titlebar > .titlebar-container { background-color: transparent !important; }
.monaco-workbench:has(.part.titlebar.inactive) { --idea-frame-foreground: var(--vscode-titleBar-inactiveForeground, var(--vscode-foreground)); --idea-frame: var(--vscode-modernUI-inactiveShellBackground, var(--vscode-titleBar-inactiveBackground, var(--vscode-editor-background))); }
.monaco-workbench .part.titlebar .menubar-menu-button { border-radius: 5px; }
.monaco-workbench .part.titlebar .command-center .action-item.command-center-center {
 background: var(--vscode-commandCenter-background) !important; border-color: var(--vscode-commandCenter-border) !important;
 border-radius: 5px !important; max-width: 340px !important;
}
.monaco-workbench .part.titlebar .command-center .action-item.command-center-center:hover { border-color: var(--vscode-commandCenter-activeBorder) !important; }
.monaco-workbench .part.activitybar {
 border-right: 1px solid var(--idea-border);
 /* Native selectors paint codicons and URI masks in selected/hover/focus states.
    Scope their color inputs to the shared frame, including Light+ dark glyphs. */
 --vscode-activityBar-foreground: var(--idea-frame-foreground);
 --vscode-activityBar-inactiveForeground: color-mix(in srgb, var(--idea-frame-foreground) 75%, transparent);
 --vscode-modernActivityBarItem-activeForeground: var(--idea-frame-foreground);
 --vscode-modernActivityBarItem-hoverForeground: var(--idea-frame-foreground);
 --vscode-modernActivityBarItem-activeBackground: color-mix(in srgb, var(--idea-frame-foreground) 12%, transparent);
 --vscode-modernActivityBarItem-hoverBackground: color-mix(in srgb, var(--idea-frame-foreground) 8%, transparent);
}
.monaco-workbench .part.activitybar .monaco-action-bar .action-item .action-label {
 border-radius: 7px; color: color-mix(in srgb, var(--idea-frame-foreground) 75%, transparent) !important;
}
.monaco-workbench .part.activitybar .monaco-action-bar .action-item.checked .action-label {
 color: var(--idea-frame-foreground) !important; background-color: var(--vscode-activityBar-activeBackground);
}
/* URI icon styles can contain theme-resolved literal paint, so bind the mask itself. */
.monaco-workbench .part.activitybar .action-label.uri-icon { background-color: currentColor !important; }
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
.monaco-workbench .part.editor .tabs-container .tab.active { box-shadow: inset 0 -2px var(--vscode-tab-activeBorder, var(--vscode-focusBorder)) !important; }
.monaco-workbench .part.editor .tab.active .tab-fill { box-shadow: inset 0 -2px var(--vscode-tab-activeBorder, var(--vscode-focusBorder)) !important; background-color: var(--vscode-tab-activeBackground) !important; border-radius: 0 !important; }
.monaco-workbench .part.editor .tabs-container .tab .tab-border-top-container { background: transparent !important; }
.monaco-workbench .part.editor .editor-actions .action-label { border-radius: 5px; }
.monaco-workbench .part.editor .editor-actions .action-label.codicon-debug-start { color: var(--vscode-debugIcon-startForeground); }
.monaco-workbench .part.editor .editor-actions .action-label.codicon-debug-alt { color: var(--vscode-debugIcon-startForeground); }
.monaco-workbench .part.editor .breadcrumbs-below-tabs { border-bottom: 1px solid var(--idea-border); }
.monaco-workbench .part.panel .composite.title { border-bottom: 1px solid var(--idea-border); }
.monaco-workbench .part.panel .composite-bar .action-label { text-transform: none; font-size: 12px; }
.monaco-workbench .part.titlebar { font-size: 14px !important; }
.monaco-workbench .part.titlebar .menubar-menu-button, .monaco-workbench .part.titlebar .window-title { font-size: 14px !important; }
.monaco-workbench .part.statusbar, .monaco-workbench .part.statusbar .statusbar-item { border-color: var(--idea-border); font-size: 13px !important; }
.monaco-workbench .monaco-scrollable-element > .scrollbar > .slider { border-radius: 5px; }
.monaco-workbench .quick-input-widget { border: 1px solid var(--vscode-widget-border, transparent); border-radius: 8px; }
${navigationCss}
${compactCss}`;
}
