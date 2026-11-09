const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {applyPatch,restorePatch,logoDataUri,renderCss}=require('../dist/patcher');
const html=`<html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;"><link rel="stylesheet" href="workbench.css"></head><body></body></html>`;
async function fixture(t){const root=await fs.mkdtemp(path.join(os.tmpdir(),'idea-test-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));const target=path.join(root,'workbench.html');await fs.writeFile(target,html);return {target,storage:path.join(root,'backups')};}
test('apply twice replaces only owned CSS; backup is unchanged',async t=>{const f=await fixture(t);await applyPatch(f.target,f.storage,'a{}','1');await applyPatch(f.target,f.storage,'b{}','1');const s=await fs.readFile(f.target,'utf8');assert.equal((s.match(/id="idea-workspace-custom-ui"/g)||[]).length,1);assert.match(s,/b\{\}/);assert.ok(!s.includes('a{}'));const files=await fs.readdir(f.storage);assert.equal(files.length,1);assert.equal(await fs.readFile(path.join(f.storage,files[0]),'utf8'),html);});
test('restore preserves later edits from another tool',async t=>{const f=await fixture(t);await applyPatch(f.target,f.storage,'a{}','1');await fs.appendFile(f.target,'<!-- third party -->');await restorePatch(f.target);assert.equal(await fs.readFile(f.target,'utf8'),html+'<!-- third party -->');assert.equal(await restorePatch(f.target),false);});
test('update creates new backup and never restores previous version',async t=>{const f=await fixture(t);await applyPatch(f.target,f.storage,'a{}','1');const newer=html.replace('<body>','<body class="new">');await fs.writeFile(f.target,newer);await applyPatch(f.target,f.storage,'b{}','2');await restorePatch(f.target);assert.equal(await fs.readFile(f.target,'utf8'),newer);assert.equal((await fs.readdir(f.storage)).length,2);});
test('rejects incompatible CSP without changing target',async t=>{const f=await fixture(t);const locked=html.replace("'unsafe-inline'",'');await fs.writeFile(f.target,locked);await assert.rejects(applyPatch(f.target,f.storage,'a{}','1'),/CSP/);assert.equal(await fs.readFile(f.target,'utf8'),locked);});
test('rejects CSS HTML breakout',async t=>{const f=await fixture(t);await assert.rejects(applyPatch(f.target,f.storage,'</style><script>','1'),/CSS/);assert.equal(await fs.readFile(f.target,'utf8'),html);});
test('embeds SVG and rejects active content',async t=>{const f=await fixture(t);const p=path.join(path.dirname(f.target),'logo.svg');await fs.writeFile(p,'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M1 1h20v20H1z"/></svg>');assert.match(await logoDataUri(p),/^data:image\/svg\+xml;base64,/);await fs.writeFile(p,'<svg><script>alert(1)</script></svg>');await assert.rejects(logoDataUri(p),/SVG/);});
test('logo has size limit and PNG signature validation',async t=>{const f=await fixture(t);const p=path.join(path.dirname(f.target),'logo.png');await fs.writeFile(p,'not png');await assert.rejects(logoDataUri(p),/PNG/);await fs.writeFile(p,Buffer.alloc(1024*1024+1));await assert.rejects(logoDataUri(p),/1 MB/);});
test('CSS targets titlebar app icon without hiding the click target',()=>{const css=renderCss('data:image/png;base64,YQ==',true);assert.match(css,/window-appicon/);assert.match(css,/background-image/);assert.ok(!css.includes('display: none'));});

test('renderer is an external self asset, is verified on reapply and is removed on Restore',async t=>{
 const f=await fixture(t),original=html.replace("default-src 'none';","default-src 'none'; script-src 'self';");await fs.writeFile(f.target,original);
 const source='(()=>{globalThis.testMenu=true;})();';
 await applyPatch(f.target,f.storage,'a{}','1',source);
 const patched=await fs.readFile(f.target,'utf8'),name=patched.match(/src="\.\/(idea-workspace-menu-[a-f0-9]+\.js)"/)?.[1];
 assert.ok(name,'external renderer reference');assert.ok(!patched.includes(source));assert.ok(patched.includes("script-src 'self'"));
 const asset=path.join(path.dirname(f.target),name);assert.equal(await fs.readFile(asset,'utf8'),source);
 await fs.writeFile(asset,'damaged');await applyPatch(f.target,f.storage,'a{}','1',source);assert.equal(await fs.readFile(asset,'utf8'),source);
 await fs.appendFile(f.target,'<!-- later edit -->');await restorePatch(f.target);assert.equal(await fs.readFile(f.target,'utf8'),original+'<!-- later edit -->');await assert.rejects(fs.access(asset),/ENOENT/);
});

test('renderer CSP failure leaves HTML and assets untouched',async t=>{
 const f=await fixture(t);await assert.rejects(applyPatch(f.target,f.storage,'a{}','1','(()=>{})()'),/CSP/);assert.equal(await fs.readFile(f.target,'utf8'),html);assert.deepEqual((await fs.readdir(path.dirname(f.target))).sort(),['workbench.html']);
});

test('CSP checks require actual directive names before writing assets',async t=>{
 const f=await fixture(t);
 for(const policy of ["xstyle-src 'unsafe-inline'; img-src data:; script-src 'self';", "style-src 'unsafe-inline'; ximg-src data:; script-src 'self';", "style-src 'unsafe-inline'; img-src data:; xscript-src 'self';"]){
  const original=html.replace(/content="[^"]*"/,`content="${policy}"`);
  await fs.writeFile(f.target,original);
  await assert.rejects(applyPatch(f.target,f.storage,'a{}','1','renderer'),/CSP/);
  assert.equal(await fs.readFile(f.target,'utf8'),original);
 }
});

test('CSP accepts directive whitespace and case, and honors the first duplicate directive',async t=>{
 const f=await fixture(t);
 const allowed="STYLE-SRC\t'SELF' 'UNSAFE-INLINE'; IMG-SRC DATA:; SCRIPT-SRC 'SELF';";
 const original=html.replace(/content="[^"]*"/,`content="${allowed}"`);
 await fs.writeFile(f.target,original);
 assert.equal(await applyPatch(f.target,f.storage,'a{}','1','renderer'),true);
 await restorePatch(f.target);
 const duplicate=html.replace(/content="[^"]*"/,`content="style-src 'none'; ${allowed}"`);
 await fs.writeFile(f.target,duplicate);
 await assert.rejects(applyPatch(f.target,f.storage,'a{}','1'),/CSP/);
 assert.equal(await fs.readFile(f.target,'utf8'),duplicate);
});
