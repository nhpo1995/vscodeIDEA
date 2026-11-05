const vscode=require('vscode');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
exports.run=async()=>{
 assert.ok(vscode.env.appRoot.startsWith('/tmp/idea-workspace-code-020/'));
 await vscode.extensions.getExtension('local-workspace.idea-workspace').activate();
 await fs.mkdir('/tmp/idea-workspace-java-preview',{recursive:true});
 await fs.copyFile(require('node:path').join(__dirname,'fixtures/RetryService.java'),'/tmp/idea-workspace-java-preview/RetryService.java');
 const uri=vscode.Uri.file('/tmp/idea-workspace-java-preview/RetryService.java');
 const document=await vscode.workspace.openTextDocument(uri);
 await vscode.window.showTextDocument(document,{preview:false});
 await vscode.commands.executeCommand('workbench.action.closeAuxiliaryBar');
 await vscode.commands.executeCommand('workbench.view.explorer');
 let legend,tokens;
 for(let i=0;i<120;i++){
  legend=await vscode.commands.executeCommand('vscode.provideDocumentSemanticTokensLegend',uri);
  tokens=await vscode.commands.executeCommand('vscode.provideDocumentSemanticTokens',uri);
  if(legend && tokens?.data.length)break;
  await new Promise(r=>setTimeout(r,500));
 }
 assert.ok(legend && tokens?.data.length,'real Java provider returns semantic tokens');
 const lines=document.getText().split(/\r?\n/);
 const {constantRanges}=require('../dist/constants');
 const ranges=constantRanges(lines,legend,tokens.data);
 const names=ranges.map(r=>lines[r.line].slice(r.start,r.start+r.length));
 assert.ok(names.includes('MAX_RETRIES'),'final uppercase field is decorated');
 assert.ok(names.includes('LOCAL_LIMIT'),'final uppercase local is decorated');
 assert.ok(!names.includes('UPPER_MUTABLE') && !names.includes('UPPER_LOCAL'),'uppercase mutable field stays neutral');
 assert.ok(!names.includes('initialRetries') && !names.includes('localCount'),'camelCase finals stay neutral');
 const decoded=[];let line=0,start=0;
 for(let i=0;i<tokens.data.length;i+=5){const d=tokens.data;line+=d[i];start=d[i]===0?start+d[i+1]:d[i+1];decoded.push({text:lines[line].slice(start,start+d[i+2]),type:legend.tokenTypes[d[i+3]],modifiers:legend.tokenModifiers.filter((m,n)=>(d[i+4]&(1<<n))!==0)});}
 await fs.writeFile('/tmp/idea-workspace-040-java-report.json',JSON.stringify({names,ranges,decoded},null,2));
 console.log('IDEA_JAVA_PASS: real Red Hat Java semantic tokens; final UPPER_CASE fields, locals and usages selected; mutable uppercase and camelCase finals excluded.');
 if(process.env.IDEA_JAVA_VISUAL==='1'){await vscode.commands.executeCommand('notifications.clearAll');console.log('IDEA_JAVA_VISUAL_READY');await new Promise(()=>{});}
};
