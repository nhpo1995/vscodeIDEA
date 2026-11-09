// Self-contained external workbench module. No extension-host, Node or private service access.
(()=>{
 type MenuWindow=typeof globalThis & {__ideaWorkspaceMenu?:{dispose():void}};
 const scope=globalThis as MenuWindow;
 scope.__ideaWorkspaceMenu?.dispose();
 let controls:{element:HTMLElement;dispose():void}|undefined;
 const reconcileControls=(enabled:boolean)=>{
  const element=enabled?document.querySelector<HTMLElement>('.part.titlebar .window-controls-container:not(.wco-enabled):has(> .window-close)'):null;
  if(controls?.element===element){return;}
  controls?.dispose();controls=undefined;if(!element){return;}
  const buttons=[...element.querySelectorAll<HTMLElement>('.window-minimize,.window-max-restore,.window-close')];
  if(buttons.length!==3){return;}
  const attributes:{node:HTMLElement;key:string;before:string|null;applied:string}[]=[];
  const set=(node:HTMLElement,key:string,value:string)=>{attributes.push({node,key,before:node.getAttribute(key),applied:value});node.setAttribute(key,value);};
  set(element,'role','group');set(element,'aria-label','Window controls');
  for(const [index,button] of buttons.entries()){set(button,'tabindex','0');set(button,'role','button');if(!button.hasAttribute('aria-label')){set(button,'aria-label',['Minimize','Maximize or Restore','Close'][index]);}}
  let returnFocus:HTMLElement|null=null;
  const focus=(event:FocusEvent)=>{if(event.relatedTarget instanceof HTMLElement&&!element.contains(event.relatedTarget)){returnFocus=event.relatedTarget;}};
  const nextButton=(key:string,index:number):number=>{
   if(key==='Home')return 0;
   if(key==='End')return 2;
   const direction=key==='ArrowLeft'?-1:1;
   if(index<0)return direction<0?2:0;
   return (index+direction+buttons.length)%buttons.length;
  };
  const activateButton=(event:KeyboardEvent,target:HTMLElement)=>{
   event.preventDefault();event.stopPropagation();
   if(!event.repeat)target.click();
  };
  const keydown=(event:KeyboardEvent)=>{
   const target=event.target as HTMLElement,index=buttons.indexOf(target);
   if((event.key==='Enter'||event.key===' ')&&index>=0){activateButton(event,target);}
   else if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){
    event.preventDefault();event.stopPropagation();buttons[nextButton(event.key,index)].focus();
   }else if(event.key==='Escape'&&returnFocus?.isConnected){event.preventDefault();event.stopPropagation();returnFocus.focus();}
  };
  element.classList.add('idea-workspace-window-controls');element.addEventListener('keydown',keydown);element.addEventListener('focusin',focus);
  controls={element,dispose(){element.classList.remove('idea-workspace-window-controls');element.removeEventListener('keydown',keydown);element.removeEventListener('focusin',focus);for(const {node,key,before,applied} of attributes)if(node.getAttribute(key)===applied){if(before===null){node.removeAttribute(key);}else node.setAttribute(key,before);}}};
 };
 let active:{menu:HTMLElement;dispose():void}|undefined,queued=false,stopped=false;
 const markerSelector='.part.statusbar [id="nhpdev95.idea-workspace.ideaWorkspace.menu"],.part.statusbar [id="ideaWorkspace.menu"]';
 const reconcile=()=>{
  queued=false;if(stopped){return;}
  const marker=document.querySelector<HTMLElement>(markerSelector),left=document.querySelector<HTMLElement>('.part.titlebar .titlebar-left');
  reconcileControls(!!marker);
  const menu=left?.querySelector<HTMLElement>('.menubar'),logo=left?.querySelector<HTMLElement>('.window-appicon');
  if(!marker||!left||!menu||!logo||menu.classList.contains('compact')){active?.dispose();active=undefined;return;}
  if(active?.menu===menu && menu.isConnected){return;}
  active?.dispose();active=undefined;
  const style=document.createElement('style');style.id='idea-workspace-menu-style';
  style.textContent=`
   #idea-workspace-menu-button{position:relative;order:2;z-index:2500;app-region:no-drag;-webkit-app-region:no-drag;flex:none;width:30px;height:28px;margin:0 2px 0 0;align-self:center;padding:0;border:0;border-radius:5px;background:transparent;color:inherit;font:18px sans-serif;cursor:pointer}
   #idea-workspace-menu-button:hover{background:var(--vscode-toolbar-hoverBackground)}
   #idea-workspace-menu-button:focus-visible{outline:1px solid var(--vscode-focusBorder)}
   #idea-workspace-menu-button[hidden]{display:none!important}
   .idea-workspace-menu-enhanced #idea-workspace-menu-button[aria-expanded="true"]{display:none}
   .idea-workspace-menu-enhanced ${markerSelector.replaceAll(',',',.idea-workspace-menu-enhanced ')}{display:none!important}
   .part.titlebar .menubar{app-region:no-drag;-webkit-app-region:no-drag}
  `;
  const button=document.createElement('button');button.id='idea-workspace-menu-button';button.textContent='≡';button.title='Main Menu';button.setAttribute('aria-label','Main Menu');button.setAttribute('aria-haspopup','menu');
  let returnFocus:HTMLElement|null=null;
  const alt=()=>{for(const type of ['keydown','keyup'])window.dispatchEvent(new KeyboardEvent(type,{key:'Alt',code:'AltLeft',keyCode:18,which:18,altKey:type==='keydown',bubbles:true,cancelable:true}));};
  const remember=(event:MouseEvent)=>{returnFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;event.preventDefault();};
  const focus=(event:FocusEvent)=>{if(event.relatedTarget instanceof HTMLElement&&!menu.contains(event.relatedTarget)){returnFocus=event.relatedTarget;}};
  const click=()=>{alt();};
  const keydown=(event:KeyboardEvent)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();alt();}};
  const sync=()=>{
   const available=logo.getBoundingClientRect().width>0&&left.getBoundingClientRect().height>0;
   button.hidden=!available;document.documentElement.classList.toggle('idea-workspace-menu-enhanced',available);
   const open=getComputedStyle(menu).display!=='none';button.setAttribute('aria-expanded',String(open));
   if(!open && returnFocus?.isConnected && (document.activeElement===document.body||document.activeElement===button)){returnFocus.focus();}
  };
  button.addEventListener('mousedown',remember);button.addEventListener('focus',focus);button.addEventListener('click',click);button.addEventListener('keydown',keydown);
  document.head.append(style);logo.after(button);document.documentElement.classList.add('idea-workspace-menu-enhanced');
  const observer=new MutationObserver(sync);observer.observe(menu,{attributes:true,attributeFilter:['style']});sync();
  const resize=new ResizeObserver(sync);resize.observe(logo);resize.observe(left);
  active={menu,dispose(){observer.disconnect();resize.disconnect();button.removeEventListener('mousedown',remember);button.removeEventListener('focus',focus);button.removeEventListener('click',click);button.removeEventListener('keydown',keydown);button.remove();style.remove();document.documentElement.classList.remove('idea-workspace-menu-enhanced');}};
 };
 const schedule=()=>{if(!queued&&!stopped){queued=true;queueMicrotask(reconcile);}};
 const observer=new MutationObserver(records=>{
  if(records.some(record=>record.target instanceof Element && (!!record.target.closest('.part.titlebar,.part.statusbar')||[...record.addedNodes,...record.removedNodes].some(node=>node instanceof Element&&(node.matches('.monaco-workbench,.part.titlebar,.part.statusbar')||!!node.querySelector('.part.titlebar,.part.statusbar')))))){schedule();}
 });
 observer.observe(document.documentElement,{childList:true,subtree:true});
 const pagehide=()=>scope.__ideaWorkspaceMenu?.dispose();
 scope.__ideaWorkspaceMenu={dispose(){stopped=true;observer.disconnect();window.removeEventListener('pagehide',pagehide);controls?.dispose();controls=undefined;active?.dispose();active=undefined;delete scope.__ideaWorkspaceMenu;}};
 window.addEventListener('pagehide',pagehide,{once:true});
 schedule();
})();
