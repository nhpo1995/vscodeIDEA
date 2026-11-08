/** Prepended only to an owned copy of a recognized native desktop module. No globals or IPC. */
interface IdeaRailDisposable {dispose():void}
interface IdeaRailContainer {id:string;title:{value?:string}|string;icon?:{id?:string;scheme?:string;with?(value:{scheme:string;authority:string}):{toString(skipEncoding?:boolean):string}}}
interface IdeaRailView {element:HTMLElement;minimumWidth:number;maximumWidth:number;minimumHeight:number;maximumHeight:number;onDidChange:(listener:unknown)=>IdeaRailDisposable;layout(width:number,height:number):void}
interface IdeaRailHost {
 mainContainer:HTMLElement;
 auxiliaryBarPartView:unknown;sideBarPartView:unknown;editorPartView:unknown;
 workbenchGrid:{addView(view:IdeaRailView,size:number,reference:unknown,direction:number):void;removeView(view:IdeaRailView):void;moveViewTo(view:IdeaRailView,location:number[]):void;getViewLocation(view:unknown):number[];getViews():{children?:{children?:unknown[]}[]}};
 getSideBarPosition():number;layout():void;isVisible(id:string):boolean;setAuxiliaryBarHidden(hidden:boolean):void;
 onDidChangePartVisibility(listener:()=>void):IdeaRailDisposable;onDidLayoutMainContainer(listener:()=>void):IdeaRailDisposable;onDidChangePanelPosition(listener:()=>void):IdeaRailDisposable;onDidChangePanelAlignment(listener:()=>void):IdeaRailDisposable;
 configurationService:{onDidChangeConfiguration(listener:(event:{affectsConfiguration(key:string):boolean})=>void):IdeaRailDisposable};
 paneCompositeService:{getActivePaneComposite(location:number):{getId():string}|undefined;openPaneComposite(id:string,location:number,focus:boolean):Promise<unknown>;getPinnedPaneCompositeIds(location:number):string[];getVisiblePaneCompositeIds(location:number):string[];onDidPaneCompositeOpen(listener:()=>void):IdeaRailDisposable;onDidPaneCompositeClose(listener:()=>void):IdeaRailDisposable};
 viewDescriptorService:{getViewContainersByLocation(location:number):IdeaRailContainer[];getViewContainerModel(container:IdeaRailContainer):{activeViewDescriptors:unknown[];onDidChangeActiveViewDescriptors(listener:()=>void):IdeaRailDisposable};onDidChangeViewContainers(listener:()=>void):IdeaRailDisposable;onDidChangeContainerLocation(listener:()=>void):IdeaRailDisposable};
}
function ideaWorkspaceInstallNativeRail(host:IdeaRailHost):void{
 // Native adapters are deliberately feature-detected; an unsupported host keeps native startup.
 if(!host.workbenchGrid?.addView||!host.viewDescriptorService?.getViewContainersByLocation)return;
 const root=host.mainContainer,element=document.createElement('div'),style=document.createElement('style');
 element.id='idea-workspace-toolrail';element.className='part idea-workspace-toolrail';element.setAttribute('role','toolbar');element.setAttribute('aria-label','Secondary tools');element.setAttribute('aria-orientation','vertical');
 style.textContent=`
 #idea-workspace-toolrail{display:flex;flex-direction:column;align-items:center;gap:4px;box-sizing:border-box;padding:4px 2px;overflow-y:auto;overflow-x:hidden;background:transparent;color:var(--idea-frame-foreground,var(--vscode-foreground))}
 #idea-workspace-toolrail button{display:flex;align-items:center;justify-content:center;flex:none;width:28px;height:28px;padding:0;border:0;border-radius:6px;background:transparent;color:inherit;font:inherit;cursor:pointer}
 #idea-workspace-toolrail button:hover{background:color-mix(in srgb,currentColor 8%,transparent)}
 #idea-workspace-toolrail button[aria-pressed="true"]{background:color-mix(in srgb,currentColor 14%,transparent)}
 #idea-workspace-toolrail button:focus-visible{outline:1px solid var(--vscode-focusBorder);outline-offset:-1px}
 #idea-workspace-toolrail .idea-tool-icon{width:18px;height:18px;display:block;background-color:currentColor;mask-repeat:no-repeat;mask-position:center;mask-size:contain}
 .idea-workspace-has-toolrail .part.auxiliarybar>.title>.composite-bar-container{display:none!important}
 .idea-workspace-has-toolrail .part.auxiliarybar>.title>.title-label{display:flex!important}
 `;
 const view:IdeaRailView={element,minimumWidth:34,maximumWidth:34,minimumHeight:0,maximumHeight:Infinity,onDidChange:()=>({dispose(){}}),layout(width,height){element.style.width=width+'px';element.style.height=height+'px';}};
 let added=false,stopped=false,queued=false,signature='';
 const listeners:IdeaRailDisposable[]=[],models:IdeaRailDisposable[]=[];
 const marker='.part.statusbar [id="nhpdev95.idea-workspace.ideaWorkspace.project"],.part.statusbar [id="ideaWorkspace.project"]';
 const fail=(error:unknown)=>{console.warn('[IDEA Workspace] Native tool rail unavailable',error);dispose();};
 const sync=()=>{
  queued=false;if(stopped)return;
  try{
   const enabled=!!root.querySelector(marker)&&!!document.getElementById('idea-workspace-custom-ui');
   if(!enabled){if(added){root.classList.remove('idea-workspace-has-toolrail');host.workbenchGrid.removeView(view);added=false;style.remove();host.layout();}return;}
   if(!added){document.head.append(style);host.workbenchGrid.addView(view,34,host.getSideBarPosition()===0?host.auxiliaryBarPartView:host.sideBarPartView,3);added=true;root.classList.add('idea-workspace-has-toolrail');host.layout();}
   const previous=(document.activeElement as HTMLElement|null)?.closest<HTMLButtonElement>('#idea-workspace-toolrail button')?.dataset.container;
   const location=host.workbenchGrid.getViewLocation(view),content=host.workbenchGrid.getViewLocation(host.editorPartView)[0],last=(host.workbenchGrid.getViews().children?.[content]?.children?.length??0)-1;
   if(last>=0&&(location.length!==2||location[0]!==content||location[1]!==last)){host.workbenchGrid.moveViewTo(view,[content,-1]);host.layout();}
   const visible=new Set(host.paneCompositeService.getVisiblePaneCompositeIds(2));
   const containers=host.viewDescriptorService.getViewContainersByLocation(2).filter(container=>visible.has(container.id)&&host.viewDescriptorService.getViewContainerModel(container).activeViewDescriptors.length>0);
   const pinned=host.paneCompositeService.getPinnedPaneCompositeIds(2);
   containers.sort((a,b)=>{const ai=pinned.indexOf(a.id),bi=pinned.indexOf(b.id);return(ai<0?Infinity:ai)-(bi<0?Infinity:bi)});
   const active=host.isVisible('workbench.parts.auxiliarybar')?host.paneCompositeService.getActivePaneComposite(2)?.getId():undefined;
   const nextSignature=JSON.stringify([active,containers.map(c=>[c.id,c.title,c.icon?.id,c.icon?.scheme])]);
   if(signature===nextSignature)return;signature=nextSignature;
   const entry=containers.some(c=>c.id===previous)?previous:containers.some(c=>c.id===active)?active:containers[0]?.id;
   element.replaceChildren();
   for(const container of containers){
    const title=typeof container.title==='string'?container.title:container.title.value??container.id;
    const button=document.createElement('button');button.type='button';button.title=title;button.setAttribute('aria-label',title);button.setAttribute('aria-pressed',String(active===container.id));button.dataset.container=container.id;
    const icon=container.icon;
    if(icon?.id){const glyph=document.createElement('span');glyph.className='codicon codicon-'+icon.id;glyph.setAttribute('aria-hidden','true');button.append(glyph);}
    else if(icon?.scheme==='file'&&icon.with){const glyph=document.createElement('span');glyph.className='idea-tool-icon';glyph.setAttribute('aria-hidden','true');glyph.style.maskImage='url('+JSON.stringify(icon.with({scheme:'vscode-file',authority:'vscode-app'}).toString())+')';button.append(glyph);}
    else button.textContent=title.slice(0,1);
    button.tabIndex=container.id===entry?0:-1;
    button.addEventListener('click',()=>{
     const action=host.isVisible('workbench.parts.auxiliarybar')&&host.paneCompositeService.getActivePaneComposite(2)?.getId()===container.id?(host.setAuxiliaryBarHidden(true),Promise.resolve()):host.paneCompositeService.openPaneComposite(container.id,2,true);
     void action.then(schedule,fail);
    });
    element.append(button);
   }
   if(previous)element.querySelector<HTMLButtonElement>('button[data-container='+CSS.escape(entry??'')+']')?.focus();
  }catch(error){fail(error);}
 };
 const schedule=()=>{if(!queued&&!stopped){queued=true;queueMicrotask(sync);}};
 const updateModels=()=>{for(const model of models.splice(0))model.dispose();for(const container of host.viewDescriptorService.getViewContainersByLocation(2))models.push(host.viewDescriptorService.getViewContainerModel(container).onDidChangeActiveViewDescriptors(schedule));schedule();};
 const keyboard=(event:KeyboardEvent)=>{const buttons=Array.from(element.querySelectorAll('button')),index=buttons.indexOf(document.activeElement as HTMLButtonElement);let next:number|undefined;
  if(event.key==='ArrowDown')next=(index+1)%buttons.length;else if(event.key==='ArrowUp')next=(index+buttons.length-1)%buttons.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=buttons.length-1;
  if(next!==undefined&&buttons[next]){event.preventDefault();buttons.forEach((b,i)=>b.tabIndex=i===next?0:-1);buttons[next].focus();}
 };
 const observer=new MutationObserver(records=>{if(records.some(record=>record.target instanceof Element&&(!!record.target.closest('.part.statusbar,.part.auxiliarybar .composite-bar-container'))))schedule();});
 function dispose(){if(stopped)return;stopped=true;observer.disconnect();for(const listener of [...listeners,...models])listener.dispose();element.removeEventListener('keydown',keyboard);window.removeEventListener('pagehide',dispose);root.classList.remove('idea-workspace-has-toolrail');style.remove();if(added){try{host.workbenchGrid.removeView(view);host.layout();}catch{/* Native shutdown may already have disposed the grid. */}added=false;}}
 try{
  element.addEventListener('keydown',keyboard);observer.observe(root,{childList:true,subtree:true});
  listeners.push(host.configurationService.onDidChangeConfiguration(event=>{if(event.affectsConfiguration('workbench.sideBar.location')||event.affectsConfiguration('workbench.activityBar.location'))schedule();}),host.onDidChangePanelPosition(schedule),host.onDidChangePanelAlignment(schedule),host.onDidLayoutMainContainer(schedule),host.onDidChangePartVisibility(schedule),host.paneCompositeService.onDidPaneCompositeOpen(schedule),host.paneCompositeService.onDidPaneCompositeClose(schedule),host.viewDescriptorService.onDidChangeViewContainers(updateModels),host.viewDescriptorService.onDidChangeContainerLocation(updateModels));
  window.addEventListener('pagehide',dispose,{once:true});updateModels();
 }catch(error){fail(error);}
}
