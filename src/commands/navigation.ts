import * as vscode from 'vscode';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function findMatchInWorkspace(searchPattern: string): Promise<vscode.Uri | undefined> {
  const matches = await vscode.workspace.findTextInFiles({
    pattern: searchPattern,
    isRegex: true,
    include: '**/*.cs',
    exclude: '**/{bin,obj,node_modules}/**'
  });

  return matches[0]?.uri;
}

function getLineIndexByPattern(document: vscode.TextDocument, pattern: RegExp): number {
  const text = document.getText();
  const match = pattern.exec(text);
  if (!match) {
    return -1;
  }

  return document.positionAt(match.index).line;
}

export async function goToHandler(requestName?: string): Promise<void> {
  let resolvedName = requestName;

  if (!resolvedName) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage('MediatR Lens: open a C# file and place the cursor on a request class.');
      return;
    }

    const wordRange = editor.document.getWordRangeAtPosition(editor.selection.active);
    resolvedName = wordRange ? editor.document.getText(wordRange) : undefined;
  }

  if (!resolvedName) {
    vscode.window.showInformationMessage('MediatR Lens: could not determine the request name.');
    return;
  }

  const pattern = `class\\s+[A-Za-z_][A-Za-z0-9_]*\\s*:\\s*[^\\{\\n]*?IRequestHandler\\s*<\\s*${escapeRegex(resolvedName)}\\b`;
  const uri = await findMatchInWorkspace(pattern);

  if (!uri) {
    vscode.window.showWarningMessage(`MediatR Lens: no handler found for '${resolvedName}'.`);
    return;
  }

  const document = await vscode.workspace.openTextDocument(uri);
  const editor = await vscode.window.showTextDocument(document, { preview: false, viewColumn: vscode.ViewColumn.Active });
  const line = getLineIndexByPattern(document, new RegExp(pattern, 'i'));

  if (line >= 0) {
    const position = new vscode.Position(line, 0);
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
  }
}

export async function goToRequest(requestName?: string): Promise<void> {
  let resolvedName = requestName;

  if (!resolvedName) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage('MediatR Lens: open a C# file and place the cursor on a handler class.');
      return;
    }

    const wordRange = editor.document.getWordRangeAtPosition(editor.selection.active);
    resolvedName = wordRange ? editor.document.getText(wordRange) : undefined;
  }

  if (!resolvedName) {
    vscode.window.showInformationMessage('MediatR Lens: could not determine the request name.');
    return;
  }

  const pattern = `class\\s+[A-Za-z_][A-Za-z0-9_]*\\s*(?::\\s*[^\\{\\n]*?)?IRequest(?:\\s*<\\s*${escapeRegex(resolvedName)}\\b|\\s*<\\s*[^>]+>)?`;
  const uri = await findMatchInWorkspace(pattern);

  if (!uri) {
    vscode.window.showWarningMessage(`MediatR Lens: no request found for '${resolvedName}'.`);
    return;
  }

  const document = await vscode.workspace.openTextDocument(uri);
  const editor = await vscode.window.showTextDocument(document, { preview: false, viewColumn: vscode.ViewColumn.Active });
  const line = getLineIndexByPattern(document, new RegExp(pattern, 'i'));

  if (line >= 0) {
    const position = new vscode.Position(line, 0);
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
  }
}
