import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import {createHash,randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

export type FontRunner=(command:string,args:string[],environment?:Record<string,string>)=>Promise<string>;
export interface FontOptions {
 sourceDir:string; platform?:string; fontDir?:string; run?:FontRunner;
}
export interface FontResult {state:'already-installed'|'installed'|'unsupported';directory?:string}
const FAMILY='JetBrains Mono';
const PREFIX='IDEAWorkspace-JetBrainsMono-2.304-';
const STYLES=['Regular','Bold','Italic','BoldItalic'] as const;
const REGISTRY_NAMES=['JetBrains Mono','JetBrains Mono Bold','JetBrains Mono Italic','JetBrains Mono Bold Italic'];
const digest=(data:Buffer)=>createHash('sha256').update(data).digest('hex');
const execute:FontRunner=async(command,args,environment)=>{
 const result=await promisify(execFile)(command,args,{windowsHide:true,timeout:30000,maxBuffer:2*1024*1024,env:{...process.env,...environment}});
 return result.stdout.trim();
};

const DETECT_WINDOWS=`$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$fonts = New-Object System.Drawing.Text.InstalledFontCollection
try { [Console]::Out.Write(($fonts.Families.Name -contains 'JetBrains Mono')) }
finally { $fonts.Dispose() }`;

// Paths are passed as JSON in the environment, never interpolated into PowerShell source.
const REGISTER_WINDOWS=`$ErrorActionPreference = 'Stop'
$entries = @($env:IDEA_WORKSPACE_FONT_REGISTRATION | ConvertFrom-Json)
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class IdeaWorkspaceFonts {
 [DllImport("gdi32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
 public static extern int AddFontResourceEx(string file, uint flags, IntPtr reserved);
 [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
 public static extern IntPtr SendMessageTimeout(IntPtr hwnd, uint message, UIntPtr wparam, IntPtr lparam, uint flags, uint timeout, out UIntPtr result);
}
'@
# Persistent font registration is scoped to HKEY_CURRENT_USER, never HKEY_LOCAL_MACHINE.
$registry = [Microsoft.Win32.Registry]::CurrentUser.CreateSubKey('Software\\Microsoft\\Windows NT\\CurrentVersion\\Fonts')
try {
 foreach ($font in $entries) {
  $old = $registry.GetValue($font.name)
  if ($null -ne $old -and $old -ne $font.path) { throw "Existing font registration is owned by another installer: $($font.name)" }
 }
 foreach ($font in $entries) {
  if ([IdeaWorkspaceFonts]::AddFontResourceEx($font.path, 0, [IntPtr]::Zero) -eq 0) { throw "Windows could not load font: $($font.path)" }
  $registry.SetValue($font.name, $font.path, [Microsoft.Win32.RegistryValueKind]::String)
 }
} finally { $registry.Dispose() }
$result = [UIntPtr]::Zero
$null = [IdeaWorkspaceFonts]::SendMessageTimeout([IntPtr]0xffff, 0x001D, [UIntPtr]::Zero, [IntPtr]::Zero, 2, 1000, [ref]$result)`;

function powershell():string {
 return path.win32.join(process.env.SystemRoot||'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
}
function psArgs(script:string):string[]{return ['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')];}
async function installed(platform:string,run:FontRunner):Promise<boolean>{
 if(platform==='win32')return (await run(powershell(),psArgs(DETECT_WINDOWS))).trim().toLowerCase()==='true';
 if(platform==='darwin'){
  const families=JSON.parse(await run('/usr/bin/osascript',['-l','JavaScript','-e',"ObjC.import('AppKit'); JSON.stringify(ObjC.deepUnwrap($.NSFontManager.sharedFontManager.availableFontFamilies));"]));
  return Array.isArray(families) && families.includes(FAMILY);
 }
 return (await run('fc-match',['-f','%{family}',FAMILY])).split(',').some(f=>f.trim()===FAMILY);
}
function userFontDirectory(platform:string):string {
 const home=os.homedir();
 if(platform==='win32'){
  const local=process.env.LOCALAPPDATA;
  if(!local || !path.win32.isAbsolute(local))throw Error('A valid LOCALAPPDATA directory is required for per-user font installation.');
  return path.join(local,'Microsoft','Windows','Fonts');
 }
 if(platform==='darwin')return path.join(home,'Library','Fonts');
 const configured=process.env.XDG_DATA_HOME;
 return path.join(configured && path.isAbsolute(configured)?configured:path.join(home,'.local','share'),'fonts','idea-workspace');
}
async function exists(file:string):Promise<boolean>{
 try{await fs.lstat(file);return true;}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return false;throw error;}
}
async function checkExisting(file:string,data:Buffer):Promise<void>{
 try{
  const stat=await fs.lstat(file);
  if(!stat.isFile() || stat.isSymbolicLink() || digest(await fs.readFile(file))!==digest(data))throw Error('Refusing to replace an existing font or license: '+file);
 }catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
}
async function publishFile(destination:string,data:Buffer):Promise<void>{
 const staged=destination+'.'+randomUUID()+'.tmp';
 try{
  await fs.writeFile(staged,data,{flag:'wx'});
  // A hard link publishes only complete bytes, atomically, and refuses to replace another file.
  try{await fs.link(staged,destination);}catch(error){if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error;await checkExisting(destination,data);}
 }finally{await fs.unlink(staged).catch(error=>{if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;});}
}

/** Installs only pinned assets, never overwrites another font, and leaves fonts installed for other apps. */
export async function ensureFontInstalled(options:FontOptions):Promise<FontResult>{
 const platform=options.platform??process.platform,run=options.run??execute;
 if(!['win32','darwin','linux'].includes(platform))return {state:'unsupported'};
 const directory=options.fontDir??userFontDirectory(platform);
 if(!path.isAbsolute(directory))throw Error('Font installation directory must be absolute.');
 const pending=path.join(directory,PREFIX+'pending');
 // A previous partial registration must finish even if its Regular face is already visible.
 if(await installed(platform,run) && !await exists(pending))return {state:'already-installed'};
 const manifest=JSON.parse(await fs.readFile(path.join(options.sourceDir,'SOURCE.json'),'utf8')) as {family:string;version:string;files:Record<string,string>};
 if(manifest.family!==FAMILY || manifest.version!=='2.304')throw Error('Unsupported bundled font manifest.');
 const files:{name:string;data:Buffer}[]=[];
 for(const file of ['OFL.txt',...STYLES.map(style=>'JetBrainsMono-'+style+'.ttf')]){
  const source=path.join(options.sourceDir,file),stat=await fs.lstat(source),data=await fs.readFile(source);
  if(!stat.isFile() || stat.isSymbolicLink() || digest(data)!==manifest.files[file])throw Error('Bundled font integrity check failed: '+file);
  if(file.endsWith('.ttf') && data.readUInt32BE(0)!==0x00010000)throw Error('Invalid bundled TrueType font: '+file);
  files.push({name:PREFIX+file.replace('JetBrainsMono-',''),data});
 }
 if(await exists(directory)){
  const stat=await fs.lstat(directory);
  if(!stat.isDirectory() || stat.isSymbolicLink())throw Error('Font destination must be a real directory.');
 }
 for(const file of files)await checkExisting(path.join(directory,file.name),file.data);
 await fs.mkdir(directory,{recursive:true});
 try{await fs.writeFile(pending,'Pending font registration\n',{flag:'wx'});}catch(error){if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error;}
 for(const file of files){
  const destination=path.join(directory,file.name);
  await publishFile(destination,file.data);
 }
 if(platform==='win32'){
  const entries=STYLES.map((style,i)=>({name:REGISTRY_NAMES[i]+' (TrueType)',path:path.join(directory,PREFIX+style+'.ttf')}));
  await run(powershell(),psArgs(REGISTER_WINDOWS),{IDEA_WORKSPACE_FONT_REGISTRATION:JSON.stringify(entries)});
 }else if(platform==='linux')await run('fc-cache',['-f',directory]);
 // macOS fontd discovers fonts copied to ~/Library/Fonts; VS Code may need a full restart.
 try{await fs.unlink(pending);}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
 return {state:'installed',directory};
}
