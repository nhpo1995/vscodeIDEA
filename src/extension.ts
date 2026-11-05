import * as vscode from 'vscode';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import {constants} from 'node:fs';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {applyPatch,restorePatch,findWorkbench,logoDataUri,renderCss} from './patcher';
import {applySettings,applyPalette,restoreSettings,SettingsHost,Journal} from './settings';
import {prepareAdminScripts} from './admin';
import {preset} from './preset';
import {registerConstantHighlighting} from './highlighting';

export async function activate(context:vscode.ExtensionContext):Promise<void>{
 const output=vscode.window.createOutputChannel('IDEA Workspace');
 const status=vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left,1);
 status.command='ideaWorkspace.setup';
 context.subscriptions.push(output,status);
 context.subscriptions.push(registerConstantHighlighting());
 const version=context.extension.packageJSON.version as string;
 const attemptVersion=version+'@'+vscode.version;
 const host:SettingsHost={
  read:key=>vscode.workspace.getConfiguration().inspect(key)?.globalValue,
  write:async(key,value)=>{await vscode.workspace.getConfiguration().update(key,value,vscode.ConfigurationTarget.Global);},
  load:()=>context.globalState.get<Journal>('settingsJournal'),
  save:async journal=>{await context.globalState.update('settingsJournal',journal);}
 };
 let busy=false;
 const guarded=(action:()=>Promise<void>)=>async()=>{
  if(busy)return;
  busy=true;
  try{await action();}catch(error){
   const message=error instanceof Error?error.message:String(error);
   output.appendLine(message);
   void vscode.window.showWarningMessage('IDEA Workspace: '+message);
  }finally{busy=false;}
 };
 const permissionError=(error:unknown)=>['EACCES','EPERM','EROFS'].includes((error as NodeJS.ErrnoException).code??'');
 const css=async()=>{
  const file=vscode.workspace.getConfiguration('ideaWorkspace').get<string>('logoPath','');
  if(file && !path.isAbsolute(file))throw Error('Logo path must be absolute.');
  return renderCss(await logoDataUri(file||context.asAbsolutePath('media/logo-header.svg')),false,!file);
 };
 const appearance=async()=>{
  // Release previous versions' workflow/layout settings, preserving later user edits.
  await restoreSettings(host,key=>!Object.hasOwn(preset,key) && !key.startsWith('@idea-palette:'));
  await applySettings(host,preset);
  const theme=JSON.parse(await fs.readFile(context.asAbsolutePath('themes/idea-dark.json'),'utf8'));
  await applyPalette(host,theme.colors);
 };
 const refresh=async()=>{
  try{
   const html=await fs.readFile(await findWorkbench(vscode.env.appRoot),'utf8');
   const current=html.includes('<!-- idea-workspace:start -->') && html.includes('idea-workspace:ui-0.4.1');
   if(current){status.hide();return;}
   status.text='$(lock) IDEA: Theme + Icons';
   status.tooltip='Theme and icons are active. Custom logo/chrome needs installation access. Click for Setup.';
  }catch{status.text='$(paintcan) IDEA: Theme + Icons';}
  status.show();
 };
 const elevate=async(target:string,style:string,operation:'apply'|'restore')=>{
  if(process.platform!=='linux')throw Error('Theme and icons are applied. Automatic administrator authentication for custom chrome is currently supported on Linux only.');
  const scripts=await prepareAdminScripts(target,context.globalStorageUri.fsPath,style,vscode.version,operation);
  output.appendLine(`Requesting OS authorization to ${operation} owned CSS in ${target}. No installation permissions are changed.`);
  // Use the Node runtime already bundled with VS Code; no external Node installation or shell.
  try{
   const result=await promisify(execFile)('/usr/bin/pkexec',['/usr/bin/env','ELECTRON_RUN_AS_NODE=1',process.execPath,scripts[operation]],{timeout:120000,maxBuffer:1024*1024});
   output.appendLine(result.stdout);
  }catch(error){
   output.appendLine(String(error));
   throw Error('Theme and icons remain active. Custom chrome authorization was cancelled or unavailable. Use IDEA Workspace: Apply UI and Logo to retry.');
  }
 };
 const patch=async()=>{
  if(vscode.env.uiKind!==vscode.UIKind.Desktop)return false;
  const target=await findWorkbench(vscode.env.appRoot),style=await css();
  let changed:boolean;
  try{changed=await applyPatch(target,path.join(context.globalStorageUri.fsPath,'backups'),style,vscode.version);}
  catch(error){if(!permissionError(error))throw error;await elevate(target,style,'apply');changed=true;}
  await context.globalState.update('customUiRequested',true);
  await refresh();
  return changed;
 };
 const restartNotice=()=>void vscode.window.showInformationMessage('IDEA styling installed. Fully quit all VS Code windows and reopen to load the logo/chrome. Theme and icons are already active.');
 const apply=guarded(async()=>{
  await context.globalState.update('autoUiDisabled',false);
  await appearance();
  await context.globalState.update('appearanceVersion',version);
  await context.globalState.update('autoUiAttemptVersion',attemptVersion);
  try{if(await patch())restartNotice();}finally{await refresh();}
 });
 const restore=guarded(async()=>{
  await context.globalState.update('autoUiDisabled',true);
  const target=await findWorkbench(vscode.env.appRoot);
  try{await restorePatch(target);}catch(error){if(!permissionError(error))throw error;await elevate(target,'','restore');}
  const skipped=await restoreSettings(host);
  await context.globalState.update('customUiRequested',false);
  await refresh();
  void vscode.window.showInformationMessage('Owned appearance restored. Fully quit and reopen VS Code.'+(skipped.length?' Your later setting edits were preserved.':''));
 });
 const selectLogo=guarded(async()=>{
  const files=await vscode.window.showOpenDialog({canSelectMany:false,filters:{Logo:['svg','png']},title:'Choose NhpDev titlebar logo'});
  if(!files?.length)return;
  if(files[0].scheme!=='file')throw Error('Choose a local logo.');
  await logoDataUri(files[0].fsPath);
  await vscode.workspace.getConfiguration('ideaWorkspace').update('logoPath',files[0].fsPath,vscode.ConfigurationTarget.Global);
  if(await patch())restartNotice();
 });
 const diagnose=guarded(async()=>{
  const target=await findWorkbench(vscode.env.appRoot),html=await fs.readFile(target,'utf8');
  let writable=true;try{await fs.access(path.dirname(target),constants.W_OK);await fs.access(target,constants.W_OK);}catch{writable=false;}
  output.clear();output.appendLine(`VS Code ${vscode.version}; ${process.platform}\nWorkbench: ${target}\nWritable: ${writable}\nCSS on disk: ${html.includes('idea-workspace:ui-0.4.1')}`);
  output.appendLine('CSS on disk requires a full application restart. Native VS Code navigation, keybindings and workflow settings are retained.');
  for(const key of [...Object.keys(preset),'window.titleBarStyle','workbench.colorCustomizations','vscode_custom_css.imports'])output.appendLine(`${key}: ${JSON.stringify(vscode.workspace.getConfiguration().get(key))}`);
  output.show();
 });
 const setup=async()=>{
  const choice=await vscode.window.showQuickPick([
   {label:'Apply UI and Logo',description:'Automatic installation; OS authentication if required',id:'apply'},
   {label:'Choose Logo',description:'Automatically applies the selected logo',id:'selectLogo'},
   {label:'Diagnose UI and Logo',id:'diagnose'},
   {label:'Restore UI and Settings',id:'restore'}
  ],{title:'IDEA Workspace — appearance only'});
  if(choice)await vscode.commands.executeCommand('ideaWorkspace.'+choice.id);
 };
 for(const [id,handler] of Object.entries({apply,restore,selectLogo,setup,diagnose}))context.subscriptions.push(vscode.commands.registerCommand('ideaWorkspace.'+id,handler));
 await guarded(async()=>{
  if(context.globalState.get<boolean>('autoUiDisabled'))return;
  if(context.globalState.get<string>('appearanceVersion')!==version){
   await appearance();
   await context.globalState.update('appearanceVersion',version);
  }
  // Never repeatedly prompt for administrator authorization after cancellation.
  if(context.globalState.get<string>('autoUiAttemptVersion')!==attemptVersion){
   await context.globalState.update('autoUiAttemptVersion',attemptVersion);
   if(await patch())restartNotice();
  }
 })();
 await refresh();
}
export function deactivate():void{}
