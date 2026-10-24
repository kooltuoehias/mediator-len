import * as vscode from 'vscode';

export class MediatRCodeLensProvider implements vscode.CodeLensProvider {
  private readonly requestRegex = /class\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?::\s*[^\{\n]*?)?IRequest(?:\s*<\s*[^>]+>)?/g;
  private readonly handlerRegex = /class\s+([A-Za-z_][A-Za-z0-9_]*)\s*:\s*[^\{\n]*?IRequestHandler\s*<\s*([A-Za-z_][A-Za-z0-9_]*)(?:\s*,\s*[^>]+)?\s*>/g;

  public provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const codeLenses: vscode.CodeLens[] = [];
    const text = document.getText();

    let match: RegExpExecArray | null;

    this.requestRegex.lastIndex = 0;
    while ((match = this.requestRegex.exec(text)) !== null) {
      const className = match[1];
      const line = document.positionAt(match.index).line;
      const range = new vscode.Range(line, 0, line, 0);

      codeLenses.push(
        new vscode.CodeLens(range, {
          title: '🔎 Go to Handler',
          command: 'mediatr-lens.goToHandler',
          arguments: [className]
        })
      );
    }

    this.handlerRegex.lastIndex = 0;
    while ((match = this.handlerRegex.exec(text)) !== null) {
      const requestName = match[2];
      const line = document.positionAt(match.index).line;
      const range = new vscode.Range(line, 0, line, 0);

      codeLenses.push(
        new vscode.CodeLens(range, {
          title: '🔎 Go to Request',
          command: 'mediatr-lens.goToRequest',
          arguments: [requestName]
        })
      );
    }

    return codeLenses;
  }
}
