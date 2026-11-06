const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs/promises');const os=require('node:os');const path=require('node:path');const Module=require('node:module');
const base=`<html><head><meta http-equiv="Content-Security-Policy" content="style-src 'unsafe-inline'; img-src data:; script-src 'self';"></head><body></body></html>`;
async function fixture(t,options={}){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'idea-menu-')),app=path.join(root,'app');
 const target=path.join(app,'out/vs/code/electron-browser/workbench/workbench.html');await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,base);
 const settings=new Map([['workbench.colorTheme','IDEA-inspired Dark'],['ideaWorkspace.navigation.enabled',true]]);
 for(const [key,value] of Object.entries(options.settings??{}))settings.set(key,value);
 const state=new Map([['autoUiDisabled',false],['appearanceVersion','0.4.2'],['settingsJournal',{}],['customUiRequested',false]]);
 for(const [key,value] of Object.entries(options.state??{}))state.set(key,structuredClone(value));
 let fontCalls=0;
 const status={shown:0,show(){this.shown++},hide(){},dispose(){}},projectStatus={show(){this.visible=true},hide(){this.visible=false},dispose(){}};
 const menuStatus={visible:false,show(){this.visible=true},hide(){this.visible=false},dispose(){this.visible=false}},contexts=new Map(),configurationListeners=[];let failWrites=false;const noop=()=>({dispose(){}});
 class Disposable{constructor(fn){this.dispose=fn}};
 const vscode={Disposable,ThemeColor:class{},DecorationRangeBehavior:{ClosedClosed:1},StatusBarAlignment:{Left:1},UIKind:{Desktop:1},ConfigurationTarget:{Global:1},env:{appRoot:app,version:'1.145.0',sessionId:'session',uiKind:1},version:'1.145.0',
  window:{createOutputChannel:()=>({appendLine(){},clear(){},show(){},dispose(){}}),createStatusBarItem:id=>id==='ideaWorkspace.menu'?menuStatus:typeof id==='string'?projectStatus:status,createTextEditorDecorationType:noop,visibleTextEditors:[],onDidChangeVisibleTextEditors:noop,showWarningMessage:async()=>undefined,showInformationMessage:async()=>undefined},
  workspace:{name:'Test workspace',workspaceFolders:[{name:'Test workspace'}],onDidChangeWorkspaceFolders:noop,getConfiguration:(section)=>({get:(key,defaultValue)=>settings.get(section?section+'.'+key:key)??defaultValue,inspect:key=>({globalValue:settings.get(section?section+'.'+key:key)}),update:async(key,value)=>{if(failWrites)throw Error('settings failed');if(value===undefined)settings.delete(key);else settings.set(key,value);}}),onDidChangeTextDocument:noop,onDidCloseTextDocument:noop,onDidChangeConfiguration:fn=>{configurationListeners.push(fn);return noop()}},
  commands:{registerCommand:(id,handler)=>{commands.set(id,handler);return noop()},executeCommand:async(id,...args)=>{if(id==='setContext'){contexts.set(args[0],args[1]);return;}return commands.get(id)?.(...args)}}};
 const commands=new Map();
 const context={subscriptions:[],extension:{packageJSON:{version:'0.6.0'}},globalStorageUri:{fsPath:path.join(root,'storage')},asAbsolutePath:rel=>path.join(__dirname,'..',rel),globalState:{get:key=>state.get(key),update:async(key,value)=>{if(value===undefined)state.delete(key);else state.set(key,value);}}};
 const load=Module._load;
 for(const file of ['../dist/extension','../dist/highlighting','../dist/navigation','../dist/menu'])delete require.cache[require.resolve(file)];
 let extension;try{Module._load=function(name,...rest){if(name==='vscode')return vscode;if(name==='./fonts')return {ensureFontInstalled:async()=>{fontCalls++;if(options.fontError)throw Error('font registration unavailable');return {state:'already-installed'};}};return load.call(this,name,...rest)};extension=require('../dist/extension');}finally{Module._load=load;}
 await extension.activate(context);
 t.after(async()=>{for(const sub of context.subscriptions)sub.dispose();await fs.rm(root,{recursive:true,force:true});});
 return {root,target,settings,state,status,menuStatus,commands,contexts,projectStatus,execute:vscode.commands.executeCommand,fontCalls:()=>fontCalls,changeConfig:(key,value)=>{settings.set(key,value);for(const listener of configurationListeners)listener({affectsConfiguration:name=>name===key});},fail:()=>{failWrites=true},recover:()=>{failWrites=false}};
}
test('native titlebar fallback reveals the application menu and Restore preserves its original visibility',async t=>{
 const f=await fixture(t,{settings:{'window.menuBarVisibility':'hidden'}});
 await f.commands.get('ideaWorkspace.apply')();
 f.changeConfig('window.titleBarStyle','native');
 await f.execute(f.menuStatus.command);
 assert.equal(f.settings.get('window.menuBarVisibility'),'classic');
 await f.commands.get('ideaWorkspace.restore')();
 assert.equal(f.settings.get('window.menuBarVisibility'),'hidden');
 assert.equal(f.settings.get('window.titleBarStyle'),'native','preserve the user titlebar edit');
});
test('Apply installs menuRenderer asset and shows menu control on win32/linux',async t=>{
 const f=await fixture(t);await f.commands.get('ideaWorkspace.apply')();
 const html=await fs.readFile(f.target,'utf8');
 assert.ok(/idea-workspace-menu-[a-f0-9]{32}\.js/.test(html),'menuRenderer asset referenced in workbench HTML');
 const rendererFile=path.join(path.dirname(f.target),html.match(/src="\.\/(idea-workspace-menu-[a-f0-9]{32}\.js)"/)[1]);
 assert.equal(await fs.readFile(rendererFile,'utf8'),await fs.readFile(path.join(__dirname,'..','dist','menuRenderer.js'),'utf8'));
 assert.equal(f.contexts.get('ideaWorkspace.navigationActive'),true);
 assert.equal(f.menuStatus.visible,true);
 await f.commands.get('ideaWorkspace.restore')();
 assert.equal((await fs.readFile(f.target,'utf8')).includes('idea-workspace-menu-'),false);
 assert.equal(f.menuStatus.visible,false);
});
test('Restore removes menuRenderer asset and pending reload persists',async t=>{
 const f=await fixture(t);await f.commands.get('ideaWorkspace.apply')();
 assert.ok((await fs.readFile(f.target,'utf8')).includes('idea-workspace-menu-'));
 await f.commands.get('ideaWorkspace.restore')();
 assert.equal((await fs.readFile(f.target,'utf8')).includes('idea-workspace-menu-'),false);
 assert.equal(f.state.get('pendingReload')?.action,'restore');
 assert.equal(f.contexts.get('ideaWorkspace.navigationActive'),false);
});
test('Re-apply after Restore reinstalls menuRenderer without duplicate assets',async t=>{
 const f=await fixture(t);await f.commands.get('ideaWorkspace.apply')();
 const first=await fs.readFile(f.target,'utf8');const count1=(first.match(/idea-workspace-menu-[a-f0-9]{32}\.js/g)||[]).length;
 assert.equal(count1,1);
 await f.commands.get('ideaWorkspace.restore')();
 await f.commands.get('ideaWorkspace.apply')();
 const second=await fs.readFile(f.target,'utf8');const count2=(second.match(/idea-workspace-menu-[a-f0-9]{32}\.js/g)||[]).length;
 assert.equal(count2,1);
});
