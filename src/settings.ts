export interface Entry { before?:unknown; applied:unknown; history?:unknown[] }
export type Journal=Record<string,Entry>;
export interface SettingsHost {read(key:string):unknown;write(key:string,value:unknown):Promise<void>;load():Journal|undefined;save(journal:Journal|undefined):Promise<void>}
function same(a:unknown,b:unknown):boolean{return JSON.stringify(a)===JSON.stringify(b);}
const PALETTE='@idea-palette:';
const COLOR_KEY='workbench.colorCustomizations';
const SCOPE='[IDEA-inspired Dark]';
function object(value:unknown):Record<string,unknown>{return value && typeof value==='object' && !Array.isArray(value)?value as Record<string,unknown>:{};}
function paletteHost(host:SettingsHost):SettingsHost{
 return {...host,
  read:key=>key.startsWith(PALETTE)?object(object(host.read(COLOR_KEY))[SCOPE])[key.slice(PALETTE.length)]:host.read(key),
  write:async(key,value)=>{
   if(!key.startsWith(PALETTE)){await host.write(key,value);return;}
   const colors={...object(host.read(COLOR_KEY))},scoped={...object(colors[SCOPE])};
   const color=key.slice(PALETTE.length);
   if(value===undefined)delete scoped[color];else scoped[color]=value;
   if(Object.keys(scoped).length)colors[SCOPE]=scoped;else delete colors[SCOPE];
   await host.write(COLOR_KEY,Object.keys(colors).length?colors:undefined);
  }
 };
}
export async function applyPalette(host:SettingsHost,colors:Record<string,string>):Promise<void>{
 await applySettings(paletteHost(host),Object.fromEntries(Object.entries(colors).map(([key,value])=>[PALETTE+key,value])));
}
export async function applySettings(host:SettingsHost,preset:Record<string,unknown>):Promise<void>{
  const journal={...host.load()};
  for(const [key,value] of Object.entries(preset)){
    const old=journal[key];
    journal[key]={before:old?old.before:host.read(key),applied:value,history:old?[...(old.history??[]),old.applied]:[]};
    await host.save({...journal});
    await host.write(key,value);
    journal[key]={before:journal[key].before,applied:value};
    await host.save({...journal});
  }
}
export async function restoreSettings(host:SettingsHost,select:(key:string)=>boolean=()=>true):Promise<string[]>{
  host=paletteHost(host);
  const journal={...host.load()},skipped:string[]=[];
  for(const [key,entry] of Object.entries(journal)){
    if(!select(key))continue;
    if([entry.applied,...(entry.history??[])].some(value=>same(host.read(key),value))) await host.write(key,entry.before);
    else skipped.push(key);
    delete journal[key];await host.save({...journal});
  }
  await host.save(Object.keys(journal).length?journal:undefined);return skipped;
}
