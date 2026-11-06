const {test}=require('node:test');const assert=require('node:assert/strict');
test('same-version reinstall recovers missing CSS after prior success, without prompting again after denial',()=>{
 const {inspectChrome,shouldAutoApply}=require('../dist/chrome');
 const missing=inspectChrome('<head></head>','a{}','/app/workbench.html','1');
 assert.equal(missing.state,'missing');
 assert.equal(shouldAutoApply(missing,{fingerprint:missing.fingerprint,outcome:'applied'}),true);
 assert.equal(shouldAutoApply(missing,{fingerprint:missing.fingerprint,outcome:'failed'}),false);
 const changed=inspectChrome('<head><!-- updated --></head>','a{}','/app/workbench.html','1');
 assert.equal(shouldAutoApply(changed,{fingerprint:missing.fingerprint,outcome:'failed'}),true);
});
test('exact CSS comparison detects old logos; damaged markers block mutation',()=>{
 const {inspectChrome,shouldAutoApply}=require('../dist/chrome');
 const html='<head><!-- idea-workspace:start --><style id="idea-workspace-custom-ui">a{}</style><!-- idea-workspace:end --></head>';
 const current=inspectChrome(html,'a{}','/app','1');assert.equal(current.state,'current');assert.equal(shouldAutoApply(current),false);
 const stale=inspectChrome(html,'b{}','/app','1');assert.equal(stale.state,'outdated');assert.equal(shouldAutoApply(stale),true);
 const damaged=inspectChrome('<!-- idea-workspace:start -->','a{}','/app','1');assert.equal(damaged.state,'damaged');assert.equal(shouldAutoApply(damaged),false);
});
test('pending CSS never implies live DOM; only requested reload or new app session clears it',()=>{
 const {needsReload}=require('../dist/chrome');const pending={cssHash:'hash',session:'s1'};
 assert.equal(needsReload(pending,'hash','s1'),true);
 assert.equal(needsReload(pending,'hash','s2'),false);
 assert.equal(needsReload({...pending,reloadRequested:true},'hash','s1'),false);
 assert.equal(needsReload(pending,'different','s1'),false);
});

test('renderer content participates in chrome freshness and reload fingerprint',()=>{
 const {inspectChrome}=require('../dist/chrome'),{renderPatch}=require('../dist/patcher');
 const html='<head>'+renderPatch('a{}','renderer1')+'</head>';
 const old=inspectChrome(html,'a{}','/app','1','renderer1'),next=inspectChrome(html,'a{}','/app','1','renderer2');
 assert.equal(old.state,'current');assert.equal(next.state,'outdated');assert.notEqual(old.cssHash,next.cssHash);
});
