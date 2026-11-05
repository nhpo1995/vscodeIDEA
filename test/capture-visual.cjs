// Capture only the disposable application launched with test/visual-host.cjs.
const fs=require('node:fs/promises');
const assert=require('node:assert/strict');
(async()=>{
 const pages=await(await fetch('http://127.0.0.1:9337/json')).json();
 const page=pages.find(p=>p.type==='page' && p.url.includes('/tmp/idea-workspace-code-020/'));
 assert.ok(page,'disposable workbench must be running');
 const ws=new WebSocket(page.webSocketDebuggerUrl);
 await new Promise(r=>ws.addEventListener('open',r,{once:true}));
 let id=0;const pending=new Map();
 ws.addEventListener('message',event=>{const data=JSON.parse(event.data);if(pending.has(data.id)){pending.get(data.id)(data);pending.delete(data.id);}});
 const call=(method,params={})=>new Promise((resolve,reject)=>{const request=++id;pending.set(request,data=>data.error?reject(Error(JSON.stringify(data.error))):resolve(data.result));ws.send(JSON.stringify({id:request,method,params}));});
 try{
  await call('Runtime.evaluate',{expression:'document.fonts.ready.then(()=>true)',awaitPromise:true,returnByValue:true});
  const result=await call('Runtime.evaluate',{expression:`JSON.stringify((()=>{
   const logo=document.querySelector('.part.titlebar .window-appicon');
   const menu=document.querySelector('.part.titlebar .menubar');
   const icon=document.querySelector('.part.activitybar .codicon-explorer-view-icon, .part.activitybar .codicon-files');
   const tab=document.querySelector('.part.editor .tab.active');
   return {logoBackground:getComputedStyle(logo).backgroundColor,headerGradient:getComputedStyle(document.querySelector('.part.titlebar')).backgroundImage,syntax:[...document.querySelectorAll('.view-lines .view-line span')].filter(e=>!e.childElementCount).map(e=>({text:e.textContent?.trim(),color:getComputedStyle(e).color})),logo:logo?.getBoundingClientRect().toJSON(),menu:menu?.getBoundingClientRect().toJSON(),logoData:getComputedStyle(logo).backgroundImage.startsWith('url("data:image/svg+xml;base64,'),theme:getComputedStyle(document.querySelector('.monaco-workbench')).getPropertyValue('--vscode-tab-activeBackground').trim(),tabHeight:tab?.getBoundingClientRect().height,iconFamily:icon?getComputedStyle(icon,'::before').fontFamily:'missing',fontStatus:document.fonts.status,toolbar:[...document.querySelectorAll('.editor-actions .action-label')].map(e=>e.getAttribute('aria-label')),style:!!document.getElementById('idea-workspace-custom-ui'),modernUI:document.querySelector('.monaco-workbench').classList.contains('modern-ui')};
  })())`,returnByValue:true});
  const report=JSON.parse(result.result.value);
  assert.ok(report.style && report.logoData);
  assert.equal(report.logoBackground,'rgba(0, 0, 0, 0)','logo has no background badge');
  assert.match(report.headerGradient,/linear-gradient/);
  const expected={RetryService:'rgb(226, 192, 119)',RetryPolicy:'rgb(125, 207, 193)',nextAttempt:'rgb(97, 175, 239)',int:'rgb(118, 199, 231)',MAX_RETRIES:'rgb(199, 146, 234)',LOCAL_LIMIT:'rgb(199, 146, 234)',initialRetries:'rgb(212, 212, 212)',localCount:'rgb(212, 212, 212)',UPPER_MUTABLE:'rgb(212, 212, 212)',UPPER_LOCAL:'rgb(212, 212, 212)'};
  for(const [name,color] of Object.entries(expected)){const spans=report.syntax.filter(s=>s.text===name);assert.ok(spans.length,name+' is visible');for(const span of spans)assert.equal(span.color,color,name+' rendered color');}
  report.syntax=report.syntax.filter(s=>Object.hasOwn(expected,s.text));
  assert.ok(report.logo.right<=report.menu.left,'logo precedes File menu');
  assert.equal(report.theme.toUpperCase(),'#242424');
  assert.ok(report.tabHeight>=22);
  assert.match(report.iconFamily,/nhpdev-workspace-ui/);
  assert.equal(report.fontStatus,'loaded');
  // Native experimental UI preference is preserved.
  assert.ok(!report.toolbar.some(label=>label?.startsWith('IDEA Workspace:')),'native toolbar preserved');
  // Dismiss a regular integrity notification through its visible Close button.
  await call('Runtime.evaluate',{expression:`[...document.querySelectorAll('.notification-toast .action-label')].filter(e=>/Clear Notification|Close/i.test(e.getAttribute('aria-label')||'')).forEach(e=>e.click())`});
  const shot=await call('Page.captureScreenshot',{format:'png'});
  await fs.writeFile('docs/screenshots/idea-workspace-0.4.0-java.png',Buffer.from(shot.data,'base64'));
  await fs.writeFile('docs/screenshots/visual-report.json',JSON.stringify(report,null,2)+'\n');
  console.log('IDEA_VISUAL_PASS',JSON.stringify(report));
 }finally{ws.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
