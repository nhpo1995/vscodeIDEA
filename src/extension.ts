import * as vscode from 'vscode';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import {constants} from 'node:fs';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {applyPatch,restorePatch,findWorkbench,logoDataUri,renderCss,rendererAssetValid} from './patcher';
import {applySettings,applyPalette,restoreSettings,SettingsHost,Journal,ApplyMode} from './settings';
import {prepareAdminScripts} from './admin';
import {preset,navigationPreset} from './preset';
import {registerConstantHighlighting} from './highlighting';
import {inspectChrome,shouldAutoApply,needsReload,ChromeAttempt,PendingReload} from './chrome';
import {ensureFontInstalled} from './fonts';
import {registerNavigation} from './navigation';
import {registerMenu} from './menu';

export async function activate(context:vscode.ExtensionContext):Promise<void>{
 const output=vscode.window.createOutputChannel('IDEA Workspace');
 const status=vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left,1);
 context.subscriptions.push(output,status,registerConstantHighlighting());
 const navigation=registerNavigation(),menu=registerMenu(async()=>{
  if(navigationEnabled())await applySettings(host,{'window.menuBarVisibility':'classic'});
 });context.subscriptions.push(navigation,menu);
 const setNavigation=async(enabled:boolean)=>{menu.setEnabled(enabled);await navigation.setEnabled(enabled);};
 const navigationEnabled=()=>!context.globalState.get<boolean>('autoUiDisabled') && vscode.workspace.getConfiguration('ideaWorkspace').get<boolean>('navigation.enabled',true);
 const layoutSettings=vscode.env.uiKind===vscode.UIKind.Desktop?navigationPreset(process.platform):{};
 const version=context.extension.packageJSON.version as string;
 const host:SettingsHost={
  read:key=>vscode.workspace.getConfiguration().inspect(key)?.globalValue,
  write:async(key,value)=>{await vscode.workspace.getConfiguration().update(key,value,vscode.ConfigurationTarget.Global);},
  load:()=>context.globalState.get<Journal>('settingsJournal'),
  save:async journal=>{await context.globalState.update('settingsJournal',journal);}
 };
 const updateNavigation=async(mode:ApplyMode)=>{
  const enabled=navigationEnabled();
  if(!context.globalState.get<boolean>('autoUiDisabled')){
   if(enabled)await applySettings(host,layoutSettings,mode);
   else await restoreSettings(host,key=>Object.hasOwn(layoutSettings,key));
   await context.globalState.update('navigationLayoutEnabled',enabled);
  }
  await setNavigation(enabled);
 };
 const css=async()=>{
  const file=vscode.workspace.getConfiguration('ideaWorkspace').get<string>('logoPath','');
  if(file && !path.isAbsolute(file))throw Error('Logo path must be absolute.');
  return renderCss(await logoDataUri(file||context.asAbsolutePath('media/logo-dark.svg')),false,false,navigationEnabled());
 };
 const readWorkbench=async()=>{
  const target=await findWorkbench(await fs.realpath(vscode.env.appRoot));
  return {target,html:await fs.readFile(target,'utf8')};
 };
 const readChromeStatus=async()=>{
  const installed=await readWorkbench();let style='',desiredError:string|undefined;
  try{style=await css();}catch(error){desiredError=error instanceof Error?error.message:String(error);}
  const renderer=navigationEnabled() && vscode.env.uiKind===vscode.UIKind.Desktop && ['win32','linux'].includes(process.platform)?await fs.readFile(context.asAbsolutePath('dist/menuRenderer.js'),'utf8'):undefined;
  const snapshot=inspectChrome(installed.html,style,installed.target,vscode.version,renderer);
  if(renderer && snapshot.state==='current' && !await rendererAssetValid(installed.target,renderer))snapshot.state='outdated';
  return {...installed,style,renderer,desiredError,snapshot};
 };
 const readChrome=async()=>{
  const state=await readChromeStatus();if(state.desiredError)throw Error(state.desiredError);return state;
 };
 const pendingMatches=(pending:PendingReload|undefined,state:Awaited<ReturnType<typeof readChrome>>)=>
  pending?.action==='restore'?state.snapshot.state==='missing':state.snapshot.state==='current' && pending?.cssHash===state.snapshot.cssHash;
 const refresh=async()=>{
  status.command='ideaWorkspace.setup';
  try{
   const state=await readChromeStatus(),last=context.globalState.get<ChromeAttempt>('chromeAttempt'),pending=context.globalState.get<PendingReload>('pendingReload');
   if(pendingMatches(pending,state) && needsReload(pending,pending!.cssHash,vscode.env.sessionId)){
    status.text='$(refresh) IDEA: Reload UI';status.command='ideaWorkspace.reload';
    status.tooltip='CSS changed on disk. Click to reload this window. Renderer DOM has not been inspected.';
   }else if(state.desiredError){
    status.text='$(warning) IDEA: Check logo';status.tooltip=state.desiredError+' Restore remains available from Setup.';
   }else if(state.snapshot.state==='current'){
    status.text='$(check) IDEA: CSS installed';status.tooltip='Exact desired CSS is present on disk. This does not verify the live renderer. Click for Setup.';
   }else if(state.snapshot.state==='damaged'){
    status.text='$(warning) IDEA: Damaged markers';status.tooltip='Owned CSS markers are damaged. Automatic modification is blocked. Click for diagnostics.';
   }else if(last?.fingerprint===state.snapshot.fingerprint && last.outcome!=='applied'){
    status.text='$(warning) IDEA: UI needs attention';status.tooltip=(last.error??'Previous setup did not complete.')+' Click for Setup to retry.';
   }else{
    status.text=state.snapshot.state==='missing'?'$(paintcan) IDEA: Chrome missing':'$(paintcan) IDEA: UI update pending';
    status.tooltip='API-level theme/icons remain independent. Custom chrome is missing or different on disk. Click for Setup.';
   }
  }catch{status.text='$(warning) IDEA: Check setup';status.tooltip='Workbench status is unavailable. Click for Setup.';}
  status.show();
 };
 let busy=false;
 const guarded=(action:()=>Promise<void>)=>async()=>{
  if(busy)return;
  busy=true;
  try{await action();}catch(error){
   const message=error instanceof Error?error.message:String(error);output.appendLine(message);
   void vscode.window.showWarningMessage('IDEA Workspace: '+message);
  }finally{busy=false;await refresh();}
 };
 let fontSetup:Promise<void>|undefined;
 const prepareFonts=():Promise<void>=>{
  if(vscode.env.uiKind!==vscode.UIKind.Desktop)return Promise.resolve();
  return fontSetup??=(async()=>{
   try{
    const result=await ensureFontInstalled({sourceDir:context.asAbsolutePath('fonts/jetbrains-mono')});
    await context.globalState.update('fontStatus',result);
    output.appendLine('JetBrains Mono: '+result.state+(result.directory?' — '+result.directory:''));
    if(result.state==='installed')void vscode.window.showInformationMessage('JetBrains Mono installed for your user account. Fully quit and reopen VS Code if the new font is not visible. Restore leaves the installed font available to other applications.');
   }catch(error){
    const message=error instanceof Error?error.message:String(error);
    const previous=context.globalState.get<{state:string;error?:string}>('fontStatus');
    await context.globalState.update('fontStatus',{state:'failed',error:message});
    output.appendLine('JetBrains Mono installation failed: '+message);
    if(previous?.error!==message)void vscode.window.showWarningMessage('JetBrains Mono could not be installed. Appearance uses font fallbacks. Run IDEA Workspace: Install or Retry Font Setup to retry. Details are in the IDEA Workspace output.');
   }
  })();
 };
 const appearance=async(mode:ApplyMode)=>{
  await prepareFonts();
  const desired={...preset,...(navigationEnabled()?layoutSettings:{})};
  await restoreSettings(host,key=>!Object.hasOwn(desired,key) && !key.startsWith('@idea-palette:'));
  const kept=await applySettings(host,desired,mode);
  const theme=JSON.parse(await fs.readFile(context.asAbsolutePath('themes/idea-dark.json'),'utf8'));
  kept.push(...await applyPalette(host,theme.colors,mode));
  if(kept.length)output.appendLine('Kept user customizations on upgrade: '+kept.join(', '));
 };
 const permissionError=(error:unknown)=>['EACCES','EPERM','EROFS'].includes((error as NodeJS.ErrnoException).code??'');
 const elevate=async(target:string,style:string,operation:'apply'|'restore',renderer?:string)=>{
  if(process.platform!=='linux')throw Error('API appearance is independent. Automatic administrator authentication for custom chrome is supported on Linux only.');
  const scripts=await prepareAdminScripts(target,context.globalStorageUri.fsPath,style,vscode.version,operation,renderer);
  output.appendLine(`Requesting OS authorization to ${operation} owned CSS in ${target}. Installation permissions are unchanged.`);
  try{
   const result=await promisify(execFile)('/usr/bin/pkexec',['/usr/bin/env','ELECTRON_RUN_AS_NODE=1',process.execPath,scripts[operation]],{timeout:120000,maxBuffer:1024*1024});
   output.appendLine(result.stdout);
  }catch(error){
   output.appendLine(String(error));
   throw Error(`${operation==='apply'?'Custom chrome installation':'Restore'} did not complete. Authorization was cancelled or unavailable. Retry ${operation==='apply'?'Apply UI and Logo':'Restore UI and Settings'} from Setup.`);
  }
 };
 const requestReload=guarded(async()=>{
  const pending=context.globalState.get<PendingReload>('pendingReload');
  if(pending)await context.globalState.update('pendingReload',{...pending,reloadRequested:true});
  try{await vscode.commands.executeCommand('workbench.action.reloadWindow');}
  catch(error){if(pending)await context.globalState.update('pendingReload',pending);throw error;}
 });
 const reloadNotice=(message:string)=>void vscode.window.showInformationMessage(message+' Reload this window to load the CSS.','Reload Window').then(choice=>{if(choice)void requestReload();});
 const patch=async()=>{
  if(vscode.env.uiKind!==vscode.UIKind.Desktop)return false;
  const state=await readChrome();
  if(state.snapshot.state==='damaged')throw Error('Custom UI markers are damaged. Automatic modification is blocked. Open diagnostics.');
  if(state.snapshot.state==='current')return false;
  await context.globalState.update('chromeAttempt',{fingerprint:state.snapshot.fingerprint,outcome:'attempting'} satisfies ChromeAttempt);
  try{
   let changed:boolean;
   try{changed=await applyPatch(state.target,path.join(context.globalStorageUri.fsPath,'backups'),state.style,vscode.version,state.renderer);}
   catch(error){if(!permissionError(error))throw error;await elevate(state.target,state.style,'apply',state.renderer);changed=true;}
   const after=await readChrome();
   if(after.snapshot.state!=='current')throw Error('CSS verification after installation failed. Open diagnostics.');
   await context.globalState.update('chromeAttempt',{fingerprint:after.snapshot.fingerprint,outcome:'applied'} satisfies ChromeAttempt);
   await context.globalState.update('customUiRequested',true);
   if(changed)await context.globalState.update('pendingReload',{cssHash:after.snapshot.cssHash,session:vscode.env.sessionId,action:'apply'} satisfies PendingReload);
   return changed;
  }catch(error){
   await context.globalState.update('chromeAttempt',{fingerprint:state.snapshot.fingerprint,outcome:'failed',error:error instanceof Error?error.message:String(error)} satisfies ChromeAttempt);
   throw error;
  }
 };
 const apply=guarded(async()=>{
  await context.globalState.update('autoUiDisabled',false);
  fontSetup=undefined;
  await appearance('explicit');await context.globalState.update('appearanceVersion',version);
  await context.globalState.update('navigationLayoutEnabled',navigationEnabled());
  await setNavigation(navigationEnabled());
  if(await patch())reloadNotice('Custom CSS installed on disk.');
 });
 const installFonts=guarded(async()=>{fontSetup=undefined;await prepareFonts();});
 const restore=guarded(async()=>{
  await context.globalState.update('autoUiDisabled',true);
  await setNavigation(false);
  const state=await readWorkbench();let changed:boolean;
  try{changed=await restorePatch(state.target);}catch(error){if(!permissionError(error))throw error;await elevate(state.target,'','restore');changed=true;}
  const pending=context.globalState.get<PendingReload>('pendingReload');
  if(changed || pending){
   await context.globalState.update('pendingReload',{cssHash:inspectChrome(state.html,'',state.target,vscode.version).cssHash,session:vscode.env.sessionId,action:'restore'} satisfies PendingReload);
  }
  const skipped=await restoreSettings(host);
  await context.globalState.update('navigationLayoutEnabled',false);
  await context.globalState.update('customUiRequested',false);await context.globalState.update('chromeAttempt',undefined);
  if(changed || pending)reloadNotice('Owned CSS removed and appearance settings restored.');
  else void vscode.window.showInformationMessage('Appearance settings restored. Owned CSS was already absent.');
  if(skipped.length)output.appendLine('Preserved later setting edits: '+skipped.join(', '));
 });
 const selectLogo=guarded(async()=>{
  const files=await vscode.window.showOpenDialog({canSelectMany:false,filters:{Logo:['svg','png']},title:'Choose NhpDev titlebar logo'});
  if(!files?.length)return;
  if(files[0].scheme!=='file')throw Error('Choose a local logo.');
  await logoDataUri(files[0].fsPath);
  await vscode.workspace.getConfiguration('ideaWorkspace').update('logoPath',files[0].fsPath,vscode.ConfigurationTarget.Global);
  if(await patch())reloadNotice('New logo CSS installed on disk.');
 });
 const diagnose=guarded(async()=>{
  const state=await readChromeStatus();let writable=true;
  try{await fs.access(path.dirname(state.target),constants.W_OK);await fs.access(state.target,constants.W_OK);}catch{writable=false;}
  output.clear();output.appendLine(`VS Code ${vscode.version}; ${process.platform}\nWorkbench: ${state.target}\nWritable: ${writable}\nDesired CSS: ${state.desiredError??state.snapshot.state}\nFingerprint: ${state.snapshot.fingerprint}`);
  output.appendLine('Last attempt: '+JSON.stringify(context.globalState.get('chromeAttempt')));
  output.appendLine('Pending reload: '+JSON.stringify(context.globalState.get('pendingReload')));
  output.appendLine('Font setup: '+JSON.stringify(context.globalState.get('fontStatus')));
  output.appendLine('On-disk CSS status does not inspect the live renderer. Patch affects all profiles using this installation.');
  for(const key of [...Object.keys(preset),'window.titleBarStyle','workbench.colorCustomizations','vscode_custom_css.imports'])output.appendLine(`${key}: ${JSON.stringify(vscode.workspace.getConfiguration().get(key))}`);
  output.show();
 });
 const setup=async()=>{
  const choice=await vscode.window.showQuickPick([
   {label:status.text,description:status.tooltip?.toString(),id:'diagnose'},
   {label:'Apply UI and Logo',description:'Explicitly reapply appearance and retry custom chrome',id:'apply'},
   {label:'Reload Window',description:'Load changed CSS from disk',id:'reload'},
   {label:'Choose Logo',id:'selectLogo'},
   {label:'Switch Project',description:'Open recent folders and workspaces',id:'switchProject'},
   {label:'Quick Search',description:'Native files, > commands, # workspace symbols, @ file symbols',id:'search'},
   {label:'Install or Retry Font Setup',description:'Install bundled JetBrains Mono for this user account',id:'installFonts'},
   {label:'Diagnose UI and Logo',id:'diagnose'},
   {label:'Restore UI and Settings',id:'restore'}
  ],{title:'IDEA Workspace — appearance only'});
  if(choice)await vscode.commands.executeCommand('ideaWorkspace.'+choice.id);
 };
 for(const [id,handler] of Object.entries({apply,restore,installFonts,selectLogo,setup,diagnose,reload:requestReload}))context.subscriptions.push(vscode.commands.registerCommand('ideaWorkspace.'+id,handler));
 let layoutTimer:ReturnType<typeof setTimeout>|undefined,disposed=false;
 const scheduleLayout=()=>{
  if(disposed)return;
  if(layoutTimer)clearTimeout(layoutTimer);
  layoutTimer=setTimeout(()=>{
   layoutTimer=undefined;
   if(busy){scheduleLayout();return;}
   void guarded(async()=>{
    await updateNavigation('explicit');
    if(context.globalState.get<boolean>('autoUiDisabled'))return;
    if(await patch())reloadNotice('Navigation styling updated on disk.');
   })();
  },100);
 };
 context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(event=>{if(event.affectsConfiguration('ideaWorkspace.navigation.enabled'))scheduleLayout();}),new vscode.Disposable(()=>{disposed=true;if(layoutTimer)clearTimeout(layoutTimer);}));
 await guarded(async()=>{
  const disabled=context.globalState.get<boolean>('autoUiDisabled');
  await setNavigation(navigationEnabled());
  if(!disabled)await prepareFonts();
  if(!disabled && context.globalState.get<string>('appearanceVersion')!==version){
   const upgrade=!!context.globalState.get('appearanceVersion') || !!host.load();
   await appearance(upgrade?'upgrade':'explicit');await context.globalState.update('appearanceVersion',version);
  }
  if(!disabled)await updateNavigation(context.globalState.get<boolean>('navigationLayoutEnabled')===false?'explicit':'upgrade');
  if(vscode.env.uiKind!==vscode.UIKind.Desktop)return;
  const state=await readChromeStatus(),pending=context.globalState.get<PendingReload>('pendingReload');
  if(pending && (!pendingMatches(pending,state) || !needsReload(pending,pending.cssHash,vscode.env.sessionId)))await context.globalState.update('pendingReload',undefined);
  if(disabled)return;
  if(state.desiredError)throw Error(state.desiredError);
  if(shouldAutoApply(state.snapshot,context.globalState.get<ChromeAttempt>('chromeAttempt'))){
   if(await patch())reloadNotice('Custom CSS installed or recovered on disk.');
  }else if(state.snapshot.state==='current'){
   await context.globalState.update('chromeAttempt',{fingerprint:state.snapshot.fingerprint,outcome:'applied'} satisfies ChromeAttempt);
  }
 })();
}
export function deactivate():void{}
