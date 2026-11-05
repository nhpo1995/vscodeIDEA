const vscode=require('vscode');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
exports.run=async()=>{
 assert.ok(vscode.env.appRoot.startsWith('/tmp/idea-workspace-update-1.145.0-'));
 const extension=vscode.extensions.getExtension('local-workspace.idea-workspace');await extension.activate();
 assert.equal(extension.packageJSON.version,'0.4.1');
 const html=await fs.readFile(vscode.env.appRoot+'/out/vs/code/electron-browser/workbench/workbench.html','utf8');
 const logo=await fs.readFile(extension.extensionPath+'/media/logo-header.svg');
 assert.ok(html.includes(logo.toString('base64')),'applied CSS embeds dark-display logo');
 await vscode.commands.executeCommand('workbench.action.closeAuxiliaryBar');
 await vscode.window.showTextDocument(vscode.Uri.file(extension.extensionPath+'/test/fixtures/RetryService.java'),{preview:false});
 await vscode.commands.executeCommand('notifications.clearAll');
 console.log('IDEA_LOGO_PASS: 0.4.1 autoapplied; transparent light-gray/orange NhpDev wordmark embedded.');
 await new Promise(()=>{});
};
