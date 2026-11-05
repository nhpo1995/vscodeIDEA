# Changelog

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
