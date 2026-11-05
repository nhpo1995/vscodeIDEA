const assert=require('node:assert/strict');
const vscode=require('vscode');
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
exports.run=async()=>{
 const run=JSON.parse(await fs.readFile('/tmp/idea-workspace-current-update-test.json','utf8'));
 assert.ok(vscode.env.appRoot.startsWith(run.root+'/VSCode-linux-x64/'),'must use extracted update, never installed application');
 assert.equal(vscode.version,run.new);
 const extension=vscode.extensions.getExtension('local-workspace.idea-workspace');assert.ok(extension);
 assert.equal(extension.packageJSON.version,'0.4.0');await extension.activate();
 const config=vscode.workspace.getConfiguration();
 const expected={'workbench.colorTheme':'IDEA-inspired Dark','workbench.iconTheme':'idea-workspace-files','workbench.productIconTheme':'idea-workspace-ui','editor.minimap.enabled':true,'breadcrumbs.enabled':false,'workbench.sideBar.location':'right','window.commandCenter':false};
 for(const [key,value] of Object.entries(expected))assert.equal(config.get(key),value,key+' preserved across update');
 const {findWorkbench,constantRanges}=Object.assign({},require(path.join(extension.extensionPath,'dist/patcher')),require(path.join(extension.extensionPath,'dist/constants')));
 const target=await findWorkbench(vscode.env.appRoot),html=await fs.readFile(target,'utf8');
 assert.ok(html.includes('idea-workspace:ui-0.4.0'),'patch auto-reapplied to fresh workbench');
 const clean=html.replace(/<!-- idea-workspace:start -->[\s\S]*?<!-- idea-workspace:end -->/,'');
 const digest=crypto.createHash('sha256').update(clean).digest('hex');
 assert.equal(digest,run.originalHtmlHash,'only owned patch added to new workbench');
 const fixture=vscode.Uri.file('/tmp/idea-workspace-java-preview/RetryService.java');
 const document=await vscode.workspace.openTextDocument(fixture);await vscode.window.showTextDocument(document,{preview:false});
 let legend,tokens;
 for(let n=0;n<120;n++){
  legend=await vscode.commands.executeCommand('vscode.provideDocumentSemanticTokensLegend',fixture);
  tokens=await vscode.commands.executeCommand('vscode.provideDocumentSemanticTokens',fixture);
  if(legend && tokens?.data.length)break;
  await new Promise(resolve=>setTimeout(resolve,500));
 }
 assert.ok(legend && tokens?.data.length,'real Java semantics still available after app update');
 const lines=document.getText().split(/\r?\n/),ranges=constantRanges(lines,legend,tokens.data);
 const names=ranges.map(r=>lines[r.line].slice(r.start,r.start+r.length));
 assert.ok(names.includes('MAX_RETRIES') && names.includes('LOCAL_LIMIT'));
 assert.ok(!names.some(name=>['UPPER_MUTABLE','UPPER_LOCAL','initialRetries','localCount'].includes(name)));
 const report={oldVersion:run.old,newVersion:vscode.version,extension:extension.packageJSON.version,automaticPatch:true,onlyOwnedHtmlChanged:true,settingsPreserved:expected,javaConstants:names};
 await fs.writeFile(path.join(run.root,'update-report.json'),JSON.stringify(report,null,2));
 console.log('IDEA_UPDATE_PASS',JSON.stringify(report));
 if(process.env.IDEA_UPDATE_VISUAL==='1'){
  await vscode.commands.executeCommand('workbench.action.closeAuxiliaryBar');
  await vscode.commands.executeCommand('notifications.clearAll');
  console.log('IDEA_UPDATE_VISUAL_READY');await new Promise(()=>{});
 }
};
