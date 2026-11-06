const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const sourceDir=path.join(__dirname,'../fonts/jetbrains-mono');

async function fixture(t){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'idea-fonts-'));
 t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const fontDir=path.join(root,'user fonts');
 return {root,fontDir,sourceDir,platform:'linux'};
}
const installer=()=>require('../dist/fonts').ensureFontInstalled;

test('existing native JetBrains Mono is left untouched',async t=>{
 const f=await fixture(t),calls=[];
 const result=await installer()({...f,run:async(...args)=>{calls.push(args);return 'JetBrains Mono';}});
 assert.equal(result.state,'already-installed');assert.equal(calls.length,1);
 await assert.rejects(fs.access(f.fontDir),{code:'ENOENT'});
});

test('Linux installs exact pinned fonts and license, refreshes font cache and remains idempotent',async t=>{
 const f=await fixture(t),calls=[];let installed=false;
 const run=async(command,args)=>{calls.push([command,args]);if(command==='fc-cache'){installed=true;return '';}return installed?'JetBrains Mono':'DejaVu Sans Mono';};
 assert.equal((await installer()({...f,run})).state,'installed');
 const files=await fs.readdir(f.fontDir);assert.equal(files.filter(x=>x.endsWith('.ttf')).length,4);
 for(const file of files){
  const original=file.replace('IDEAWorkspace-JetBrainsMono-2.304-','');
  const upstream=original==='OFL.txt'?original:'JetBrainsMono-'+original;
  assert.deepEqual(await fs.readFile(path.join(f.fontDir,file)),await fs.readFile(path.join(sourceDir,upstream)));
 }
 assert.deepEqual(calls.find(x=>x[0]==='fc-cache'),['fc-cache',['-f',f.fontDir]]);
 assert.equal((await installer()({...f,run})).state,'already-installed');
 assert.equal(calls.filter(x=>x[0]==='fc-cache').length,1);
});

test('tampered bundled font is rejected before any user-font write',async t=>{
 const f=await fixture(t),bundle=path.join(f.root,'bundle');await fs.cp(sourceDir,bundle,{recursive:true});
 await fs.appendFile(path.join(bundle,'JetBrainsMono-Regular.ttf'),'tamper');
 await assert.rejects(installer()({...f,sourceDir:bundle,run:async()=>''}),/integrity/i);
 await assert.rejects(fs.access(f.fontDir),{code:'ENOENT'});
});

test('registration failure is retried even when files have already been copied',async t=>{
 const f=await fixture(t);let failed=true,registrations=0;
 const run=async command=>{if(command==='fc-cache'){registrations++;if(failed)throw Error('cache failed');}return registrations?'JetBrains Mono':'';};
 await assert.rejects(installer()({...f,run}),/cache failed/);
 assert.equal((await fs.readdir(f.fontDir)).filter(x=>x.endsWith('.ttf')).length,4);
 failed=false;assert.equal((await installer()({...f,run})).state,'installed');assert.equal(registrations,2);
});

test('conflicting font files are never overwritten',async t=>{
 const f=await fixture(t);await fs.mkdir(f.fontDir);
 const target=path.join(f.fontDir,'IDEAWorkspace-JetBrainsMono-2.304-Regular.ttf');
 await fs.writeFile(target,'user-owned font');
 await assert.rejects(installer()({...f,run:async()=>''}),/existing font/i);
 assert.equal(await fs.readFile(target,'utf8'),'user-owned font');assert.equal((await fs.readdir(f.fontDir)).length,1);
});

test('Windows uses fixed encoded scripts and JSON environment paths for per-user registration',async t=>{
 const f=await fixture(t),calls=[];f.fontDir=path.join(f.root,"user's fonts $literal");
 await installer()({...f,platform:'win32',run:async(...args)=>{calls.push(args);return 'False';}});
 const registration=calls.find(x=>x[2]?.IDEA_WORKSPACE_FONT_REGISTRATION);
 assert.ok(registration);const script=Buffer.from(registration[1].at(-1),'base64').toString('utf16le');
 assert.match(script,/Registry\]::CurrentUser/);assert.doesNotMatch(script,/Registry\]::LocalMachine/);
 assert.match(script,/AddFontResourceEx/);assert.match(script,/WM_FONTCHANGE|0x001D/);
 assert.ok(!script.includes(f.fontDir));
 const entries=JSON.parse(registration[2].IDEA_WORKSPACE_FONT_REGISTRATION);
 assert.equal(entries.length,4);for(const entry of entries)assert.equal(path.dirname(entry.path),f.fontDir);
});

test('Windows native scripts parse and the P/Invoke declarations compile without installing fonts',{skip:process.platform!=='win32'},async t=>{
 const f=await fixture(t),scripts=[];
 await installer()({...f,platform:'win32',run:async(_command,args)=>{scripts.push(Buffer.from(args.at(-1),'base64').toString('utf16le'));return 'False';}});
 const {execFileSync}=require('node:child_process');
 for(const script of scripts){
  execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',
   "$tokens=$null; $errors=$null; $null=[System.Management.Automation.Language.Parser]::ParseInput($env:IDEA_FONT_PS_SCRIPT,[ref]$tokens,[ref]$errors); if($errors.Count){throw ($errors | Out-String)}; $match=[regex]::Match($env:IDEA_FONT_PS_SCRIPT, '(?s)using System;.*?\\n}'); if($match.Success){Add-Type -TypeDefinition $match.Value}"],
   {windowsHide:true,env:{...process.env,IDEA_FONT_PS_SCRIPT:script},timeout:30000});
 }
});

test('macOS checks native font families before copying to user font storage',async t=>{
 const f=await fixture(t),calls=[];
 await installer()({...f,platform:'darwin',run:async(...args)=>{calls.push(args);return '["Menlo"]';}});
 assert.equal(calls[0][0],'/usr/bin/osascript');assert.equal((await fs.readdir(f.fontDir)).length,5);
});

test('unsupported platforms perform no native commands or filesystem writes',async t=>{
 const f=await fixture(t);
 const result=await installer()({...f,platform:'freebsd',run:async()=>{throw Error('must not run');}});
 assert.equal(result.state,'unsupported');await assert.rejects(fs.access(f.fontDir),{code:'ENOENT'});
});

test('concurrent activations can complete the same installation without a spurious failure',async t=>{
 const f=await fixture(t);let count=0,release;
 const both=new Promise(resolve=>{release=resolve});
 const run=async command=>{if(command==='fc-cache'){if(++count===2)release();await both;}return '';};
 const results=await Promise.all([installer()({...f,run}),installer()({...f,run})]);
 assert.deepEqual(results.map(x=>x.state),['installed','installed']);
});

test('interrupted font copy never exposes a truncated installed font and a retry succeeds',async t=>{
 const f=await fixture(t),original=fs.writeFile;
 try{
  fs.writeFile=async(file,data,options)=>{
   if(String(file).includes('Regular.ttf')){
    await original(file,Buffer.from(data).subarray(0,50),options);
    throw Object.assign(Error('interrupted copy'),{code:'ENOSPC'});
   }
   return original(file,data,options);
  };
  await assert.rejects(installer()({...f,run:async()=>''}),/interrupted copy/);
 }finally{fs.writeFile=original;}
 await assert.rejects(fs.access(path.join(f.fontDir,'IDEAWorkspace-JetBrainsMono-2.304-Regular.ttf')),{code:'ENOENT'});
 assert.equal((await fs.readdir(f.fontDir)).filter(file=>file.endsWith('.tmp')).length,0);
 assert.equal((await installer()({...f,run:async()=>''})).state,'installed');
});
