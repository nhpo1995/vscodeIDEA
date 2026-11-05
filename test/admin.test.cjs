const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {promisify}=require('node:util');
const execFile=promisify(require('node:child_process').execFile);
const html=`<html><head><meta http-equiv="Content-Security-Policy" content="style-src 'self' 'unsafe-inline'; img-src data:;"></head></html>`;
async function fixture(t){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'idea-admin-'));
 t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const target=path.join(root,'workbench.html');await fs.writeFile(target,html);
 return {root,target};
}
test('prepared scripts do not patch until executed and restore preserves other edits',async t=>{
 const {prepareAdminScripts}=require('../dist/admin');
 const f=await fixture(t);
 const result=await prepareAdminScripts(f.target,path.join(f.root,"review's folder"),'a{}','1');
 assert.equal(await fs.readFile(f.target,'utf8'),html);
 const mode=(await fs.stat(f.target)).mode & 0o777;
 await execFile(process.execPath,[result.apply]);
 assert.match(await fs.readFile(f.target,'utf8'),/idea-workspace:start/);
 assert.equal((await fs.stat(f.target)).mode & 0o777,mode);
 await fs.appendFile(f.target,'<!-- other tool -->');
 await execFile(process.execPath,[result.restore]);
 assert.equal(await fs.readFile(f.target,'utf8'),html+'<!-- other tool -->');
 await execFile(process.execPath,[result.restore]);
});
test('prepared Apply refuses a changed installation and leaves it intact',async t=>{
 const {prepareAdminScripts}=require('../dist/admin');const f=await fixture(t);
 const result=await prepareAdminScripts(f.target,path.join(f.root,'review'),'a{}','1');
 await fs.appendFile(f.target,'<!-- update -->');
 await assert.rejects(execFile(process.execPath,[result.apply]),/changed since preparation/);
 assert.equal(await fs.readFile(f.target,'utf8'),html+'<!-- update -->');
});
test('administrator scripts refuse symlink targets',async t=>{
 const {prepareAdminScripts}=require('../dist/admin');const f=await fixture(t);
 const result=await prepareAdminScripts(f.target,path.join(f.root,'review'),'a{}','1');
 const other=path.join(f.root,'other.html');await fs.rename(f.target,other);await fs.symlink(other,f.target);
 await assert.rejects(execFile(process.execPath,[result.apply]),/symlink/);
 assert.equal(await fs.readFile(other,'utf8'),html);
});
test('helper runs with the Node runtime bundled in VS Code',async t=>{
 const executable='/usr/share/code/code';
 try{await fs.access(executable);}catch{t.skip('VS Code runtime not installed');return;}
 const {prepareAdminScripts}=require('../dist/admin');const f=await fixture(t);
 const scripts=await prepareAdminScripts(f.target,path.join(f.root,'runtime'),'a{}','1');
 await execFile('/usr/bin/env',['ELECTRON_RUN_AS_NODE=1',executable,scripts.apply]);
 assert.match(await fs.readFile(f.target,'utf8'),/idea-workspace:start/);
 await execFile('/usr/bin/env',['ELECTRON_RUN_AS_NODE=1',executable,scripts.restore]);
 assert.equal(await fs.readFile(f.target,'utf8'),html);
});
