// Run against the disposable regular VS Code process, not --extensionTestsPath.
// The latter used in-memory global storage in the tested build and cannot prove upgrades.
const fs=require('node:fs');const assert=require('node:assert/strict');const {execFileSync}=require('node:child_process');
const profile='/tmp/idea-workspace-stability-050-profile';
const settings=JSON.parse(fs.readFileSync(profile+'/User/settings.json','utf8'));
assert.ok(['Dark Modern','Default Dark Modern'].includes(settings['workbench.colorTheme']));
assert.equal(settings['workbench.iconTheme'],'vs-seti');
const colors=settings['workbench.colorCustomizations'];assert.equal(colors.unrelated,'#123456');assert.equal(colors['[IDEA-inspired Dark]']['editorCursor.foreground'],'#FF0000');assert.equal(colors['[IDEA-inspired Dark]']['tab.activeBackground'],undefined);
const script="import sqlite3,json,sys;db=sqlite3.connect('file:'+sys.argv[1]+'?mode=ro',uri=True);print(db.execute('select value from ItemTable where key=?',('local-workspace.idea-workspace',)).fetchone()[0])";
const state=JSON.parse(execFileSync('/usr/bin/python3',['-c',script,profile+'/User/globalStorage/state.vscdb'],{encoding:'utf8'}));
assert.equal(state.appearanceVersion,'0.5.0');assert.equal(state.chromeAttempt.outcome,'applied');
for(const key of ['workbench.colorTheme','workbench.iconTheme','@idea-palette:editorCursor.foreground','@idea-palette:tab.activeBackground'])assert.equal(state.settingsJournal[key].released,true,key);
assert.equal(state.chromeAttempt.fingerprint,JSON.parse(fs.readFileSync('/tmp/idea-stability-first.json')).fingerprint,'same-version recovery uses the same fingerprint');
const file='/tmp/idea-workspace-update-1.145.0-ny672e2g/VSCode-linux-x64/resources/app/out/vs/code/electron-browser/workbench/workbench.html';assert.ok(fs.readFileSync(file,'utf8').includes('idea-workspace:ui-0.4.1'));
console.log('STABILITY_PERSISTED_PASS: owned upgrade, released edits/deletions and same-version CSS recovery. Pending reload:',!!state.pendingReload);
