export const THEME='IDEA-inspired Dark';
export const preset:Record<string,unknown>={
 'workbench.colorTheme':THEME,
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
export function navigationPreset(platform:string):Record<string,unknown>{
 return {
  'workbench.sideBar.location':'left',
  'workbench.activityBar.location':'default',
  ...(['win32','linux'].includes(platform)?{'window.titleBarStyle':'custom','window.menuBarVisibility':'toggle'}:{})
 };
}
