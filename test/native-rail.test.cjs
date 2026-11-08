const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const html=`<html><head><meta http-equiv="Content-Security-Policy" content="style-src 'self' 'unsafe-inline'; img-src 'self' data:; script-src 'self';"></head><body></body><script src="./workbench.js" type="module"></script></html>`;
const core='class Workbench{create(){this.workbenchGrid=h,this.workbenchGrid.edgeSnapping=true}};';
const bootstrap='async function start(){let o=await import(e);return o;}';
const rail='function ideaWorkspaceInstallNativeRail(host){ void host; }';
async function fixture(t){const root=await fs.mkdtemp(path.join(os.tmpdir(),'idea-rail-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));const dir=path.join(root,'out/vs/code/electron-browser/workbench'),native=path.join(root,'out/vs/workbench');await fs.mkdir(dir,{recursive:true});await fs.mkdir(native,{recursive:true});const target=path.join(dir,'workbench.html');await fs.writeFile(target,html);await fs.writeFile(path.join(dir,'workbench.js'),bootstrap);await fs.writeFile(path.join(native,'workbench.desktop.main.js'),core);return {root,dir,native,target};}
test('native rail loads owned copies, preserves original modules and restores exact startup',async t=>{
 const {applyPatch,restorePatch,nativeRailAssetsValid}=require('../dist/patcher');const f=await fixture(t);
 await applyPatch(f.target,path.join(f.root,'backups'),'a{}','1',undefined,rail);
 const patched=await fs.readFile(f.target,'utf8');assert.match(patched,/idea-workspace:startup:start/);assert.match(patched,/idea-workspace-startup-[a-f0-9]+\.js/);
 assert.equal(await fs.readFile(path.join(f.dir,'workbench.js'),'utf8'),bootstrap);assert.equal(await fs.readFile(path.join(f.native,'workbench.desktop.main.js'),'utf8'),core);
 assert.ok(await nativeRailAssetsValid(f.target,rail));
 const copies=(await fs.readdir(f.native)).filter(n=>n.startsWith('idea-workspace-native-'));assert.equal(copies.length,1);assert.match(await fs.readFile(path.join(f.native,copies[0]),'utf8'),/ideaWorkspaceInstallNativeRail\(this\)/);
 assert.equal(await applyPatch(f.target,path.join(f.root,'backups'),'a{}','1',undefined,rail),false);
 await fs.appendFile(f.target,'<!-- user -->');await restorePatch(f.target);
 assert.equal(await fs.readFile(f.target,'utf8'),html+'<!-- user -->');assert.equal((await fs.readdir(f.native)).filter(n=>n.startsWith('idea-workspace-native-')).length,0);
});
test('unsupported native bundles retain their original startup and still accept CSS',async t=>{
 const {applyPatch,restorePatch}=require('../dist/patcher');const f=await fixture(t);await fs.writeFile(path.join(f.native,'workbench.desktop.main.js'),'unrelated native bundle');
 await applyPatch(f.target,path.join(f.root,'backup'),'a{}','1',undefined,rail);assert.ok(!(await fs.readFile(f.target,'utf8')).includes('idea-workspace:startup:start'));await restorePatch(f.target);assert.equal(await fs.readFile(f.target,'utf8'),html);
});
test('damaged startup metadata is rejected and changed owned assets are preserved on Restore',async t=>{
 const {applyPatch,restorePatch}=require('../dist/patcher');const f=await fixture(t);await applyPatch(f.target,path.join(f.root,'backup'),'a{}','1',undefined,rail);
 const file=(await fs.readdir(f.native)).find(n=>n.startsWith('idea-workspace-native-'));await fs.appendFile(path.join(f.native,file),'// user change');await restorePatch(f.target);assert.match(await fs.readFile(path.join(f.native,file),'utf8'),/user change/);
 await fs.writeFile(f.target,html.replace('</body>','</body><!-- idea-workspace:startup:start -->'));await assert.rejects(restorePatch(f.target),/startup markers/);
});
test('unrecognized startup syntax is a safe rail fallback and does not block CSS/menu',async t=>{
 const {nativeRailSupported,applyPatch,restorePatch}=require('../dist/patcher');const f=await fixture(t);const unfamiliar=html.replace('src="./workbench.js"',"src='./workbench.js'");await fs.writeFile(f.target,unfamiliar);
 assert.equal(await nativeRailSupported(f.target,rail),false);await applyPatch(f.target,path.join(f.root,'backup'),'a{}','1','menuSource',rail);assert.match(await fs.readFile(f.target,'utf8'),/idea-workspace-custom-ui/);await restorePatch(f.target);assert.equal(await fs.readFile(f.target,'utf8'),unfamiliar);
});
test('owned bootstrap falls back to native core when optional owned core cannot load',async t=>{
 const {applyPatch}=require('../dist/patcher');const f=await fixture(t);await applyPatch(f.target,path.join(f.root,'backups'),'a{}','1',undefined,rail);const name=(await fs.readdir(f.dir)).find(n=>n.startsWith('idea-workspace-startup-'));assert.match(await fs.readFile(path.join(f.dir,name),'utf8'),/\.catch\(\(\)=>import\(e\)\)/);
});
test('additional native startup attributes use the ordinary CSS fallback',async t=>{
 const {nativeRailSupported,applyPatch,restorePatch}=require('../dist/patcher');const f=await fixture(t);
 const unfamiliar=html.replace('type="module"','type="module" data-native="future"');await fs.writeFile(f.target,unfamiliar);
 assert.equal(await nativeRailSupported(f.target,rail),false);await applyPatch(f.target,path.join(f.root,'backup'),'a{}','1',undefined,rail);await restorePatch(f.target);assert.equal(await fs.readFile(f.target,'utf8'),unfamiliar);
});
test('standalone administrator scripts apply and restore the native startup without touching original JS',async t=>{
 const {prepareAdminScripts}=require('../dist/admin');const {promisify}=require('node:util'),run=promisify(require('node:child_process').execFile);const f=await fixture(t);
 const scripts=await prepareAdminScripts(f.target,path.join(f.root,'scripts'),'a{}','1','apply',undefined,rail);
 await run(process.execPath,[scripts.apply]);assert.match(await fs.readFile(f.target,'utf8'),/idea-workspace:startup:start/);await run(process.execPath,[scripts.restore]);assert.equal(await fs.readFile(f.target,'utf8'),html);assert.equal(await fs.readFile(path.join(f.native,'workbench.desktop.main.js'),'utf8'),core);
});

test('owned runtime assets keep workbench read permissions even with a private administrator umask',{skip:process.platform==='win32'},async t=>{
 const {applyPatch}=require('../dist/patcher');const f=await fixture(t);await fs.chmod(f.target,0o644);const previous=process.umask(0o077);
 try{await applyPatch(f.target,path.join(f.root,'backups'),'a{}','1','menuSource',rail);}finally{process.umask(previous)}
 const files=[...(await fs.readdir(f.dir)).filter(n=>/^idea-workspace-.*\.js$/.test(n)).map(n=>path.join(f.dir,n)),...(await fs.readdir(f.native)).filter(n=>/^idea-workspace-.*\.js$/.test(n)).map(n=>path.join(f.native,n))];
 assert.equal(files.length,3);for(const file of files)assert.equal((await fs.stat(file)).mode&0o777,0o644,'browser can read '+path.basename(file));
 assert.equal((await fs.stat(f.target)).mode&0o777,0o644);
});
