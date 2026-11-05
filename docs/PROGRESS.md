# Execution ledger

Plan: ../docs/intellij-vscode-extension-plan.md (including custom CSS correction).

Ruling: Use standalone project directory because the initial workspace has no Git repository or implementation. No existing files are replaced.
Ruling: Implement our own small CSS-only injector, not an extension dependency; this keeps the VSIX self-contained and avoids a dependency altering CSP or third-party extension files.
Ruling: Theme applies on first activation (except high contrast); modifying the shared installation requires the explicit Apply command. A shared installation patch cannot be isolated per profile.
Ruling: Do not create a duplicate Explorer or a custom Activity Bar logo; user explicitly identified the titlebar icon before File.
Ruling: Original vector placeholder and original file icons are bundled; user can select their actual logo later.
Ruling: Product icon font is deferred from 0.1.0; retain built-in icons rather than claim custom font fidelity that is not implemented.

Completed: core patcher, settings journal, theme, file icons, keymap, setup/actions commands, README.
RED: patcher tests initially failed because implementation was absent.
GREEN: 11 core tests pass with compilation. Tests use real temporary files and ensure restore preserves later edits.
Pending: final review, package inspection and integration validation results.

Final review: two P2 findings fixed (nested guard after logo selection and failed-reapply restore journal). Added regression test and observed RED → GREEN.
Integration: actual VS Code 1.144.0 Extension Host smoke passed; see VALIDATION.md. Installed app was not patched.
Ruling: API minimum 1.95 is a compile target, not a claim of manual UI verification for that version. Documentation states verification limits.

## 0.2.0 continuation

- Protected installation recovery now prepares standalone reviewable manual Apply/Restore scripts, stops before settings on permission failure, and never executes elevation.
- Added diagnostics, on-disk status, per-color theme-scoped journaling, version-aware layout preset and restart instructions after manual Restore.
- Added functional editor toolbar, expanded CSS, original 14-glyph WOFF product icon font and a light badge behind the unmodified navy/orange logo.
- Actual Extension Host acceptance passed denied Apply/Restore and manual recovery, file/product icon selection, palette conflict handling and preservation of later settings edits.
- Fresh-process screenshot and DOM verification passed on the disposable Linux installation. Visual inspection found and corrected tab clipping caused by fixed CSS height; VS Code now owns tab layout metrics.
- Independent read-only reviewer found no important source/security/recovery defect and independently reran the 17 unit tests.
- The real installed workbench remains unpatched; changing it still requires the user's manual administrator step.

## 0.3.0 — supersedes manual installation flow

Automatic appearance activation, automatic CSS installation or OS authorization on Linux. No user-run script. Native navbar, keybindings and workflow settings are retained; older owned workflow changes released selectively. Palette follows the supplied navy reference, header/footer text increased. Validation: 19 unit tests, actual activation-only Extension Host test, fresh-process visual check, independent review. Actual PolicyKit administrator interaction remains untested; it is not described as verified.

## 0.4.0 — current requested palette

Neutral #242424 editor background measured from the supplied image; teal header gradient. Primitive cyan, class gold, interface teal, method blue; ordinary variables gray. Java constants use existing readonly semantics plus uppercase identifier filtering, including references. No Java provider replacement, no Java/JDK/Maven/PATH setting writes.

Actual isolated Red Hat Java 1.58/JRE25 integration passed. Actual rendered DOM colors and screenshot checks passed for class/interface/method/primitive/constants, mutable uppercase fields/locals and camelCase finals. 22 unit tests pass. Independent review found no important issue. Initial semantic cache readiness issue was fixed by a bounded refresh cache; semantic highlighting disabled by the user is respected.
