const {test}=require('node:test'),assert=require('node:assert/strict');
function fixture(status='NoNewPrivs:\t0\n',error){
 const calls=[];return {calls,deps:{pendingTasks:new Set(),readStatus:async()=>status,run:async(file,args,options)=>{calls.push({file,args,options});if(file==='/usr/bin/systemctl')return {stdout:'',stderr:''};if(error)throw error;return {stdout:'Owned CSS applied.\n',stderr:''}}}};
}
test('normal Linux context uses one native pkexec call without a shell or terminal',async()=>{
 const {authorizeLinux}=require('../dist/authorization');const f=fixture();
 const result=await authorizeLinux('/app/code',"/path with spaces/$(not-a-shell)/apply.cjs",f.deps);
 assert.equal(result.backend,'pkexec');assert.equal(f.calls.length,1);assert.equal(f.calls[0].file,'/usr/bin/pkexec');assert.deepEqual(f.calls[0].args,['--disable-internal-agent','/usr/bin/env','ELECTRON_RUN_AS_NODE=1','/app/code',"/path with spaces/$(not-a-shell)/apply.cjs"]);
 assert.equal(f.calls[0].options.shell,undefined);
});
test('NoNewPrivs delegates only the checked helper to a transient bounded user-session task',async()=>{
 const {authorizeLinux}=require('../dist/authorization');const f=fixture('Name:\tcode\nNoNewPrivs:\t1\n');
 const result=await authorizeLinux('/app/code','/storage/restore.cjs',f.deps);assert.equal(result.backend,'user-session');assert.equal(f.calls.length,1);const c=f.calls[0];assert.equal(c.file,'/usr/bin/systemd-run');
 for(const flag of ['--user','--wait','--collect','--pipe','--quiet','--property=RuntimeMaxSec=120s'])assert.ok(c.args.includes(flag));
 assert.ok(c.args.some(x=>/^--unit=idea-workspace-auth-[a-f0-9-]+$/.test(x)));assert.deepEqual(c.args.slice(-6),['/usr/bin/pkexec','--disable-internal-agent','/usr/bin/env','ELECTRON_RUN_AS_NODE=1','/app/code','/storage/restore.cjs']);
 assert.ok(c.options.timeout>120000);
});
test('declined OS authentication is reported as cancelled and never triggers another route',async()=>{
 const {authorizeLinux}=require('../dist/authorization');const f=fixture('NoNewPrivs:\t1\n',Object.assign(Error('exit'),{code:126,stderr:'Not authorized'}));
 await assert.rejects(authorizeLinux('/app/code','/storage/apply.cjs',f.deps),e=>e.kind==='cancelled'&&/cancelled/i.test(e.message));assert.equal(f.calls.length,1);
});
test('missing session manager and pkexec failures report unavailable, not cancellation',async()=>{
 const {authorizeLinux}=require('../dist/authorization');
 for(const error of [Object.assign(Error('spawn'),{code:'ENOENT'}),Object.assign(Error('failed'),{code:1,stderr:'Failed to connect to user bus'}),Object.assign(Error('failed'),{code:127,stderr:'pkexec must be setuid root'})]){
  const f=fixture('NoNewPrivs:\t1\n',error);await assert.rejects(authorizeLinux('/app/code','/storage/apply.cjs',f.deps),e=>e.kind==='unavailable'&&!/was cancelled/i.test(e.message));assert.equal(f.calls.length,1);
 }
});
test('timeout is explicit; unexpected helper errors retain their cause without retry',async()=>{
 const {authorizeLinux}=require('../dist/authorization');const timeout=fixture('',Object.assign(Error('expired'),{killed:true}));await assert.rejects(authorizeLinux('/app/code','/storage/apply.cjs',timeout.deps),e=>e.kind==='timeout');
 const f=fixture('',Object.assign(Error('failed'),{code:1,stderr:'Workbench changed since preparation.'}));await assert.rejects(authorizeLinux('/app/code','/storage/apply.cjs',f.deps),e=>e.kind==='failed'&&/Workbench changed/.test(e.message));assert.equal(f.calls.length,1);
});
test('unknown proc status keeps standard OS authorization instead of assuming blocked context',async()=>{
 const {authorizeLinux}=require('../dist/authorization');const f=fixture();f.deps.readStatus=async()=>{throw Error('no proc')};const result=await authorizeLinux('/app/code','/storage/apply.cjs',f.deps);assert.equal(result.backend,'pkexec');
});

test('user-session commands preserve literal dollar signs through systemd argument expansion',async()=>{
 const {authorizeLinux}=require('../dist/authorization');const f=fixture('NoNewPrivs:\t1\n');
 await authorizeLinux('/app/$CODE/code','/storage/$HOME/${NAME}/apply.cjs',f.deps);
 assert.deepEqual(f.calls[0].args.slice(-2),['/app/$$CODE/code','/storage/$$HOME/$${NAME}/apply.cjs']);
});
test('transient task has bounded stop time inside the client deadline',async()=>{
 const {authorizeLinux}=require('../dist/authorization');const f=fixture('NoNewPrivs:\t1\n');await authorizeLinux('/app/code','/storage/apply.cjs',f.deps);
 assert.ok(f.calls[0].args.includes('--property=TimeoutStopSec=5s'));assert.ok(f.calls[0].options.timeout>125000);
});


test('client timeout stops its own task and failed cleanup blocks a second authentication attempt',async()=>{
 const {authorizeLinux}=require('../dist/authorization');const f=fixture('NoNewPrivs:\t1\n');let cleanupFails=true;
 f.deps.run=async(file,args,options)=>{f.calls.push({file,args,options});if(file==='/usr/bin/systemd-run')throw Object.assign(Error('timeout'),{killed:true});if(cleanupFails)throw Error('user manager unavailable');return {stdout:'',stderr:''}};
 await assert.rejects(authorizeLinux('/app/code','/storage/apply.cjs',f.deps),e=>e.kind==='unavailable'&&/could not be stopped/.test(e.message));
 assert.equal(f.calls.filter(c=>c.file==='/usr/bin/systemd-run').length,1);assert.equal(f.deps.pendingTasks.size,1);
 await assert.rejects(authorizeLinux('/app/code','/storage/apply.cjs',f.deps),/could not be stopped/);assert.equal(f.calls.filter(c=>c.file==='/usr/bin/systemd-run').length,1);
 cleanupFails=false;f.deps.run=async(file,args,options)=>{f.calls.push({file,args,options});return {stdout:'done',stderr:''}};
 await authorizeLinux('/app/code','/storage/apply.cjs',f.deps);assert.equal(f.deps.pendingTasks.size,0);assert.equal(f.calls.filter(c=>c.file==='/usr/bin/systemd-run').length,2);
});

test('systemd runtime limit is reported as timeout even when its quiet client returns only a signal exit code',async()=>{
 const {authorizeLinux}=require('../dist/authorization');const f=fixture('NoNewPrivs:\t1\n');let clock=0;f.deps.now=()=>clock;f.deps.run=async()=>{clock=120100;throw Object.assign(Error('Command failed'),{code:143,stderr:''})};
 await assert.rejects(authorizeLinux('/app/code','/storage/apply.cjs',f.deps),e=>e.kind==='timeout');assert.equal(f.deps.pendingTasks.size,0);
});
