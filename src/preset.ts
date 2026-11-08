export const THEME='IDEA-inspired Dark';
export const LIGHT_THEME='IDEA-inspired Light';
export function isBundledTheme(theme:unknown):boolean{return theme===THEME || theme===LIGHT_THEME;}
export const preset:Record<string,unknown>={
 'workbench.iconTheme':'idea-workspace-files',
 'workbench.productIconTheme':'idea-workspace-ui',
 'editor.fontFamily':"'JetBrains Mono', Consolas, 'DejaVu Sans Mono', monospace",
 'editor.fontSize':14,
 'editor.fontWeight':'400',
 'editor.fontLigatures':false,
 'terminal.integrated.fontFamily':"'JetBrainsMono Nerd Font Mono', 'JetBrains Mono', 'MesloLGM Nerd Font Mono', Consolas, 'DejaVu Sans Mono', monospace",
 'terminal.integrated.fontSize':14,
 'terminal.integrated.fontWeight':'400',
 'terminal.integrated.fontWeightBold':'700',
 'terminal.integrated.lineHeight':1.2,
 'terminal.integrated.letterSpacing':0
};

/** Layout preferences are journaled separately so disabling navigation restores only these keys. */
export function navigationPreset(platform:string,supportsControlsStyle=false):Record<string,unknown>{
 return {
  'workbench.sideBar.location':'left',
  'workbench.activityBar.location':'default',
  'workbench.layoutControl.type':'both',
  ...(['win32','linux'].includes(platform)&&supportsControlsStyle?{'window.controlsStyle':'custom'}:{}),
  ...(['win32','linux'].includes(platform)?{'window.titleBarStyle':'custom','window.menuBarVisibility':'toggle','workbench.navigationControl.enabled':false}:{})
 };
}

/** Use native layout accounting; never write unknown settings on older VS Code builds. */
export function surfacePreset(supportsModernUI:boolean):Record<string,unknown>{
 return supportsModernUI?{'workbench.experimental.modernUI':true}:{};
}
