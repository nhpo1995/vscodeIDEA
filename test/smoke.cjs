const assert=require('node:assert/strict');
const vscode=require('vscode');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
exports.run=async()=>{
 const extension=vscode.extensions.getExtension('local-workspace.idea-workspace');
 assert.ok(extension,'development extension found');
 await extension.activate();
 const commands=await vscode.commands.getCommands(true);
 for(const name of ['apply','restore','selectLogo','setup','diagnose'])assert.ok(commands.includes('ideaWorkspace.'+name),name+' registered');
 assert.equal(vscode.workspace.getConfiguration().get('workbench.colorTheme'),'IDEA-inspired Dark');
 const {findWorkbench,applyPatch,restorePatch,logoDataUri,renderCss}=require('../dist/patcher');
 const actual=await findWorkbench(vscode.env.appRoot);
 const original=await fs.readFile(actual,'utf8');
 const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'idea-host-test-'));
 try {
  const target=path.join(tmp,'workbench.html');await fs.writeFile(target,original);
  const logo=await logoDataUri(path.join(extension.extensionPath,'media/logo.svg'));
  await applyPatch(target,path.join(tmp,'backups'),renderCss(logo,true),vscode.version);
  assert.ok((await fs.readFile(target,'utf8')).includes('background-image: url("data:image/svg+xml;base64,'));
  await restorePatch(target);assert.equal(await fs.readFile(target,'utf8'),original);
  assert.equal(await fs.readFile(actual,'utf8'),original,'installed VS Code not modified');
 }finally{await fs.rm(tmp,{recursive:true,force:true});}
 console.log('IDEA_SMOKE_PASS: activation, 5 commands, theme, real workbench copy apply/restore; VS Code '+vscode.version);
};
