import * as vscode from 'vscode';
import {constantRanges} from './constants';
import {THEME} from './preset';
import {SemanticCache} from './semantic-cache';

/** Read existing semantic tokens; do not register or replace any Java provider. */
export function registerConstantHighlighting():vscode.Disposable{
 const decoration=vscode.window.createTextEditorDecorationType({
  color:new vscode.ThemeColor('ideaWorkspace.constantForeground'),
  rangeBehavior:vscode.DecorationRangeBehavior.ClosedClosed
 });
 const cache=new SemanticCache<vscode.Range[]>();
 const pending=new Set<string>();
 let disposed=false;
 const enabled=(document:vscode.TextDocument)=>document.languageId==='java' &&
  vscode.workspace.getConfiguration().get('workbench.colorTheme')===THEME &&
  vscode.workspace.getConfiguration('editor',document).get('semanticHighlighting.enabled')!==false &&
  vscode.workspace.getConfiguration('java',document).get('semanticHighlighting.enabled')!==false;
 const refresh=async(editor:vscode.TextEditor)=>{
  const document=editor.document,key=document.uri.toString(),version=document.version;
  if(!enabled(document)){editor.setDecorations(decoration,[]);return;}
  const cached=cache.get(key,version);
  if(cached)editor.setDecorations(decoration,cached);
  if(pending.has(key) || !cache.begin(key,version))return;
  pending.add(key);
  let succeeded=false;
  try{
   const results=await Promise.allSettled([
    vscode.commands.executeCommand<vscode.SemanticTokensLegend>('vscode.provideDocumentSemanticTokensLegend',document.uri),
    vscode.commands.executeCommand<vscode.SemanticTokens>('vscode.provideDocumentSemanticTokens',document.uri)
   ]);
   if(results[0].status!=='fulfilled' || results[1].status!=='fulfilled')return;
   const legend=results[0].value,tokens=results[1].value;
   if(disposed || document.isClosed || document.version!==version || !enabled(document) || !legend || !tokens)return;
   const lines=Array.from({length:document.lineCount},(_,i)=>document.lineAt(i).text);
   const ranges=constantRanges(lines,legend,tokens.data).map(r=>new vscode.Range(r.line,r.start,r.line,r.start+r.length));
   cache.succeed(key,version,ranges);succeeded=true;
   for(const visible of vscode.window.visibleTextEditors)if(visible.document===document)visible.setDecorations(decoration,ranges);
  }catch{/* A missing/busy Java provider leaves ordinary theme highlighting intact. */}
  finally{if(!succeeded)cache.fail(key,version);pending.delete(key);}
 };
 const refreshVisible=()=>{if(!disposed)for(const editor of vscode.window.visibleTextEditors)void refresh(editor);};
 let debounce:ReturnType<typeof setTimeout>|undefined;
 const listeners=[
  vscode.window.onDidChangeVisibleTextEditors(refreshVisible),
  vscode.workspace.onDidChangeTextDocument(event=>{
   if(event.document.languageId!=='java' || !vscode.window.visibleTextEditors.some(editor=>editor.document===event.document))return;
   cache.invalidate(event.document.uri.toString(),true);
   for(const editor of vscode.window.visibleTextEditors)if(editor.document===event.document)editor.setDecorations(decoration,[]);
   if(debounce)clearTimeout(debounce);debounce=setTimeout(refreshVisible,300);
  }),
  vscode.workspace.onDidCloseTextDocument(document=>cache.invalidate(document.uri.toString())),
  vscode.workspace.onDidChangeConfiguration(event=>{if(event.affectsConfiguration('workbench.colorTheme') || event.affectsConfiguration('editor.semanticHighlighting') || event.affectsConfiguration('java.semanticHighlighting')){cache.clear();refreshVisible();}})
 ];
 // The timer only schedules eligible work; failures back off to 60s, successes cache 10s.
 const retry=setInterval(refreshVisible,2000);
 refreshVisible();
 return new vscode.Disposable(()=>{disposed=true;clearInterval(retry);if(debounce)clearTimeout(debounce);for(const listener of listeners)listener.dispose();cache.clear();decoration.dispose();});
}
