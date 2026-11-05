const {test}=require('node:test');const assert=require('node:assert/strict');
const {applySettings,restoreSettings}=require('../dist/settings');
function fixture(initial={}){const map=new Map(Object.entries(initial));let journal;return {map,get journal(){return journal},host:{read:k=>map.get(k),write:async(k,v)=>{if(v===undefined)map.delete(k);else map.set(k,v)},load:()=>journal,save:async j=>{journal=j}}};}
test('restore distinguishes absent setting and preserves later user edit',async()=>{const f=fixture({b:'old'});await applySettings(f.host,{a:'theme',b:'new'});f.map.set('b','user');const skipped=await restoreSettings(f.host);assert.equal(f.map.has('a'),false);assert.equal(f.map.get('b'),'user');assert.deepEqual(skipped,['b']);});
test('repeated apply retains original state',async()=>{const f=fixture({a:'old'});await applySettings(f.host,{a:'new'});await applySettings(f.host,{a:'newer'});await restoreSettings(f.host);assert.equal(f.map.get('a'),'old');});
test('partial write failure retains recovery journal',async()=>{const f=fixture();const write=f.host.write;f.host.write=async(k,v)=>{if(k==='b')throw Error('failed');return write(k,v)};await assert.rejects(applySettings(f.host,{a:1,b:2}));assert.ok(f.journal);f.host.write=write;await restoreSettings(f.host);assert.equal(f.map.has('a'),false);});
test('failed reapply still restores the last successfully applied setting',async()=>{const f=fixture({a:'original'});await applySettings(f.host,{a:'first'});const write=f.host.write;f.host.write=async()=>{throw Error('read only')};await assert.rejects(applySettings(f.host,{a:'second'}));assert.equal(f.map.get('a'),'first');f.host.write=write;assert.deepEqual(await restoreSettings(f.host),[]);assert.equal(f.map.get('a'),'original');});
test('successful reapply releases ownership of historical applied values',async()=>{const f=fixture({a:'original'});await applySettings(f.host,{a:'first'});await applySettings(f.host,{a:'second'});f.map.set('a','first');assert.deepEqual(await restoreSettings(f.host),['a']);assert.equal(f.map.get('a'),'first');});
test('scoped palette restore preserves later unrelated color edits',async()=>{
 const {applyPalette}=require('../dist/settings');
 const key='workbench.colorCustomizations';
 const f=fixture({[key]:{'tab.activeBackground':'#003024','[IDEA-inspired Dark]':{'editorCursor.foreground':'old'}}});
 await applyPalette(f.host,{'tab.activeBackground':'#1E1F22','editorCursor.foreground':'#CED0D6'});
 assert.equal(f.map.get(key)['tab.activeBackground'],'#003024');
 assert.equal(f.map.get(key)['[IDEA-inspired Dark]']['tab.activeBackground'],'#1E1F22');
 const next=structuredClone(f.map.get(key));next['statusBar.foreground']='user';next['[IDEA-inspired Dark]']['editorCursor.foreground']='later';f.map.set(key,next);
 await restoreSettings(f.host);
 assert.deepEqual(f.map.get(key),{'tab.activeBackground':'#003024','statusBar.foreground':'user','[IDEA-inspired Dark]':{'editorCursor.foreground':'later'}});
});
test('upgrade releases behavior settings while retaining appearance ownership',async()=>{
 const f=fixture({'editor.minimap.enabled':true,'workbench.colorTheme':'old'});
 await applySettings(f.host,{'editor.minimap.enabled':false,'workbench.colorTheme':'IDEA-inspired Dark'});
 await restoreSettings(f.host,key=>key==='editor.minimap.enabled');
 assert.equal(f.map.get('editor.minimap.enabled'),true);
 assert.equal(f.map.get('workbench.colorTheme'),'IDEA-inspired Dark');
 assert.ok(f.journal['workbench.colorTheme']);assert.ok(!f.journal['editor.minimap.enabled']);
});
test('automatic upgrades retain edits and deletions across later upgrades; explicit Apply rebases undo',async()=>{
 const f=fixture({theme:'old'});
 await applySettings(f.host,{theme:'owned',icons:'owned'});
 f.map.set('theme','user');f.map.delete('icons');
 await applySettings(f.host,{theme:'v2',icons:'v2'},'upgrade');
 await applySettings(f.host,{theme:'v3',icons:'v3'},'upgrade');
 assert.equal(f.map.get('theme'),'user');assert.equal(f.map.has('icons'),false);
 await applySettings(f.host,{theme:'explicit',icons:'explicit'});
 await restoreSettings(f.host);
 assert.equal(f.map.get('theme'),'user');assert.equal(f.map.has('icons'),false);
});
test('new preset keys do not overwrite existing custom values on upgrade',async()=>{
 const f=fixture({custom:'mine'});await applySettings(f.host,{custom:'new',fresh:1},'upgrade');
 assert.equal(f.map.get('custom'),'mine');assert.equal(f.map.get('fresh'),1);
 await restoreSettings(f.host);assert.equal(f.map.get('custom'),'mine');assert.equal(f.map.has('fresh'),false);
});
test('palette uses one settings write and undo preserves later edits',async()=>{
 const {applyPalette}=require('../dist/settings');const key='workbench.colorCustomizations';
 const f=fixture({[key]:{'[IDEA-inspired Dark]':{a:'original'}}});let writes=0;const write=f.host.write;f.host.write=async(k,v)=>{writes++;await write(k,v)};
 await applyPalette(f.host,{a:'v1',b:'v1',c:'v1'});assert.equal(writes,1);
 const colors=structuredClone(f.map.get(key));colors['[IDEA-inspired Dark]'].b='mine';colors.unrelated='later';f.map.set(key,colors);
 writes=0;await applyPalette(f.host,{a:'v2',b:'v2',c:'v2'},'upgrade');assert.equal(writes,1);
 assert.equal(f.map.get(key)['[IDEA-inspired Dark]'].b,'mine');
 writes=0;await restoreSettings(f.host);assert.equal(writes,1);
 assert.deepEqual(f.map.get(key),{'[IDEA-inspired Dark]':{a:'original',b:'mine'},unrelated:'later'});
});
test('failed batch palette reapply retains old ownership for Restore',async()=>{
 const {applyPalette}=require('../dist/settings');const f=fixture();await applyPalette(f.host,{a:'v1',b:'v1'});
 const write=f.host.write;f.host.write=async()=>{throw Error('read only')};
 await assert.rejects(applyPalette(f.host,{a:'v2',b:'v2'}));f.host.write=write;
 await restoreSettings(f.host);assert.equal(f.map.has('workbench.colorCustomizations'),false);
});
test('palette write that succeeds before throwing can still be restored',async()=>{
 const {applyPalette}=require('../dist/settings');const f=fixture();const write=f.host.write;
 f.host.write=async(k,v)=>{await write(k,v);throw Error('connection lost after write')};
 await assert.rejects(applyPalette(f.host,{a:'new',b:'new'}));f.host.write=write;
 await restoreSettings(f.host);assert.equal(f.map.has('workbench.colorCustomizations'),false);
});
