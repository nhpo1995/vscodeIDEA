// Self-contained external workbench module. No extension-host, Node or private service access.
(()=>{
 type MenuWindow=typeof globalThis & {__ideaWorkspaceMenu?:{dispose():void}};
 const scope=globalThis as MenuWindow;
 scope.__ideaWorkspaceMenu?.dispose();
 let active:{menu:HTMLElement;dispose():void}|undefined,queued=false,stopped=false;
 const markerSelector='.part.statusbar [id="nhpdev95.idea-workspace.ideaWorkspace.menu"],.part.statusbar [id="ideaWorkspace.menu"]';
 const reconcile=()=>{
  queued=false;if(stopped)return;
  const marker=document.querySelector<HTMLElement>(markerSelector),left=document.querySelector<HTMLElement>('.part.titlebar .titlebar-left');
  const menu=left?.querySelector<HTMLElement>('.menubar'),logo=left?.querySelector<HTMLElement>('.window-appicon');
  if(!marker||!left||!menu||!logo||menu.classList.contains('compact')){active?.dispose();active=undefined;return;}
  if(active?.menu===menu && menu.isConnected)return;
  active?.dispose();active=undefined;
  const style=document.createElement('style');style.id='idea-workspace-menu-style';
  style.textContent=`
   #idea-workspace-menu-button{position:relative;order:2;z-index:2500;app-region:no-drag;-webkit-app-region:no-drag;flex:none;width:30px;height:28px;margin:0 2px 0 0;align-self:center;padding:0;border:0;border-radius:5px;background:transparent;color:inherit;font:18px sans-serif;cursor:pointer}
   #idea-workspace-menu-button:hover{background:var(--vscode-toolbar-hoverBackground)}
   #idea-workspace-menu-button:focus-visible{outline:1px solid var(--vscode-focusBorder)}
   #idea-workspace-menu-button[hidden]{display:none!important}
   .idea-workspace-menu-enhanced #idea-workspace-menu-button[aria-expanded="true"]{display:none}
   .idea-workspace-menu-enhanced ${markerSelector.split(',').join(',.idea-workspace-menu-enhanced ')}{display:none!important}
   .part.titlebar .menubar{app-region:no-drag;-webkit-app-region:no-drag}
  `;
  const button=document.createElement('button');button.id='idea-workspace-menu-button';button.textContent='≡';button.title='Main Menu';button.setAttribute('aria-label','Main Menu');button.setAttribute('aria-haspopup','menu');
  let returnFocus:HTMLElement|null=null;
  const alt=()=>{for(const type of ['keydown','keyup'])window.dispatchEvent(new KeyboardEvent(type,{key:'Alt',code:'AltLeft',keyCode:18,which:18,altKey:type==='keydown',bubbles:true,cancelable:true}));};
  const remember=(event:MouseEvent)=>{returnFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;event.preventDefault();};
  const focus=(event:FocusEvent)=>{if(event.relatedTarget instanceof HTMLElement&&!menu.contains(event.relatedTarget))returnFocus=event.relatedTarget;};
  const click=()=>{alt();};
  const keydown=(event:KeyboardEvent)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();alt();}};
  const sync=()=>{
   const available=logo.getBoundingClientRect().width>0&&left.getBoundingClientRect().height>0;
   button.hidden=!available;document.documentElement.classList.toggle('idea-workspace-menu-enhanced',available);
   const open=getComputedStyle(menu).display!=='none';button.setAttribute('aria-expanded',String(open));
   if(!open && returnFocus?.isConnected && (document.activeElement===document.body||document.activeElement===button))returnFocus.focus();
  };
  button.addEventListener('mousedown',remember);button.addEventListener('focus',focus);button.addEventListener('click',click);button.addEventListener('keydown',keydown);
  document.head.append(style);logo.after(button);document.documentElement.classList.add('idea-workspace-menu-enhanced');
  const observer=new MutationObserver(sync);observer.observe(menu,{attributes:true,attributeFilter:['style']});sync();
  const resize=new ResizeObserver(sync);resize.observe(logo);resize.observe(left);
  active={menu,dispose(){observer.disconnect();resize.disconnect();button.removeEventListener('mousedown',remember);button.removeEventListener('focus',focus);button.removeEventListener('click',click);button.removeEventListener('keydown',keydown);button.remove();style.remove();document.documentElement.classList.remove('idea-workspace-menu-enhanced');}};
 };
 const schedule=()=>{if(!queued&&!stopped){queued=true;queueMicrotask(reconcile);}};
 const observer=new MutationObserver(records=>{
  if(records.some(record=>record.target instanceof Element && (!!record.target.closest('.part.titlebar,.part.statusbar')||[...record.addedNodes,...record.removedNodes].some(node=>node instanceof Element&&(node.matches('.monaco-workbench,.part.titlebar,.part.statusbar')||!!node.querySelector('.part.titlebar,.part.statusbar'))))))schedule();
 });
 observer.observe(document.documentElement,{childList:true,subtree:true});
 const pagehide=()=>scope.__ideaWorkspaceMenu?.dispose();
 scope.__ideaWorkspaceMenu={dispose(){stopped=true;observer.disconnect();window.removeEventListener('pagehide',pagehide);active?.dispose();active=undefined;delete scope.__ideaWorkspaceMenu;}};
 window.addEventListener('pagehide',pagehide,{once:true});
 schedule();
})();
