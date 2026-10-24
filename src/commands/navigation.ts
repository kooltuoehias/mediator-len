import * as fs from 'fs';
import * as vscode from 'vscode';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function findMatchInWorkspace(searchTerms: string[]): Promise<vscode.Uri | undefined> {
  const files = await vscode.workspace.findFiles('**/*.cs', '**/{bin,obj,node_modules}/**');

  for (const file of files) {
    const content = fs.readFileSync(file.fsPath, 'utf8');
    if (searchTerms.some((term) => content.includes(term))) {
      return file;
    }
  }

  return undefined;
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

  const searchTerms = [
    `IRequestHandler<${resolvedName}`,
    `IRequestHandler< ${resolvedName}`,
    `IRequestHandler<${resolvedName},`,
    `IRequestHandler< ${resolvedName},`
  ];

  const uri = await findMatchInWorkspace(searchTerms);
  if (!uri) {
    vscode.window.showWarningMessage(`MediatR Lens: no handler found for '${resolvedName}'.`);
    return;
  }

  const document = await vscode.workspace.openTextDocument(uri);
  const editor = await vscode.window.showTextDocument(document, { preview: false, viewColumn: vscode.ViewColumn.Active });
  const pattern = new RegExp(`IRequestHandler\\s*<\\s*${escapeRegex(resolvedName)}\\b`, 'i');
  const line = getLineIndexByPattern(document, pattern);

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

  const searchTerms = [
    `IRequest<${resolvedName}`,
    `IRequest< ${resolvedName}`,
    `class ${resolvedName} :`,
    `class ${resolvedName}`
  ];

  const uri = await findMatchInWorkspace(searchTerms);
  if (!uri) {
    vscode.window.showWarningMessage(`MediatR Lens: no request found for '${resolvedName}'.`);
    return;
  }

  const document = await vscode.workspace.openTextDocument(uri);
  const editor = await vscode.window.showTextDocument(document, { preview: false, viewColumn: vscode.ViewColumn.Active });
  const pattern = new RegExp(`class\\s+[A-Za-z_][A-Za-z0-9_]*\\s*(?::\\s*[^\\{\\n]*?)?IRequest(?:\\s*<\\s*${escapeRegex(resolvedName)}\\b|\\s*<\\s*[^>]+>)?`, 'i');
  const line = getLineIndexByPattern(document, pattern);

  if (line >= 0) {
    const position = new vscode.Position(line, 0);
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
  }
}
