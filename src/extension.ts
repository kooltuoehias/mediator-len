import * as vscode from 'vscode';
import { goToHandler, goToRequest } from './commands/navigation';
import { MediatRCodeLensProvider } from './providers/MediatRCodeLensProvider';
import { analysisService } from './analyzer/analysisService';

export function activate(context: vscode.ExtensionContext): void {
  const codeLensProvider = new MediatRCodeLensProvider();

  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider({ language: 'csharp' }, codeLensProvider),
    vscode.commands.registerCommand('mediatr-lens.goToHandler', goToHandler),
    vscode.commands.registerCommand('mediatr-lens.goToRequest', goToRequest),
    vscode.commands.registerCommand('mediatr-lens.refreshAnalysis', async () => {
      await analysisService.refresh();
      codeLensProvider.refresh();
    })
  );

  void analysisService.getAnalysis().then(() => codeLensProvider.refresh());
}

export function deactivate(): void {
  // no-op
}
