import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';

/** Generate reviewable, self-contained scripts. Never starts a process or elevates. */
export async function prepareAdminScripts(target:string,storage:string,css:string,version:string,operation:'apply'|'restore'='apply'):Promise<{apply:string;restore:string}>{
 const current=await fs.readFile(target);
 const expected=createHash('sha256').update(current).digest('hex');
 const source=await fs.readFile(require.resolve('./patcher'),'utf8');
 const folder=path.join(storage,'manual-'+randomUUID());
 await fs.mkdir(folder,{recursive:true});
 const backup=path.join(storage,'backups');
 await fs.mkdir(backup,{recursive:true});
 const result={apply:path.join(folder,'apply.cjs'),restore:path.join(folder,'restore.cjs')};
 for(const action of (operation==='restore'?['restore']:['apply','restore']) as ('apply'|'restore')[]){
  const script=`// IDEA Workspace: review before running. Uses only Node built-ins.\n${source}\n
(async()=>{
 const crypto=require('node:crypto');
 const target=${JSON.stringify(target)};
 const stat=await fs.lstat(target);
 if(stat.isSymbolicLink() || !stat.isFile())throw Error('Refusing symlink or non-file target.');
 ${action==='apply'?`const current=await fs.readFile(target);
 if(crypto.createHash('sha256').update(current).digest('hex')!==${JSON.stringify(expected)})throw Error('Workbench changed since preparation. Run Apply in VS Code to prepare fresh scripts.');
 await exports.applyPatch(target,${JSON.stringify(backup)},${JSON.stringify(css)},${JSON.stringify(version)});`:'await exports.restorePatch(target);'}
 console.log(${JSON.stringify(action==='apply'?'Owned CSS applied. Fully restart VS Code to load the changes.':'Owned CSS removed. Fully restart VS Code to load the changes.')});
})().catch(error=>{console.error(error.message);process.exitCode=1;});
`;
  await fs.writeFile(result[action],script,{mode:0o600,flag:'wx'});
 }
 return result;
}

