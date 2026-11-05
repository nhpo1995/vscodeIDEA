---
description: Persistent VS Code lifecycle testing and upgrade-state pitfalls
applyTo: 'test/**'
---

## Learnings

The tested VS Code 1.145 build used in-memory extension global storage with `--extensionTestsPath`: seeding a profile's SQLite database did not seed the extension's live Memento, despite settings files being real. Test upgrades, released setting ownership, same-version reinstalls and pending reloads with a packaged VSIX in a normal isolated VS Code process, then verify both the persisted state and native UI. Guard every integration mutation against an explicit disposable installation/profile; never point these fixtures at the user's active application or settings. Provider-failure cooldown must survive text edits, while successful token ranges must be invalidated immediately on edits.
