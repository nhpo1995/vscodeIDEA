const {test}=require('node:test');const assert=require('node:assert/strict');
test('failed/unavailable provider backs off to a minute and success resets cadence',()=>{
 const {SemanticCache}=require('../dist/semantic-cache');let now=0;const cache=new SemanticCache(()=>now);
 assert.equal(cache.begin('a',1),true);assert.equal(cache.begin('a',1),false);
 cache.fail('a',1);assert.equal(cache.begin('a',1),false);now=2000;assert.equal(cache.begin('a',1),true);
 cache.fail('a',1);now=5999;assert.equal(cache.begin('a',1),false);now=6000;assert.equal(cache.begin('a',1),true);
 for(let n=0;n<6;n++){cache.fail('a',1);now+=60000;assert.equal(cache.begin('a',1),true);}
 cache.succeed('a',1,['range']);assert.deepEqual(cache.get('a',1),['range']);now+=9999;assert.equal(cache.begin('a',1),false);now++;assert.equal(cache.begin('a',1),true);
});
test('document edit/close invalidates cache and rejects stale in-flight results',()=>{
 const {SemanticCache}=require('../dist/semantic-cache');const cache=new SemanticCache(()=>0);
 cache.begin('a',1);cache.invalidate('a');cache.succeed('a',1,['stale']);
 assert.equal(cache.get('a',2),undefined);assert.equal(cache.begin('a',2),true);
 cache.succeed('a',2,['fresh']);assert.deepEqual(cache.get('a',2),['fresh']);cache.invalidate('a');assert.equal(cache.get('a',2),undefined);
});
test('typing while provider is failing does not bypass its cooldown',()=>{
 const {SemanticCache}=require('../dist/semantic-cache');let now=0;const cache=new SemanticCache(()=>now);
 cache.begin('a',1);cache.fail('a',1);cache.invalidate('a',true);
 assert.equal(cache.begin('a',2),false);now=2000;assert.equal(cache.begin('a',2),true);
 cache.succeed('a',2,[]);cache.invalidate('a',true);assert.equal(cache.begin('a',3),true);
});
