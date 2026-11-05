const vscode=require('vscode');
const assert=require('node:assert/strict');
exports.run=async()=>{
 assert.ok(vscode.env.appRoot.startsWith('/tmp/idea-workspace-update-1.145.0-'));
 const extension=vscode.extensions.getExtension('local-workspace.idea-workspace');await extension.activate();
 assert.equal(extension.packageJSON.version,'0.4.2');
 assert.equal(vscode.workspace.getConfiguration().get('workbench.iconTheme'),'idea-workspace-files');
 assert.equal(vscode.workspace.getConfiguration().get('workbench.productIconTheme'),'idea-workspace-ui');
 await vscode.commands.executeCommand('workbench.action.closeAuxiliaryBar');
 await vscode.commands.executeCommand('workbench.action.closeAllEditors');
 await vscode.commands.executeCommand('workbench.view.explorer');
 await vscode.commands.executeCommand('revealInExplorer',vscode.Uri.file('/tmp/idea-workspace-icons-preview/src/main/java/com/nhpdev/demo/RetryService.java'));
 await vscode.window.showTextDocument(vscode.Uri.file('/tmp/idea-workspace-icons-preview/src/main/java/com/nhpdev/demo/RetryService.java'),{preview:false});
 await vscode.commands.executeCommand('notifications.clearAll');
 console.log('IDEA_ICONS_READY: file/product themes activated on VS Code '+vscode.version);
 await new Promise(()=>{});
};
