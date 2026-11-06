import * as vscode from 'vscode';

/** A window-owned API control also gates the renderer; no shared profile flags or IPC. */
export function registerMenu(showNativeMenu:()=>Promise<unknown>,platform=process.platform):vscode.Disposable & {setEnabled(enabled:boolean):void}{
 const item=vscode.window.createStatusBarItem('ideaWorkspace.menu',vscode.StatusBarAlignment.Left,3);
 item.name='Main Menu';item.text='$(menu)';item.tooltip='Main Menu — show the application menu';
 item.accessibilityInformation={label:'Main Menu'};item.command='ideaWorkspace.showMainMenu';
 const command=vscode.commands.registerCommand('ideaWorkspace.showMainMenu',async()=>{
  // Native menus live outside the renderer; focusing its titlebar only selects Go Back.
  if(vscode.workspace.getConfiguration('window').get('titleBarStyle')==='native')await showNativeMenu();
  else await vscode.commands.executeCommand('workbench.action.focusTitleBar');
 });
 return {setEnabled(enabled){if(enabled && vscode.env.uiKind===vscode.UIKind.Desktop && ['win32','linux'].includes(platform))item.show();else item.hide();},dispose(){command.dispose();item.dispose();}};
}
