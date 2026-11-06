import * as vscode from 'vscode';

/** Keep project history, search providers and keyboard navigation in the native workbench. */
export function registerNavigation():vscode.Disposable & {setEnabled(enabled:boolean):Promise<void>}{
 const project=vscode.window.createStatusBarItem('ideaWorkspace.project',vscode.StatusBarAlignment.Left,2);
 project.name='IDEA Workspace Project';
 project.command='ideaWorkspace.switchProject';
 project.tooltip='Switch project — open recent folders and workspaces';
 project.accessibilityInformation={label:'Switch project'};
 let enabled=false;
 const refresh=()=>{
  const label=vscode.workspace.name || vscode.workspace.workspaceFolders?.[0]?.name || 'Open Project';
  project.text='$(project) '+label.replace(/\$\(/g,'＄(').replace(/[\r\n]/g,' ').slice(0,48)+' $(chevron-down)';
  if(enabled)project.show();else project.hide();
 };
 const subscriptions=[
  project,
  vscode.commands.registerCommand('ideaWorkspace.search',()=>vscode.commands.executeCommand('workbench.action.quickOpen')),
  vscode.commands.registerCommand('ideaWorkspace.switchProject',()=>vscode.commands.executeCommand('workbench.action.openRecent')),
  vscode.workspace.onDidChangeWorkspaceFolders(refresh)
 ];
 refresh();
 return {
  async setEnabled(value:boolean){enabled=value;refresh();await vscode.commands.executeCommand('setContext','ideaWorkspace.navigationActive',enabled);},
  dispose(){enabled=false;for(const item of subscriptions)item.dispose();void vscode.commands.executeCommand('setContext','ideaWorkspace.navigationActive',false).then(undefined,()=>undefined);}
 };
}
