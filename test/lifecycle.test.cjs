const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs/promises');const os=require('node:os');const path=require('node:path');const Module=require('node:module');
const base=`<html><head><meta http-equiv="Content-Security-Policy" content="style-src 'unsafe-inline'; img-src data:;"></head><body></body></html>`;
async function fixture(t){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'idea-lifecycle-')),app=path.join(root,'app');
 const target=path.join(app,'out/vs/code/electron-browser/workbench/workbench.html');await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,base);
 await require('../dist/patcher').applyPatch(target,path.join(root,'backups'),'a{}','1');
 const settings=new Map([['workbench.colorTheme','IDEA-inspired Dark']]);
 const state=new Map([['autoUiDisabled',true],['appearanceVersion','0.5.0'],['settingsJournal',{'workbench.colorTheme':{before:'old',applied:'IDEA-inspired Dark'}}]]);
 const status={show(){},dispose(){}};let failWrites=false;const noop=()=>({dispose(){}});
 class Disposable{constructor(fn){this.dispose=fn}};
 const vscode={Disposable,ThemeColor:class{},DecorationRangeBehavior:{ClosedClosed:1},StatusBarAlignment:{Left:1},UIKind:{Desktop:1},ConfigurationTarget:{Global:1},env:{appRoot:app,version:'1.145.0',sessionId:'session',uiKind:1},version:'1.145.0',
  window:{createOutputChannel:()=>({appendLine(){},clear(){},show(){},dispose(){}}),createStatusBarItem:()=>status,createTextEditorDecorationType:noop,visibleTextEditors:[],onDidChangeVisibleTextEditors:noop,showWarningMessage:async()=>undefined,showInformationMessage:async()=>undefined},
  workspace:{getConfiguration:(section)=>({get:(key,defaultValue)=>settings.get(section?section+'.'+key:key)??defaultValue,inspect:key=>({globalValue:settings.get(section?section+'.'+key:key)}),update:async(key,value)=>{if(failWrites)throw Error('settings failed');if(value===undefined)settings.delete(key);else settings.set(key,value);}}),onDidChangeTextDocument:noop,onDidCloseTextDocument:noop,onDidChangeConfiguration:noop},
  commands:{registerCommand:(id,handler)=>{commands.set(id,handler);return noop()},executeCommand:async id=>commands.get(id)?.()}};
 const commands=new Map();
 const context={subscriptions:[],extension:{packageJSON:{version:'0.5.0'}},globalStorageUri:{fsPath:path.join(root,'storage')},asAbsolutePath:rel=>path.join(__dirname,'..',rel),globalState:{get:key=>state.get(key),update:async(key,value)=>{if(value===undefined)state.delete(key);else state.set(key,value);}}};
 const load=Module._load;
 for(const file of ['../dist/extension','../dist/highlighting'])delete require.cache[require.resolve(file)];
 let extension;try{Module._load=function(name,...rest){return name==='vscode'?vscode:load.call(this,name,...rest)};extension=require('../dist/extension');}finally{Module._load=load;}
 await extension.activate(context);
 t.after(async()=>{for(const sub of context.subscriptions)sub.dispose();await fs.rm(root,{recursive:true,force:true});});
 return {root,target,settings,state,status,commands,fail:()=>{failWrites=true},recover:()=>{failWrites=false}};
}
test('Restore does not require a configured logo that has been deleted',async t=>{
 const f=await fixture(t);f.settings.set('ideaWorkspace.logoPath',path.join(f.root,'deleted.svg'));
 await f.commands.get('ideaWorkspace.restore')();
 assert.equal(await fs.readFile(f.target,'utf8'),base);
 assert.equal(f.settings.get('workbench.colorTheme'),'old');
 assert.equal(f.state.get('pendingReload')?.action,'restore');
 assert.match(f.status.text,/Reload UI/);
});
test('CSS removal persists reload state before a settings failure and retains it on retry',async t=>{
 const f=await fixture(t);f.fail();await f.commands.get('ideaWorkspace.restore')();
 assert.equal(await fs.readFile(f.target,'utf8'),base);
 assert.equal(f.state.get('pendingReload')?.action,'restore');
 f.recover();await f.commands.get('ideaWorkspace.restore')();
 assert.equal(f.settings.get('workbench.colorTheme'),'old');
 assert.equal(f.state.get('pendingReload')?.action,'restore');assert.match(f.status.text,/Reload UI/);
});
