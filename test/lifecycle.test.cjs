const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs/promises');const os=require('node:os');const path=require('node:path');const Module=require('node:module');
const base=`<html><head><meta http-equiv="Content-Security-Policy" content="style-src 'unsafe-inline'; img-src data:; script-src 'self';"></head><body></body></html>`;
async function fixture(t,options={}){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'idea-lifecycle-')),app=path.join(root,'app');
 const target=path.join(app,'out/vs/code/electron-browser/workbench/workbench.html');await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,base);
 await require('../dist/patcher').applyPatch(target,path.join(root,'backups'),'a{}','1');
 const settings=new Map([['workbench.colorTheme','IDEA-inspired Dark']]);
 for(const [key,value] of Object.entries(options.settings??{}))settings.set(key,value);
 const state=new Map([['autoUiDisabled',true],['appearanceVersion','0.5.0'],['settingsJournal',{'workbench.colorTheme':{before:'old',applied:'IDEA-inspired Dark'}}]]);
 if(options.enabled){state.set('autoUiDisabled',false);state.set('appearanceVersion','0.4.2');}
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
 const context={subscriptions:[],extension:{packageJSON:{version:'0.5.0'}},globalStorageUri:{fsPath:path.join(root,'storage')},asAbsolutePath:rel=>path.join(__dirname,'..',rel),globalState:{get:key=>state.get(key),update:async(key,value)=>{if(value===undefined)state.delete(key);else state.set(key,value);}}};
 const load=Module._load;
 for(const file of ['../dist/extension','../dist/highlighting','../dist/navigation','../dist/menu'])delete require.cache[require.resolve(file)];
 let extension;try{Module._load=function(name,...rest){if(name==='vscode')return vscode;if(name==='./fonts')return {ensureFontInstalled:async()=>{fontCalls++;if(options.fontError)throw Error('font registration unavailable');return {state:'already-installed'};}};return load.call(this,name,...rest)};extension=require('../dist/extension');}finally{Module._load=load;}
 await extension.activate(context);
 t.after(async()=>{for(const sub of context.subscriptions)sub.dispose();await fs.rm(root,{recursive:true,force:true});});
 return {root,target,settings,state,status,menuStatus,commands,contexts,projectStatus,fontCalls:()=>fontCalls,changeConfig:(key,value)=>{settings.set(key,value);for(const listener of configurationListeners)listener({affectsConfiguration:name=>name===key});},fail:()=>{failWrites=true},recover:()=>{failWrites=false}};
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

test('font setup failure does not prevent theme or editor/terminal presets; retry stays available',async t=>{
 const f=await fixture(t,{enabled:true,fontError:true});
 assert.equal(f.fontCalls(),1);
 assert.equal(f.settings.get('workbench.colorTheme'),'IDEA-inspired Dark');
 assert.match(f.settings.get('editor.fontFamily'),/JetBrains Mono/);
 assert.equal(f.settings.get('terminal.integrated.fontSize'),14);
 assert.equal(f.state.get('fontStatus').state,'failed');
 await f.commands.get('ideaWorkspace.apply')();assert.equal(f.fontCalls(),2);
 await f.commands.get('ideaWorkspace.installFonts')();assert.equal(f.fontCalls(),3);
});

test('automatic font setup stays paused after Restore; explicit Apply can install again',async t=>{
 const f=await fixture(t);
 assert.equal(f.fontCalls(),0);
 await f.commands.get('ideaWorkspace.apply')();assert.equal(f.fontCalls(),1);
 await f.commands.get('ideaWorkspace.restore')();
 assert.equal(f.state.get('autoUiDisabled'),true);
 assert.equal(f.settings.has('editor.fontFamily'),false);
});

test('Apply and Restore journal native layout settings and gate double Shift/project control',async t=>{
 const f=await fixture(t,{settings:{'window.menuBarVisibility':'classic','workbench.sideBar.location':'right'}});
 assert.equal(f.contexts.get('ideaWorkspace.navigationActive'),false);
 await f.commands.get('ideaWorkspace.apply')();
 assert.equal(f.settings.get('workbench.sideBar.location'),'left');
 if(process.platform!=='darwin')assert.equal(f.settings.get('window.menuBarVisibility'),'toggle');
 assert.equal(f.contexts.get('ideaWorkspace.navigationActive'),true);assert.equal(f.projectStatus.visible,true);assert.equal(f.menuStatus.visible,process.platform!=='darwin');
 assert.match(await fs.readFile(f.target,'utf8'),process.platform==='darwin'?/idea-workspace-custom-ui/:/idea-workspace-menu-[a-f0-9]+\.js/);
 await f.commands.get('ideaWorkspace.restore')();
 assert.equal(f.settings.get('workbench.sideBar.location'),'right');
 assert.equal(f.settings.get('window.menuBarVisibility'),'classic');
 assert.equal(f.contexts.get('ideaWorkspace.navigationActive'),false);assert.equal(f.projectStatus.visible,false);assert.equal(f.menuStatus.visible,false);
 assert.ok(!(await fs.readFile(f.target,'utf8')).includes('idea-workspace-menu-'));
});

test('disabling navigation restores only layout and leaves fonts/theme active',async t=>{
 const f=await fixture(t,{settings:{'window.menuBarVisibility':'classic','workbench.sideBar.location':'right'}});
 await f.commands.get('ideaWorkspace.apply')();f.settings.set('editor.fontSize',18);
 const calls=f.fontCalls(),shown=f.status.shown;f.changeConfig('ideaWorkspace.navigation.enabled',false);
 for(let i=0;i<60 && f.status.shown===shown;i++)await new Promise(r=>setTimeout(r,20));
 assert.ok(f.status.shown>shown,'configuration update completed');
 assert.equal(f.contexts.get('ideaWorkspace.navigationActive'),false);
 assert.equal(f.settings.get('workbench.sideBar.location'),'right');
 assert.equal(f.settings.get('window.menuBarVisibility'),'classic');
 assert.equal(f.settings.get('editor.fontSize'),18);assert.equal(f.settings.get('workbench.colorTheme'),'IDEA-inspired Dark');assert.equal(f.fontCalls(),calls);
});

test('same-version restart reconciles offline navigation changes without resetting font edits',async t=>{
 const first=await fixture(t,{settings:{'window.menuBarVisibility':'classic','workbench.sideBar.location':'right'}});
 await first.commands.get('ideaWorkspace.apply')();first.settings.set('editor.fontSize',18);
 const disabled=await fixture(t,{settings:{...Object.fromEntries(first.settings),'ideaWorkspace.navigation.enabled':false},state:Object.fromEntries(first.state)});
 assert.equal(disabled.settings.get('workbench.sideBar.location'),'right');
 assert.equal(disabled.settings.get('window.menuBarVisibility'),'classic');
 assert.equal(disabled.menuStatus.visible,false);assert.equal(disabled.contexts.get('ideaWorkspace.navigationActive'),false);assert.equal(disabled.settings.get('editor.fontSize'),18);
 const enabled=await fixture(t,{settings:{...Object.fromEntries(disabled.settings),'ideaWorkspace.navigation.enabled':true},state:Object.fromEntries(disabled.state)});
 assert.equal(enabled.settings.get('workbench.sideBar.location'),'left');
 if(process.platform!=='darwin')assert.equal(enabled.settings.get('window.menuBarVisibility'),'toggle');
 assert.equal(enabled.menuStatus.visible,process.platform!=='darwin');assert.equal(enabled.contexts.get('ideaWorkspace.navigationActive'),true);assert.equal(enabled.settings.get('editor.fontSize'),18);
});

test('search layout hides navigation buttons and returns the original preference on Disable and Restore',{skip:!['win32','linux'].includes(process.platform)},async t=>{
 for(const exit of ['disable','restore']){
  const f=await fixture(t,{settings:{'workbench.navigationControl.enabled':true}});
  await f.commands.get('ideaWorkspace.apply')();
  assert.equal(f.settings.get('workbench.navigationControl.enabled'),false);
  if(exit==='restore')await f.commands.get('ideaWorkspace.restore')();
  else {
   const shown=f.status.shown;f.changeConfig('ideaWorkspace.navigation.enabled',false);
   for(let i=0;i<60 && f.status.shown===shown;i++)await new Promise(r=>setTimeout(r,20));
   assert.ok(f.status.shown>shown,'navigation configuration processed');
  }
  assert.equal(f.settings.get('workbench.navigationControl.enabled'),true);
 }
});

test('search layout Restore preserves a later navigation preference instead of deleting it',{skip:!['win32','linux'].includes(process.platform)},async t=>{
 const f=await fixture(t);
 await f.commands.get('ideaWorkspace.apply')();
 assert.equal(f.settings.get('workbench.navigationControl.enabled'),false);
 f.settings.set('workbench.navigationControl.enabled',true);
 await f.commands.get('ideaWorkspace.restore')();
 assert.equal(f.settings.get('workbench.navigationControl.enabled'),true);
});
