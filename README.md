# AIMA Exercise Forms

A VS Code extension that renders AIMA-style exercise questions and answers from Markdown or AsciiDoc files as a form-like UI in the sidebar. Questions are shown read-only (rendered); answers are editable in a text area. Save writes the answer back into the same file.

## File convention

Exercises are discovered under a configurable path (default `exercises/`). Use **one file per exercise** (e.g. `exercises/ch01/ex_1.md`).

### Markdown

Use HTML comments to separate question and answer:

```markdown
## Exercise 1.1
<!-- question -->
Define in your own words: (a) intelligence, (b) artificial intelligence.
<!-- /question -->
<!-- answer -->
(your answer here)
<!-- /answer -->
```

### AsciiDoc

Use block titles:

```adoc
== Exercise 1.1
.Question
Define in your own words: (a) intelligence, (b) artificial intelligence.

.Answer
(your answer here)
```

### Backward compatibility

If a file has no `<!-- question -->` or `<!-- answer -->` blocks (Markdown) or no `.Question`/`.Answer` blocks (AsciiDoc), the whole file is treated as the answer. You can still open it in the form and edit; the first save will add the answer block(s).

## Configuration

| Setting | Default | Description |
|--------|---------|-------------|
| `aimaExerciseForms.glob` | `exercises/**/*.md` | Glob for exercise files (relative to workspace or `aimaExerciseForms.root`). |
| `aimaExerciseForms.root` | (empty) | Relative path from workspace root to the exercises folder. |
| `aimaExerciseForms.includeAdoc` | `false` | If true, also discover `*.adoc` files. |

## How to use

1. Open a workspace that contains an `exercises/` folder (or your configured path) with `.md` (or `.adoc`) files.
2. Open the **AIMA Exercises** view in the sidebar (activity bar icon) or run **AIMA: Open Exercise Form** from the Command Palette.
3. Click an exercise in the list. The question appears above and the answer in a text area.
4. Edit the answer and click **Save** (or blur the text area to auto-save). The file is updated on disk.

All content stays in your repo; there is no external server. Existing autograders (e.g. scripts that read `exercises/ch01/ex_1.md`) continue to work; they can read the whole file or be updated to use only the answer block.

## Build and package

```bash
npm install
npm run compile
npm run package
```

This produces `aima-exercise-forms-0.1.0.vsix` in the repo root. Install it with:

```bash
code --install-extension aima-exercise-forms-0.1.0.vsix
```

## Included in assignment Codespaces

The extension is designed to be installed in every student assignment Codespace via the assignment template’s devcontainer. Use either: **(A)** build a `.vsix` and add a `postCreateCommand` in the template that downloads the VSIX from a GitHub Release and runs `code --install-extension <vsix>`; or **(B)** publish to Open VSX / Marketplace and add `InquiryInstitute.aima-exercise-forms` to `customizations.vscode.extensions` in the template’s `devcontainer.json`.

To create a GitHub Release so that Option A works: push a tag (e.g. `v0.1.0`). The [Release VSIX workflow](.github/workflows/release-vsix.yml) will build the `.vsix` and attach it to the release. Then the assignment devcontainer can use `https://github.com/InquiryInstitute/aima-exercise-forms/releases/download/v0.1.0/aima-exercise-forms-0.1.0.vsix` in its `postCreateCommand`.

## License

MIT
