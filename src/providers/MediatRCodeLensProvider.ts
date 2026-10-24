import * as vscode from 'vscode';

function matchesRequestInheritance(inheritance: string): boolean {
  return /\bIRequest(?:\s*<[^>]+>)?\b/.test(inheritance);
}

function getRequestNameFromHandlerInheritance(inheritance: string): string | undefined {
  const match = /\bIRequestHandler\s*<\s*([A-Za-z_][A-Za-z0-9_]*)\b/.exec(inheritance);
  return match?.[1];
}

function parseClassDeclarations(text: string): Array<{ className: string; inheritance: string; index: number }> {
  const declarations: Array<{ className: string; inheritance: string; index: number }> = [];
  const regex = /class\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?::\s*([\s\S]*?))?\s*\{/g;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const className = match[1];
    const inheritance = match[2] ?? '';
    declarations.push({
      className,
      inheritance,
      index: match.index
    });
  }

  return declarations;
}

export class MediatRCodeLensProvider implements vscode.CodeLensProvider {
  public provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const codeLenses: vscode.CodeLens[] = [];
    const declarations = parseClassDeclarations(document.getText());

    for (const declaration of declarations) {
      const line = document.positionAt(declaration.index).line;
      const range = new vscode.Range(line, 0, line, 0);

      if (matchesRequestInheritance(declaration.inheritance)) {
        codeLenses.push(
          new vscode.CodeLens(range, {
            title: '🔎 Go to Handler',
            command: 'mediatr-lens.goToHandler',
            arguments: [declaration.className]
          })
        );
      }

      const requestName = getRequestNameFromHandlerInheritance(declaration.inheritance);
      if (requestName) {
        codeLenses.push(
          new vscode.CodeLens(range, {
            title: '🔎 Go to Request',
            command: 'mediatr-lens.goToRequest',
            arguments: [requestName]
          })
        );
      }
    }

    return codeLenses;
  }
}
