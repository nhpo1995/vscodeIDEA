<div align="center">
  <img src="media/extension-icon.png" alt="NhpDev" width="128">
  <h1>IDEA-inspired Workspace</h1>
  <p>An IntelliJ-inspired appearance for Visual Studio Code that keeps native VS Code workflows intact.</p>
  <p><strong>Created by NhpDev</strong></p>
  <p>
    <a href="https://github.com/nhpo1995/vscodeIDEA/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/nhpo1995/vscodeIDEA?display_name=tag&sort=semver"></a>
    <a href="LICENSE"><img alt="MIT License" src="https://img.shields.io/github/license/nhpo1995/vscodeIDEA"></a>
    <img alt="Visual Studio Code 1.95 or later" src="https://img.shields.io/badge/VS%20Code-1.95%2B-007ACC?logo=visualstudiocode&logoColor=white">
    <a href="https://github.com/nhpo1995/vscodeIDEA/releases"><img alt="GitHub release downloads" src="https://img.shields.io/github/downloads/nhpo1995/vscodeIDEA/total?label=downloads"></a>
    <a href="https://github.com/nhpo1995/vscodeIDEA/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/nhpo1995/vscodeIDEA"></a>
    <a href="https://github.com/nhpo1995/vscodeIDEA/issues"><img alt="GitHub issues" src="https://img.shields.io/github/issues/nhpo1995/vscodeIDEA"></a>
  </p>
  <p>
    <a href="https://github.com/nhpo1995/vscodeIDEA/releases">Download a release</a>
    ·
    <a href="CHANGELOG.md">Changelog</a>
    ·
    <a href="LICENSE">MIT License</a>
  </p>
</div>

![IDEA-inspired Workspace Explorer icons in VS Code](docs/screenshots/icons-0.4.2.png)

## Overview

IDEA-inspired Workspace brings a coordinated dark theme, file icons, product icons, Java semantic highlighting, and optional title-bar customization to Visual Studio Code. The extension keeps the native menus, panels, editor layout, and keyboard workflows.

The latest release is **0.5.0**. GitHub Releases include installable VSIX packages for versions **0.1.0 through 0.5.0**. Tags **v0.1.0 through v0.4.2** point to the 0.4.2 source snapshot; each release includes the archived VSIX for its labeled version. The current branch contains the 0.5.0 source.

## Features

- **IDEA-inspired Dark theme** with a neutral editor background and coordinated syntax colors.
- **File icon theme** with 38 SVG assets, mappings for common extensions and filenames, and distinct folder states.
- **Product icon theme** with 24 original glyphs for project and symbol views.
- **Java semantic highlighting** for types, methods, and readonly `UPPER_CASE` constants when a Java language server provides semantic tokens.
- **Optional title-bar logo and workbench styling** with Apply and Restore commands.
- **Logo selection** from a local SVG or PNG file.
- **Upgrade-safe settings** that preserve your later edits across automatic upgrades.
- **CSS recovery and reload status** with a native Reload Window action when the workbench needs to load updated styling.
- **Diagnostics and setup commands** to review the extension state.

## Installation

### Install from GitHub Releases

1. Open [Releases](https://github.com/nhpo1995/vscodeIDEA/releases) and choose a version.
2. Download that release's `idea-workspace-<version>.vsix` asset.
3. In VS Code, open the Command Palette and run **Extensions: Install from VSIX...**.
4. Select the downloaded VSIX file.

You can also install from a terminal:

```sh
code --install-extension ./idea-workspace-0.5.0.vsix
```

Replace the filename with the version you downloaded. After installation, the theme and icon themes apply automatically when the extension activates.

## Optional workbench customization

VS Code does not expose an API for changing the application title-bar logo or injecting custom workbench CSS. The extension can patch the installed VS Code workbench to provide those optional appearance changes.

- On Linux installations that require administrator access, the extension requests authentication through the operating system's PolicyKit dialog (`pkexec`). It does not ask you to enter a password in the terminal or change installation permissions.
- Automatic elevation for this patch is implemented for Linux. On Windows and macOS, the theme and icon themes work, but equivalent automatic elevation for the workbench patch is not currently provided.
- After applying the workbench patch, choose **Reload Window** when prompted to load the updated CSS. You can also use **IDEA Workspace: Reload Window to Load UI** from the Command Palette.
- Cancelling authentication leaves the theme and icon themes available. Use **IDEA Workspace: Apply UI and Logo** to try the optional patch again.

### Restore changes

Run **IDEA Workspace: Restore UI and Settings** to remove the extension's marked CSS patch and restore the appearance settings it changed. Restore preserves unrelated CSS and settings edits, then prompts you to reload the window when needed. After Restore, automatic reapplication stays paused until you choose Apply again. Restore before uninstalling if you want to remove the workbench customization.

## Commands

Open the Command Palette and search for **IDEA Workspace**:

| Command | Purpose |
| --- | --- |
| `IDEA Workspace: Apply UI and Logo` | Reapply the extension presets for the theme, icons, UI colors, and logo. Use this to return to the extension's appearance settings. |
| `IDEA Workspace: Open Setup` | Open the setup menu. |
| `IDEA Workspace: Choose Logo (SVG or PNG)` | Choose a new logo; the extension applies it automatically. |
| `IDEA Workspace: Reload Window to Load UI` | Reload VS Code after the workbench CSS changes. |
| `IDEA Workspace: Diagnose UI and Logo` | Inspect the current state and troubleshoot setup. |
| `IDEA Workspace: Restore UI and Settings` | Undo extension-managed changes while preserving your later edits. |

The `ideaWorkspace.logoPath` setting accepts an absolute path to a local SVG or PNG. Leave it empty to use the bundled NhpDev logo. The logo picker applies the selection automatically.

## Java highlighting

Java-specific semantic colors depend on an active Java language server and semantic highlighting. The extension reads semantic tokens from the existing provider and adds decorations for readonly uppercase constants; it does not replace the Java language server or infer constants from names alone. If semantic tokens are not available yet, the theme's regular colors are used until the provider updates.

The file icon theme classifies files by extension and filename. It does not inspect Java source to give Explorer icons based on whether a file contains a class, interface, or enum. Semantic symbol icons may appear in Outline when the language provider supplies the symbol kind.

## Compatibility and limitations

- Requires Visual Studio Code **1.95.0 or later**.
- Theme and icon themes use VS Code extension APIs. The optional workbench CSS and logo patch modifies files in the VS Code installation, is shared across profiles, and may trigger VS Code's installation-integrity warning.
- A VS Code update may replace the patched files. The extension attempts to reapply the patch once after an update; you can also use Apply to retry.
- Native title-bar behavior varies by operating system and title-bar mode. The extension does not change the taskbar icon or Activity Bar logo.
- The supplied icons are original assets inspired by the reference style; they are not a complete copy of IntelliJ icons.
- No telemetry is sent by this project.

## Build and test

Requirements: Node.js and npm. The runtime extension has no external runtime dependencies.

```sh
git clone https://github.com/nhpo1995/vscodeIDEA.git
cd vscodeIDEA
npm ci
npm test
npm run package
```

`npm test` compiles the TypeScript and runs the Node.js test files. `npm run package` compiles the extension and creates a VSIX package using `vsce`.

Optional asset builders:

- Rebuild file icon SVG assets with `python3 scripts/build-file-icons.py` (no third-party Python packages required).
- Rebuild the product icon font with `python3 scripts/build-product-icons.py` (requires Python and `fonttools` 4.60.1).

## Contributing

Bug reports, corrections, and focused pull requests are welcome. For larger changes, open an issue first to discuss the expected behavior. Include your VS Code version and reproduction steps when reporting a problem. Please keep changes scoped and avoid adding unrelated workbench modifications.

## Releases

See the [changelog](CHANGELOG.md) for project history and [GitHub Releases](https://github.com/nhpo1995/vscodeIDEA/releases) for tags and downloadable VSIX files.

### Automatic Marketplace publishing

The pipelines have separate responsibilities:

- **CI** ([ci.yml](.github/workflows/ci.yml)): on pushes to `main` and pull requests, run tests, verify VSIX packaging, and save the validation package as a workflow artifact. It does not need a Marketplace publisher or publishing credentials.
- **CD** ([cd.yml](.github/workflows/cd.yml)): on a published stable GitHub Release, validate the tag/version, rerun tests against the exact tagged commit, build the release VSIX, save it as a workflow artifact, and publish that exact VSIX to the VS Code Marketplace. Only CD requests an OIDC publishing token. Pushing commits or tags alone, draft releases and prereleases do not publish to the Marketplace.

One-time setup:

1. Create or select your publisher at [Marketplace Management](https://marketplace.visualstudio.com/manage). Use its **ID**, not its display name.
2. In GitHub repository **Settings → Secrets and variables → Actions → Variables**, create `MARKETPLACE_PUBLISHER_ID` with that ID. This is a repository variable, not a secret. CD sets the packaged publisher from this variable; CI and local builds keep the publisher declared in the manifest. Keep the variable unchanged for future updates to the same extension.
3. Under the Marketplace publisher, open **Trusted Publishing** and create a policy with repository owner `nhpo1995`, repository `vscodeIDEA`, workflow `cd.yml`, and no environment. No PAT or Azure secret is needed. For a private repository, run the workflow within 48 hours of creating the policy. If a policy already names `publish-marketplace.yml`, replace it with one for `cd.yml`.
4. Push the publishing workflow and packaging changes before creating the release. The released tag must include these changes; old tags will not acquire the new workflow.

For each release, including the first Marketplace release:

1. Update the version and lockfile with `npm version 0.5.1 --no-git-tag-version` (replace `0.5.1` with the desired unused version), and update the changelog.
2. Commit and push the changes to GitHub.
3. Create and publish a GitHub Release using a matching tag such as `v0.5.1`, targeting that commit.
4. Check **Actions → CD - Publish to VS Code Marketplace**. The packaged VSIX is available in the run artifacts, even if Marketplace publishing fails. Fix publisher/policy settings and rerun failed jobs if needed; an already published version is skipped on retry. Publishing a changed package requires a new version.

Once published, the extension ID is `<MARKETPLACE_PUBLISHER_ID>.idea-workspace`. A local installation under `local-workspace.idea-workspace` has a different ID and will not automatically migrate to the Marketplace publisher.

See Microsoft's [publishing guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#publish-with-github-actions-and-trusted-publishing) for Trusted Publishing details.

## License

This project is licensed under the [MIT License](LICENSE).

## Upgrades and Restore

Automatic upgrades preserve settings you have changed or deleted, and later upgrades leave those choices alone. **Apply UI and Logo** intentionally reapplies the extension presets. **Restore UI and Settings** reverses extension-managed changes while preserving later edits. The extension also checks its custom CSS on activation and recovers it if an update or reinstall removes it. The status bar reports when the CSS needs a window reload; “CSS installed” confirms the file on disk, not that the renderer has loaded it.
