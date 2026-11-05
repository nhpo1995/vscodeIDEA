export interface Entry { before?:unknown; applied:unknown; history?:unknown[]; released?:boolean }
export type Journal=Record<string,Entry>;
export type ApplyMode='explicit'|'upgrade';
export interface SettingsHost {read(key:string):unknown;write(key:string,value:unknown):Promise<void>;load():Journal|undefined;save(journal:Journal|undefined):Promise<void>}
function same(a:unknown,b:unknown):boolean{return JSON.stringify(a)===JSON.stringify(b);}
const PALETTE='@idea-palette:';
const COLOR_KEY='workbench.colorCustomizations';
const SCOPE='[IDEA-inspired Dark]';
function object(value:unknown):Record<string,unknown>{return value && typeof value==='object' && !Array.isArray(value)?value as Record<string,unknown>:{};}
function owned(value:unknown,entry:Entry):boolean{return !entry.released && [entry.applied,...entry.history??[]].some(applied=>same(value,applied));}
function paletteValue(host:SettingsHost,key:string):unknown{return object(object(host.read(COLOR_KEY))[SCOPE])[key.slice(PALETTE.length)];}
function mergedPalette(host:SettingsHost,changes:Record<string,unknown>):unknown{
 const colors={...object(host.read(COLOR_KEY))},scoped={...object(colors[SCOPE])};
 for(const [key,value] of Object.entries(changes)){
  const color=key.slice(PALETTE.length);if(value===undefined)delete scoped[color];else scoped[color]=value;
 }
 if(Object.keys(scoped).length)colors[SCOPE]=scoped;else delete colors[SCOPE];
 return Object.keys(colors).length?colors:undefined;
}
function planEntry(journal:Journal,key:string,current:unknown,value:unknown,mode:ApplyMode):boolean{
 const old=journal[key],stillOwned=old && owned(current,old);
 if(mode==='upgrade' && (old?.released || (old && !stillOwned) || (!old && current!==undefined))){
  journal[key]={before:current,applied:current,released:true};return false;
 }
 journal[key]={before:stillOwned?old.before:current,applied:value,history:[current,...(stillOwned?[old.applied,...old.history??[]]:[])]};
 return true;
}
function finishEntry(entry:Entry):Entry{return {before:entry.before,applied:entry.applied};}
export async function applySettings(host:SettingsHost,preset:Record<string,unknown>,mode:ApplyMode='explicit'):Promise<string[]>{
 const journal={...host.load()},skipped:string[]=[];
 for(const [key,value] of Object.entries(preset)){
  const current=host.read(key);
  if(!planEntry(journal,key,current,value,mode)){skipped.push(key);await host.save({...journal});continue;}
  await host.save({...journal});
  if(!same(current,value))await host.write(key,value);
  journal[key]=finishEntry(journal[key]);await host.save({...journal});
 }
 return skipped;
}
export async function applyPalette(host:SettingsHost,colors:Record<string,string>,mode:ApplyMode='explicit'):Promise<string[]>{
 const journal={...host.load()},changes:Record<string,unknown>={},accepted:string[]=[],skipped:string[]=[];
 for(const [color,value] of Object.entries(colors)){
  const key=PALETTE+color,current=paletteValue(host,key);
  if(!planEntry(journal,key,current,value,mode)){skipped.push(color);continue;}
  accepted.push(key);if(!same(current,value))changes[key]=value;
 }
 // Persist all leaf ownership before the single settings write, including failure recovery.
 await host.save({...journal});
 if(Object.keys(changes).length)await host.write(COLOR_KEY,mergedPalette(host,changes));
 for(const key of accepted)journal[key]=finishEntry(journal[key]);
 await host.save({...journal});return skipped;
}
export async function restoreSettings(host:SettingsHost,select:(key:string)=>boolean=()=>true):Promise<string[]>{
 const journal={...host.load()},skipped:string[]=[],palette:Record<string,unknown>={},paletteKeys:string[]=[];
 for(const [key,entry] of Object.entries(journal)){
  if(!select(key))continue;
  if(key.startsWith(PALETTE)){
   paletteKeys.push(key);
   if(!entry.released){if(owned(paletteValue(host,key),entry))palette[key]=entry.before;else skipped.push(key);}
   continue;
  }
  if(!entry.released){if(owned(host.read(key),entry))await host.write(key,entry.before);else skipped.push(key);}
  delete journal[key];await host.save({...journal});
 }
 if(Object.keys(palette).length)await host.write(COLOR_KEY,mergedPalette(host,palette));
 for(const key of paletteKeys)delete journal[key];
 await host.save(Object.keys(journal).length?journal:undefined);return skipped;
}
