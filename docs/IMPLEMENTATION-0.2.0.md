# 0.2.0 — protected installation recovery and UI refinement

Continues the accepted scope from the user's handoff: keep the original NhpDev logo before File, self-contained VSIX, reversible workbench patch, no automatic sudo or broad permission changes, local verification before Marketplace. The earlier external plan path was not available in this checkout; this records the concrete continuation.

## Decisions

Use extension-owned CSS and real VS Code panels/commands. An external CSS loader would add a dependency and another writer to shared workbench HTML. A custom webview imitation would lose native editor/tool-window behavior. This release expands the existing injector, layout preset and original icon assets.

On EACCES/EPERM/EROFS, stop before changing settings. Generate an immutable, uniquely named manual-script bundle in extension storage and open its guide. The user reviews and runs the selected script in an administrator terminal. Apply pins the current HTML hash; Restore reads the current HTML and strips only the extension's markers. Never restore a whole backup over current HTML. Preserve file mode and ownership when replacing it.

Apply palette entries under the named theme scope, journaling each leaf independently. Retain unrelated and later color edits on Restore. Query registered configuration keys before writing; VS Code 1.144 uses `window.density.editorTabHeight`, while earlier versions use a different key. Let VS Code size tabs; overriding only tab height clips the active underline when the containing strip uses another height.

The visual target is IDEA New UI Dark: neutral tool surfaces, dark editor, thin separators, blue active markers, compact tool headers, original outline icons, real Run/Debug/Terminal buttons. Add a light badge behind the unmodified navy/orange logo. No fabricated project/branch/run widgets and no claim of full IntelliJ layout parity.

## Completed verification

- Unit tests and actual standalone manual scripts on temporary files.
- Actual Extension Host on disposable VS Code installation/profile, including denied Apply and denied Restore, followed by manual recovery.
- Fresh-process rendered workbench inspection, DOM measurements and screenshot.
- Independent read-only review of permission recovery and settings ownership.
- Package content inspection before delivery.

See [validation](VALIDATION.md) and [rendered Linux UI](screenshots/idea-workspace-0.2.0-linux.png). Windows/macOS and the minimum VS Code API target remain unverified.
