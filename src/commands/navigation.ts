import * as vscode from 'vscode';
import { analysisService } from '../analyzer/analysisService';
import { HandlerRegistration, NamedTypeLocation, RequestEntry } from '../analyzer/types';

function resolveNameFromEditorOrArgument(argument: string | undefined): string | undefined {
  if (argument) {
    return argument;
  }

  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return undefined;
  }

  const wordRange = editor.document.getWordRangeAtPosition(editor.selection.active);
  return wordRange ? editor.document.getText(wordRange) : undefined;
}

async function openAt(file: string, line: number): Promise<void> {
  const document = await vscode.workspace.openTextDocument(file);
  const editor = await vscode.window.showTextDocument(document, {
    preview: false,
    viewColumn: vscode.ViewColumn.Active
  });

  const position = new vscode.Position(line, 0);
  editor.selection = new vscode.Selection(position, position);
  editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
}

function innermostLocatedNode(chain: NamedTypeLocation[]): NamedTypeLocation | undefined {
  for (let i = chain.length - 1; i >= 0; i--) {
    if (chain[i].File && chain[i].Line !== null) {
      return chain[i];
    }
  }
  return undefined;
}

export async function goToHandler(requestName?: string): Promise<void> {
  const resolvedName = resolveNameFromEditorOrArgument(requestName);
  if (!resolvedName) {
    vscode.window.showInformationMessage('MediatR Lens: open a C# file and place the cursor on a request class.');
    return;
  }

  const entries = analysisService.findEntriesForRequestName(resolvedName);
  const candidates: { entry: RequestEntry; handler: HandlerRegistration }[] = [];
  for (const entry of entries) {
    for (const handler of entry.Handlers) {
      if (handler.File && handler.Line !== null) {
        candidates.push({ entry, handler });
      }
    }
  }

  if (candidates.length === 0) {
    vscode.window.showWarningMessage(`MediatR Lens: no handler found for '${resolvedName}'.`);
    return;
  }

  if (candidates.length === 1) {
    await openAt(candidates[0].handler.File as string, candidates[0].handler.Line as number);
    return;
  }

  const picked = await vscode.window.showQuickPick(
    candidates.map((candidate) => ({
      label: candidate.handler.Handler,
      description: candidate.handler.File ?? undefined,
      candidate
    })),
    { placeHolder: `Multiple handlers found for '${resolvedName}', pick one` }
  );

  if (picked) {
    await openAt(picked.candidate.handler.File as string, picked.candidate.handler.Line as number);
  }
}

export async function goToRequest(handlerName?: string): Promise<void> {
  const resolvedName = resolveNameFromEditorOrArgument(handlerName);
  if (!resolvedName) {
    vscode.window.showInformationMessage('MediatR Lens: open a C# file and place the cursor on a handler class.');
    return;
  }

  const matches = analysisService.findHandlerMatchesForHandlerName(resolvedName);
  const candidates = matches
    .map((match) => ({ match, node: innermostLocatedNode(match.entry.RequestChain) }))
    .filter((candidate): candidate is { match: typeof matches[number]; node: NamedTypeLocation } =>
      candidate.node !== undefined
    );

  if (candidates.length === 0) {
    vscode.window.showWarningMessage(`MediatR Lens: no request found for '${resolvedName}'.`);
    return;
  }

  if (candidates.length === 1) {
    await openAt(candidates[0].node.File as string, candidates[0].node.Line as number);
    return;
  }

  const picked = await vscode.window.showQuickPick(
    candidates.map((candidate) => ({
      label: candidate.node.Name,
      description: candidate.node.File ?? undefined,
      candidate
    })),
    { placeHolder: `Multiple requests found for '${resolvedName}', pick one` }
  );

  if (picked) {
    await openAt(picked.candidate.node.File as string, picked.candidate.node.Line as number);
  }
}
