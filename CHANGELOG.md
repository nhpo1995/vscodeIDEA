# Changelog

## 0.7.0

- Distinguish common source, Java layer, configuration, security, resource, database, documentation, test and build folders with centered colored symbols inside larger neutral outlines. Use one simplified purple robot for Agent/Codex/Claude folders, with open/closed variants and dedicated light-theme colors.
- Recover automatic Linux UI setup when VS Code runs with NoNewPrivs by requesting PolicyKit authentication through a bounded transient user-session task. Keep direct authentication for normal sessions, distinguish cancellation from unavailable/timeout errors, and retry an older failed authorization once after this update.
- Add compact native menus on Windows/Linux, coordinated sidebar/menu/Quick Input styling, and a status bar project switcher backed by Open Recent.
- Keep a compact centered native Command Center with magnifier and workspace name, opening full-size native search on click or double Shift without moving neighboring icons. Hide navigation history controls and show the title-bar logo without a wordmark.
- Keep Customize Layout as the single layout control and show all three supported native custom window controls with borderless transparent styling and theme-aware hover/focus colors, including red for Close. Restore journaled layout/control preferences without overwriting later edits.
- Add a continuous jade gradient frame with borderless rounded native cards and visible gutters; preserve the layout and selected palette when switching to external themes.
- Update IDEA-inspired Dark surfaces and add optional IDEA-inspired Light with its own syntax, semantic and terminal palettes. Setup and Apply preserve the selected color theme.
- Add a native right tool rail on recognized workbench builds, using the actual icons and views of visible Secondary Side Bar containers. Preserve original workbench JavaScript, use owned runtime copies, and restore the original startup on request; unsupported builds keep the native toolbar.
- Bind double Shift to native Quick Open outside the terminal; keep native file, symbol and command search modes.
- Add a navigation preference and journal layout changes so disabling navigation or Restore preserves later user edits and restores owned settings.
- Preserve original font asset and license bytes across Git checkouts to prevent Windows line-ending conversion from breaking bundled-font integrity checks.

## 0.6.0

- Complete the terminal's 16-color ANSI palette and add coordinated cursor and selection colors for application logs and shell output.
- Apply JetBrains Mono terminal font preferences with installed-font fallbacks, 14px sizing and 1.2 line spacing; preserve later user edits on upgrades and restore previous settings on request.
- Bundle original JetBrains Mono 2.304 fonts and SIL OFL 1.1; install missing fonts per user on desktop, apply editor typography, and provide retry without blocking theme setup. Restore/uninstall leave shared fonts installed.

## 0.5.0

- Inspect exact CSS on every activation; recover missing patches after same-version reinstalls, and suppress repeated failed authorization attempts for unchanged targets.
- Preserve user edits/deletions across automatic upgrades with released ownership; explicit Apply rebases undo to the current user choice. Batch palette writes and restoration.
- Add on-disk/missing/outdated/error/pending-reload status and a native Reload Window action. Avoid claims that an on-disk marker proves a live renderer state.
- Back off unavailable/failed Java providers from 2 to 60 seconds, retain cooldown while typing, and ignore unrelated document changes.
- Keep Restore available with missing logo files and retain reload recovery state when settings restoration fails.

## 0.4.2

- Replace the six-file-icon draft with 38 thin outline assets and mappings for 50 extensions, 30 filenames, folder states and common project folders.
- Use blue circle-C Java icons; distinguish JavaScript, TypeScript and Kotlin; add Maven/Gradle/XML/properties/YAML/Docker/SQL and common file types.
- Change Project product icon to a folder and expand original product font from 14 to 24 glyphs, including semantic symbol icons and theme colors.
- Preserve native Explorer behavior. Java file icons remain extension-based; no content-based class/interface/enum detection is claimed. No workbench CSS change in this release.

## 0.4.1

- Use the approved transparent light-gray/orange icon plus NhpDev wordmark in the titlebar, recomposed from the supplied outlined vectors for a readable header size.
- Retain the original navy/orange SVG and extension icon unchanged. Remove the outline filter from the displayed titlebar logo.

## 0.4.0

- Match the supplied neutral dark editor background (#242424); add a subtle teal-to-charcoal header gradient.
- Remove the white logo badge, preserving original navy/orange SVG colors with a transparent background and subtle outline.
- Distinguish primitive/type, class, interface and method colors while keeping ordinary variables/fields/parameters neutral.
- Add Java readonly UPPER_CASE constant decorations using existing semantic providers, including usages; preserve mutable uppercase and camelCase final variables.
- Validate semantic classification and actual rendered colors using isolated Red Hat Java 1.58.0 with its bundled JRE25, without touching user Java settings.

## 0.3.0

- Automatically select theme, file icons and product icons on activation; automatically install deep CSS/logo, with Linux OS authentication when required. No terminal commands or separate Node installation.
- Remove contributed workflow toolbar and keybindings. Release journaled workflow/layout settings from 0.2 while preserving later user edits.
- Use reference-inspired blue/navy palette and larger header/footer text while retaining native layout geometry.
- Keep appearance active after cancelled authentication, avoid repeated prompts, and stop automatic reapplication after Restore.

## 0.2.0

- Add explicit patch status, diagnostics and reviewable manual Apply/Restore scripts for protected installations. No automatic elevation or permission changes.
- Preserve file ownership/mode, reject stale prepared Apply scripts, retain marker-only Restore.
- Add scoped IDEA palette with per-color recovery, layout preset and version-aware tab density settings.
- Expand workbench CSS and add readable NhpDev logo badge, functional editor toolbar and 14 original product glyphs.
- Verify permission failures, manual recovery, settings ownership and actual rendered Linux workbench on a disposable VS Code copy.

## 0.1.1

- Bundle supplied NhpDev SVG as the default titlebar logo.
- Add supplied 512px NhpDev PNG as the extension icon.

## 0.1.0

- IDEA-inspired Dark color theme and original file icons.
- Optional navigation keymap and workspace actions.
- Custom titlebar logo with static SVG/PNG selection.
- Scoped CSS patch, content-addressed backup, marker-based restore and settings journal.
