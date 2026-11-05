# Validation — 2026-11-05

- `npm test`: TypeScript compilation + 13 Node tests passed.
- VS Code 1.144.0, Linux x64, actual Extension Host launched with separate `/tmp/idea-workspace-smoke-profile` and separate extension directory.
- Extension activation completed; 5 commands registered; theme selection checked through VS Code API.
- Read actual installed workbench HTML, copied it into a temporary directory, applied bundled logo/CSS, restored and compared byte-for-byte. Installed application HTML remained unchanged.
- Smoke log: `IDEA_SMOKE_PASS: activation, 5 commands, theme, real workbench copy apply/restore; VS Code 1.144.0`. Host exited 0.
- Final review caught failed reapply ownership and nested busy-guard navigation; both corrected. Failed reapply regression was observed red then green.

Not yet established: rendered logo/UI after patch and full application restart, manual Windows/macOS compatibility, actual compatibility on minimum supported API target 1.95. Theme and selectors may need adaptation for other versions. Core tests and Extension Host activation do not prove visual fidelity to IntelliJ.

No actual VS Code installation was patched during these checks.

- Additional regression: successful reapply releases historical ownership, preserving a later user edit equal to an earlier preset value. Observed failing then passing.

## 0.2.0 acceptance — 2026-11-05

- `npm test`: TypeScript + 17 unit tests pass. New tests execute generated Apply/Restore scripts using actual Node processes against temporary files; cover stale hashes, symlink rejection, mode preservation and scoped palette recovery.
- Disposable installation: `/tmp/idea-workspace-code-020`, copied from VS Code 1.144.0. Unreadable optional compile-cache entries were omitted by the copy; actual app resources loaded successfully. Original `/usr/share/code` was not changed.
- Dedicated acceptance profile: `/tmp/idea-workspace-020-acceptance-profile`; separate extension directory. `test/integration.cjs` refuses to run against any other installation root.
- Actual Extension Host acceptance: 9 commands registered; make copied file/directory read-only → Apply opens reviewable guide without changing icon settings → run generated Apply manually as normal user after restoring permissions → re-run Apply → file and product icons and scoped palette selected. Denied Restore likewise leaves settings pending, generated Restore removes CSS, subsequent command restores settings and preserves a later color edit. Final Apply leaves the disposable copy ready for restart.
- Host log: `IDEA_INTEGRATION_PASS: 9 commands; denied Apply and Restore; manual scripts; file/product icons; palette; Restore preserves later edits; final Apply. VS Code 1.144.0`, exit 0.
- Fresh process launched through `test/visual-host.cjs`, inspected via the copy's local DevTools endpoint with `node test/capture-visual.cjs`. CSS style element present, bundled SVG background loaded, logo box x=6..38 before menubar x=44, active tab palette `#1E1F22`, compact native tab height 22px, custom `pi-nhpdev-workspace-ui` font loaded, all four toolbar actions present, interfering experimental Modern UI disabled.
- [Rendered screenshot](screenshots/idea-workspace-0.2.0-linux.png) inspected visually. [DOM report](screenshots/visual-report.json) records the measurements. The integrity notification was dismissed through its normal Close action for the final screenshot; integrity checking remains enabled.
- Visual inspection caught a real clipping defect: fixed CSS tab height did not match VS Code's tab-strip layout height. Removed the forced height; active underline now renders inside the native strip.
- Independent read-only code review found no important permission/recovery defect; independently reran all 17 unit tests successfully.

Limits: manual administrator execution against the original installation was not performed, and this is not proof of Windows/macOS or VS Code 1.95 compatibility. The layout remains VS Code's native editor and panels; it does not reproduce every IntelliJ main-toolbar widget or docking behavior.

- Final VSIX built successfully with local relative links retained (no public repository configured). Archive inspection confirmed version 0.2.0, all five compiled runtime modules, themes/font and screenshot; excluded agent configuration, credentials folders, tests, source and dependencies. Runtime assets matched the built files byte-for-byte.
- Installed workbench SHA256 remained `272d9965dac310e2243551481909ede717e31077dcd1faa5be34272f1f15edc9`, with no extension marker.

## 0.3.0 — appearance only and automatic activation

- User correction: retain native VS Code navigation/workflows; install must apply theme/icons without terminal commands. Removed contributed toolbar/keybindings and reduced preset to three appearance settings only.
- `npm test`: 19 tests pass, including selective migration of previous workflow settings and executing the helper using VS Code's bundled Electron/Node runtime. No external Node dependency.
- `test/automatic-host.cjs` ran in a real Extension Host against the disposable writable installation. Activation alone applied theme, file icons, product icons and CSS. No Apply command was invoked. Explicit initial minimap=true, breadcrumbs=false, sidebar=right and commandCenter=false remained unchanged. No keybindings or menus were contributed.
- Host evidence: `IDEA_AUTOMATIC_PASS: activation alone applies theme, file icons, product icons and writable-install CSS; minimap, breadcrumbs, sidebar and command center preserved; no added toolbar or keybindings.` Exit 0.
- Fresh-process [0.3 screenshot](screenshots/idea-workspace-0.3.0-linux.png) inspected. DOM checks confirm NhpDev before File, palette #232536, custom font loaded, native editor toolbar with no extension-added actions. Header/footer text uses 14px/13px; native part dimensions remain governed by VS Code.
- Independent reviewer found no blocking issue and independently reran 19 tests. Reviewer identified retry after VS Code updates; automatic attempt identity now includes both extension version and VS Code version.
- Protected Linux installations invoke PolicyKit (`pkexec`) automatically with a fixed-target helper and bundled runtime, with no shell or manual terminal workflow. Actual administrator authentication/cancellation has not been executed in this session; only the underlying helper/runtime path and writable-install automatic flow were executed. Theme/icons remain independent of that permission step.
- Linux is the only implemented automatic elevation path. Windows/macOS theme/icon activation is supported by the API; protected-install custom chrome authentication there is not implemented/tested.

## 0.4.0 — neutral background, gradient and Java semantic palette

- Measured supplied PNG first scanline: RGB (36,36,36), giving `#242424`. Editor, tabs and related surfaces now use neutral charcoal instead of navy. Header has CSS linear gradient from muted teal toward charcoal.
- 22 unit tests pass. New tests decode actual semantic-token encoding and select only readonly uppercase variable/property/parameter tokens or uppercase enum members. Exclude readonly class types, mutable uppercase identifiers and camelCase finals.
- Real Java integration: separate `/tmp/idea-workspace-040-java-profile` and extension directory using Red Hat Java 1.58.0's bundled JRE25. No original user Java settings, PATH, JDK, Maven, caches or project files changed. Fixture is [RetryService.java](../test/fixtures/RetryService.java); host test is [java-host.cjs](../test/java-host.cjs).
- `IDEA_JAVA_PASS`: actual provider marks MAX_RETRIES field and LOCAL_LIMIT local readonly. Decoder selects their declarations/usages; rejects mutable UPPER_MUTABLE and effectively-final but undeclared-final UPPER_LOCAL, plus camelCase finals initialRetries/localCount.
- Fresh-process rendered verification via [capture-visual.cjs](../test/capture-visual.cjs) checks computed DOM colors: datatype int #76C7E7, class RetryService #E2C077, interface RetryPolicy #7DCFC1, method nextAttempt #61AFEF, MAX_RETRIES/LOCAL_LIMIT #C792EA at declarations/usages, all ordinary variables #D4D4D4. Header's computed background is linear-gradient; base theme background #242424.
- Visual testing found that initial empty semantic results can precede language-server readiness. Cached results now expire after 10 seconds and are invalidated on document/config changes, so constants can appear when project semantics settle without requiring user edits. Pending requests are deduplicated per URI, stale document responses discarded, listeners/timers/decorations disposed.
- [Actual Java screenshot](screenshots/idea-workspace-0.4.0-java.png) inspected. Native VS Code toolbar remains unchanged, with no extension-provided Run/Debug actions.
- Independent read-only review found no important issue and independently reran all 22 tests.

Precise Java constant highlighting depends on an available semantic provider. Windows/macOS and other Java providers have not received the same real-render verification. Protected Linux installation uses the previously implemented PolicyKit path; this session does not claim an additional administrator-authentication test.

- Logo refinement: removed white badge; kept original SVG navy/orange colors and added a subtle CSS drop-shadow outline. Final capture checks the logo element background is transparent.

## VS Code 1.145.0 update acceptance — 2026-11-06

See [update report](UPDATE-1.145.0.md). Exact downloaded archive tested with packaged VSIX 0.4.0 and simulated previous-app state. Automatic reapply, native settings preservation, Java semantics and fresh-process DOM/render checks all passed. System installation remains 1.144.0; no actual APT upgrade or elevated-patch test was performed.

## 0.4.1 — approved dark-display logo

- Original logo.svg remains byte-for-byte identical to the supplied brand SVG. The new logo-dark.svg preserves all paths/viewBox and orange #BD4929; only the navy fill changes to #DFE1E5. No background geometry.
- Static SVG validator accepts the variant; 22 tests and compilation pass.
- Actual Extension Host on the isolated VS Code 1.145.0 installation confirms the bundled default automatically embeds the variant. Rendered DOM confirms light-gray/orange fills, no navy fill, transparent background, filter none.
- [Header screenshot](screenshots/logo-dark-0.4.1.png) inspected; no user Java settings or original brand assets changed.

- Final 0.4.1 logo scope includes the NhpDev wordmark requested during review. Source NHP_NhpDev.svg is retained byte-for-byte as logo-wordmark.svg; logo-header.svg preserves all six icon/letter path definitions, with transforms for a readable 100x28 composition and the approved gray/orange palette. No runtime fonts or text rendering dependency.
- Actual rendered wordmark on VS Code 1.145.0 confirmed transparent background, no filter, expected fills and 108px click target. Logo right edge x=114 is before native menubar left x=120; [header preview](screenshots/logo-dark-0.4.1.png) inspected.

## 0.4.2 — file/product icon refinement

- 38 generated original SVG file/folder icons validated as XML. Every icon association resolves to an existing definition and asset. JS/TS/Kotlin/Java mappings and open/closed folder associations are distinct.
- Product WOFF contains 24 nonempty glyphs; 31 icon definitions/aliases resolve to cmap entries, independently verified by reviewer.
- 22 tests pass; actual isolated VS Code 1.145.0 activation selected file/product themes. Native Explorer DOM confirmed Java, JavaScript, TypeScript, Maven, Gradle, Docker, JSON and SQL labels resolve to their respective new SVGs.
- [Actual Explorer screenshot](screenshots/icons-0.4.2.png) inspected; [resolved icon URLs](screenshots/icons-0.4.2-report.json) saved. The preview workspace and profile are disposable. Red Hat extension was disabled only in this preview process to avoid importing the dummy Maven/Gradle fixtures; no user extension state or Java setting was changed.
- Native folder expansion/compaction and navigation retained. File-theme limitations for Java interface/enum files are documented.
- CSS chrome revision remains 0.4.1, matching the current installed workbench; icons are API-level changes and introduce no new installation-file patch.
- Independent read-only review found no important issue and reran all 22 tests.
