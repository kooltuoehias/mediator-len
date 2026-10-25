import * as vscode from 'vscode';
import { analysisService } from '../analyzer/analysisService';

function findClassDeclarations(text: string): Array<{ className: string; index: number }> {
  const declarations: Array<{ className: string; index: number }> = [];
  const regex = /\bclass\s+([A-Za-z_][A-Za-z0-9_]*)/g;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    declarations.push({ className: match[1], index: match.index });
  }

  return declarations;
}

export class MediatRCodeLensProvider implements vscode.CodeLensProvider {
  private readonly emitter = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses = this.emitter.event;

  public refresh(): void {
    this.emitter.fire();
  }

  public async provideCodeLenses(document: vscode.TextDocument): Promise<vscode.CodeLens[]> {
    const analysis = await analysisService.getAnalysis();
    if (!analysis) {
      return [];
    }

    const codeLenses: vscode.CodeLens[] = [];
    const declarations = findClassDeclarations(document.getText());

    for (const declaration of declarations) {
      const line = document.positionAt(declaration.index).line;
      const range = new vscode.Range(line, 0, line, 0);

      if (analysisService.isKnownRequestName(declaration.className)) {
        codeLenses.push(
          new vscode.CodeLens(range, {
            title: '🔎 Go to Handler',
            command: 'mediatr-lens.goToHandler',
            arguments: [declaration.className]
          })
        );
      }

      if (analysisService.isKnownHandlerName(declaration.className)) {
        codeLenses.push(
          new vscode.CodeLens(range, {
            title: '🔎 Go to Request',
            command: 'mediatr-lens.goToRequest',
            arguments: [declaration.className]
          })
        );
      }
    }

    return codeLenses;
  }
}
