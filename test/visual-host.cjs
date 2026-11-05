const vscode=require('vscode');
const path=require('node:path');
exports.run=async()=>{
 if(!vscode.env.appRoot.startsWith('/tmp/idea-workspace-code-020/'))throw Error('Disposable installation required');
 const ext=vscode.extensions.getExtension('local-workspace.idea-workspace');await ext.activate();
 await vscode.commands.executeCommand('workbench.action.closeAllEditors');
 await vscode.commands.executeCommand('workbench.action.closeAuxiliaryBar');
 for(const file of ['src/patcher.ts','src/extension.ts'])await vscode.window.showTextDocument(vscode.Uri.file(path.join(ext.extensionPath,file)),{preview:false});
 await vscode.commands.executeCommand('workbench.view.explorer');
 await vscode.commands.executeCommand('workbench.action.terminal.new');
 await vscode.commands.executeCommand('notifications.clearAll');
 console.log('IDEA_VISUAL_READY');
 await new Promise(()=>{});
};
