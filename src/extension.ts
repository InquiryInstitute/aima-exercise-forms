import * as path from 'path';
import * as vscode from 'vscode';
import { parseMarkdown, parseAdoc } from './parser';

export interface ExerciseEntry {
  path: string;
  relativePath: string;
  title: string;
  questionText: string;
  answerText: string;
  answerAppend: boolean;
  isAdoc: boolean;
}

export function activate(context: vscode.ExtensionContext) {
  const provider = new ExerciseFormViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'aimaExerciseForms.panel',
      provider
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('aimaExerciseForms.open', () => {
      vscode.commands.executeCommand('aimaExerciseForms.panel.focus');
    })
  );
}

function getConfig() {
  const config = vscode.workspace.getConfiguration('aimaExerciseForms');
  const root = (config.get<string>('root') || '').trim();
  let glob = config.get<string>('glob') || 'exercises/**/*.md';
  const includeAdoc = config.get<boolean>('includeAdoc') ?? false;
  if (root && !glob.startsWith(root)) {
    glob = path.join(root, glob).replace(/\\/g, '/');
  }
  return { root, glob, includeAdoc };
}

async function discoverExercises(): Promise<ExerciseEntry[]> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders?.length) {
    return [];
  }
  const config = getConfig();
  const entries: ExerciseEntry[] = [];
  const mdGlob = new vscode.RelativePattern(workspaceFolders[0], config.glob);
  const mdUris = await vscode.workspace.findFiles(mdGlob, null, 500);
  for (const uri of mdUris) {
    const rel = vscode.workspace.asRelativePath(uri);
    const doc = await vscode.workspace.openTextDocument(uri);
    const parsed = parseMarkdown(doc.getText(), doc);
    entries.push({
      path: uri.fsPath,
      relativePath: rel,
      title: parsed.title || path.basename(uri.fsPath, '.md'),
      questionText: parsed.questionText,
      answerText: parsed.answerText,
      answerAppend: parsed.answerAppend,
      isAdoc: false,
    });
  }
  if (config.includeAdoc) {
    const adocGlob = config.glob.replace(/\.md\s*$/, '.adoc').replace(/\*\.md/, '*.adoc');
    const adocPattern = new vscode.RelativePattern(workspaceFolders[0], adocGlob);
    const adocUris = await vscode.workspace.findFiles(adocPattern, null, 500);
    for (const uri of adocUris) {
      const rel = vscode.workspace.asRelativePath(uri);
      const doc = await vscode.workspace.openTextDocument(uri);
      const parsed = parseAdoc(doc.getText(), doc);
      entries.push({
        path: uri.fsPath,
        relativePath: rel,
        title: parsed.title || path.basename(uri.fsPath, '.adoc'),
        questionText: parsed.questionText,
        answerText: parsed.answerText,
        answerAppend: parsed.answerAppend,
        isAdoc: true,
      });
    }
  }
  entries.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  return entries;
}

class ExerciseFormViewProvider implements vscode.WebviewViewProvider {
  constructor(private readonly _extensionUri: vscode.Uri) {}

  async resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    const exercises = await discoverExercises();
    const html = this.getHtml(webviewView.webview, exercises);
    webviewView.webview.html = html;

    webviewView.webview.onDidReceiveMessage(async (msg) => {
      if (msg.type === 'save' && msg.path && typeof msg.answerText === 'string') {
        await this.saveAnswer(msg.path, msg.answerText);
      }
    });
  }

  private async saveAnswer(filePath: string, answerText: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    let doc: vscode.TextDocument;
    try {
      doc = await vscode.workspace.openTextDocument(uri);
    } catch {
      vscode.window.showErrorMessage(`Could not open file: ${filePath}`);
      return;
    }
    const isAdoc = filePath.toLowerCase().endsWith('.adoc');
    const parsed = isAdoc
      ? parseAdoc(doc.getText(), doc)
      : parseMarkdown(doc.getText(), doc);

    const edit = new vscode.WorkspaceEdit();
    if (parsed.answerAppend) {
      if (parsed.questionText) {
        const insert = isAdoc
          ? `\n.Answer\n${answerText}\n`
          : `\n\n<!-- answer -->\n${answerText}\n<!-- /answer -->`;
        edit.insert(uri, new vscode.Position(doc.lineCount, 0), insert);
      } else {
        const newContent = isAdoc
          ? `.Answer\n${answerText}\n`
          : `<!-- answer -->\n${answerText}\n<!-- /answer -->`;
        if (doc.lineCount === 0) {
          edit.insert(uri, new vscode.Position(0, 0), newContent);
        } else {
          const lastLine = doc.lineCount - 1;
          const lastLen = doc.lineAt(lastLine).text.length;
          const fullRange = new vscode.Range(0, 0, lastLine, lastLen);
          edit.replace(uri, fullRange, newContent);
        }
      }
    } else {
      edit.replace(uri, parsed.answerRange, answerText);
    }
    const applied = await vscode.workspace.applyEdit(edit);
    if (applied) {
      const updated = await vscode.workspace.openTextDocument(uri);
      const bytes = new TextEncoder().encode(updated.getText());
      await vscode.workspace.fs.writeFile(uri, bytes);
      vscode.window.showInformationMessage('Answer saved.');
    } else {
      vscode.window.showErrorMessage('Failed to save answer.');
    }
  }

  private getHtml(webview: vscode.Webview, exercises: ExerciseEntry[]): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'src', 'webview', 'script.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'src', 'webview', 'style.css')
    );
    const data = JSON.stringify(exercises);
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' ${webview.cspSource}; style-src 'unsafe-inline' ${webview.cspSource};">
  <link rel="stylesheet" href="${styleUri}">
</head>
<body>
  <div class="list-panel">
    <h2>Exercises</h2>
    <ul id="exercise-list"></ul>
  </div>
  <div class="form-panel">
    <div id="placeholder"><p>Select an exercise from the list.</p></div>
    <div id="form" style="display:none">
      <div class="question-block">
        <h3 id="question-title"></h3>
        <div id="question-body" class="question-body"></div>
      </div>
      <div class="answer-block">
        <label for="answer-text">Your answer</label>
        <textarea id="answer-text" rows="8"></textarea>
        <button id="save-btn">Save</button>
      </div>
    </div>
  </div>
  <script>
    window.__EXERCISES__ = ${data.replace(/</g, '\\u003c')};
  </script>
  <script src="${scriptUri}"></script>
</body>
</html>`;
  }
}
