const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const manifest=require('../package.json');
test('both bundled palettes are selectable and only those palettes enable Java constants',()=>{
 const {isBundledTheme}=require('../dist/preset');
 for(const [name,type] of [['Dark','vs-dark'],['Light','vs']]){
  const label=`IDEA-inspired ${name}`,entry=manifest.contributes.themes.find(t=>t.label===label);
  assert.ok(entry,`${label} must be selectable`);assert.equal(entry.uiTheme,type);
  const theme=JSON.parse(fs.readFileSync(require('node:path').join(__dirname,'..',entry.path),'utf8'));
  assert.equal(theme.name,label);assert.equal(theme.semanticHighlighting,true);
  assert.equal(Object.keys(theme.colors).filter(k=>k.startsWith('terminal.ansi')).length,16);
  assert.ok(isBundledTheme(label));
 }
 for(const label of ['Dark+','Dracula','Light+','IDEA-inspired Light Custom',undefined])assert.equal(isBundledTheme(label),false);
});
test('jade and light frame colors belong to themes; external themes supply their own fallback',()=>{
 for(const id of ['ideaWorkspace.frameGradientStart','ideaWorkspace.frameGradientEnd']){
  const entry=manifest.contributes.colors.find(c=>c.id===id);
  assert.ok(entry,`registered token ${id}`);
  for(const value of Object.values(entry.defaults))assert.equal(value,id.endsWith('Start')?'focusBorder':'titleBar.activeBackground');
 }
 const dark=require('../themes/idea-dark.json');
 assert.equal(dark.colors['ideaWorkspace.frameGradientStart'],'#29B58E');
 assert.equal(dark.colors['ideaWorkspace.frameGradientEnd'],'#212B2D');
 const {renderCss}=require('../dist/patcher');
 assert.match(renderCss('data:image/png;base64,YQ==',true),/var\(--vscode-ideaWorkspace-frameGradientStart,/);
});
test('Light diff fills retain readable syntax ink',()=>{
 const theme=require('../themes/idea-light.json');
 const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
 const luminance=channels=>channels.map(c=>c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4).reduce((sum,c,i)=>sum+c*[0.2126,0.7152,0.0722][i],0);
 for(const key of ['diffEditor.insertedTextBackground','diffEditor.removedTextBackground']){
  const lineKey=key.replace('TextBackground','LineBackground');
  assert.ok(theme.colors[lineKey],`${lineKey} must have an explicit light fill`);
  const line=theme.colors[lineKey],lineAlpha=line.length===9?parseInt(line.slice(7),16)/255:1;
  const lineBackground=rgb(line).map((c,i)=>c*lineAlpha+rgb(theme.colors['editor.background'])[i]*(1-lineAlpha));
  const color=theme.colors[key],alpha=color.length===9?parseInt(color.slice(7),16)/255:1;
  const background=rgb(color).map((c,i)=>c*alpha+lineBackground[i]*(1-alpha));
  for(const token of ['keyword','class','method','string','number']){
   const light=luminance(background),ink=luminance(rgb(theme.semanticTokenColors[token]));
   assert.ok((Math.max(light,ink)+0.05)/(Math.min(light,ink)+0.05)>=4.5,`${key}: ${token} contrast`);
  }
 }
});
