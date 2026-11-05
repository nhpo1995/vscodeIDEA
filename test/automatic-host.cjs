const assert=require('node:assert/strict');
const vscode=require('vscode');
const fs=require('node:fs/promises');
exports.run=async()=>{
 assert.ok(vscode.env.appRoot.startsWith('/tmp/idea-workspace-code-020/'));
 const extension=vscode.extensions.getExtension('local-workspace.idea-workspace');
 await extension.activate();
 const c=vscode.workspace.getConfiguration();
 assert.equal(c.get('workbench.colorTheme'),'IDEA-inspired Dark');
 assert.equal(c.get('workbench.iconTheme'),'idea-workspace-files');
 assert.equal(c.get('workbench.productIconTheme'),'idea-workspace-ui');
 for(const [key,value] of Object.entries({'editor.minimap.enabled':true,'breadcrumbs.enabled':false,'workbench.sideBar.location':'right','window.commandCenter':false}))assert.equal(c.get(key),value,key+' preserved');
 const html=await fs.readFile(vscode.env.appRoot+'/out/vs/code/electron-browser/workbench/workbench.html','utf8');
 assert.ok(html.includes('idea-workspace:ui-0.4.1'),'CSS applied automatically with no Apply command');
 assert.ok(!extension.packageJSON.contributes.keybindings);
 assert.ok(!extension.packageJSON.contributes.menus);
 console.log('IDEA_AUTOMATIC_PASS: activation alone applies theme, file icons, product icons and writable-install CSS; minimap, breadcrumbs, sidebar and command center preserved; no added toolbar or keybindings.');
};
