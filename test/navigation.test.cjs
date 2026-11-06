const {test}=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module');
function fixture(){
 const commands=new Map(),calls=[],status={visible:false,show(){this.visible=true},hide(){this.visible=false},dispose(){this.disposed=true}};
 let foldersChanged;
 const vscode={StatusBarAlignment:{Left:1},window:{createStatusBarItem:()=>status},
 workspace:{name:'pfmis',workspaceFolders:[{name:'pfmis'}],onDidChangeWorkspaceFolders:fn=>{foldersChanged=fn;return {dispose(){}}}},
 commands:{registerCommand:(id,fn)=>{commands.set(id,fn);return {dispose(){commands.delete(id)}}},executeCommand:async(...args)=>{calls.push(args);return 'native-result'}}};
 const load=Module._load;delete require.cache[require.resolve('../dist/navigation')];let navigation;
 try{Module._load=function(name,...rest){return name==='vscode'?vscode:load.call(this,name,...rest)};navigation=require('../dist/navigation').registerNavigation();}finally{Module._load=load;}
 return {navigation,status,commands,calls,vscode,foldersChanged:()=>foldersChanged()};
}
test('search and project switch forward directly to native commands',async()=>{
 const f=fixture();
 assert.equal(await f.commands.get('ideaWorkspace.search')(),'native-result');
 assert.equal(await f.commands.get('ideaWorkspace.switchProject')(),'native-result');
 assert.deepEqual(f.calls.slice(-2),[['workbench.action.quickOpen'],['workbench.action.openRecent']]);
 f.navigation.dispose();
});
test('layout enable/disable gates the shortcut context and project control',async()=>{
 const f=fixture();assert.equal(f.status.visible,false);
 await f.navigation.setEnabled(true);assert.equal(f.status.visible,true);assert.match(f.status.text,/pfmis/);
 assert.equal(f.status.command,'ideaWorkspace.switchProject');
 await f.navigation.setEnabled(false);assert.equal(f.status.visible,false);
 assert.deepEqual(f.calls.at(-1),['setContext','ideaWorkspace.navigationActive',false]);f.navigation.dispose();
});
test('project label follows workspace changes and handles an empty window',async()=>{
 const f=fixture();await f.navigation.setEnabled(true);
 f.vscode.workspace.name='Workspace with multiple projects';f.foldersChanged();assert.match(f.status.text,/Workspace with multiple projects/);
 f.vscode.workspace.name=undefined;f.vscode.workspace.workspaceFolders=undefined;f.foldersChanged();assert.match(f.status.text,/Open Project/);
 f.navigation.dispose();assert.equal(f.status.disposed,true);assert.equal(f.commands.size,0);
});
