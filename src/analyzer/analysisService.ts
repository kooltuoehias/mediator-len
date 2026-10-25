import * as cp from 'child_process';
import * as vscode from 'vscode';
import { AnalyzerOutput, RequestEntry, HandlerRegistration } from './types';

function getAnalyzerProjectPath(): string | undefined {
  return vscode.workspace.getConfiguration('mediatrLens').get<string>('analyzerProjectPath');
}

async function pickAmong(files: vscode.Uri[], placeHolder: string): Promise<string | undefined> {
  if (files.length === 0) return undefined;
  if (files.length === 1) return files[0].fsPath;

  return vscode.window.showQuickPick(
    files.map((uri) => uri.fsPath),
    { placeHolder }
  );
}

async function resolveSolutionPath(): Promise<string | undefined> {
  const configured = vscode.workspace.getConfiguration('mediatrLens').get<string>('solutionPath');
  if (configured) {
    return configured;
  }

  const exclude = '**/{bin,obj,node_modules}/**';

  const slnFiles = await vscode.workspace.findFiles('**/*.sln', exclude, 10);
  const pickedSln = await pickAmong(slnFiles, 'Multiple .sln files found, pick one to analyze');
  if (pickedSln) {
    return pickedSln;
  }

  const csprojFiles = await vscode.workspace.findFiles('**/*.csproj', exclude, 10);
  return pickAmong(csprojFiles, 'Multiple .csproj files found, pick one to analyze');
}

function runAnalyzer(analyzerProjectPath: string, solutionPath: string): Promise<AnalyzerOutput> {
  return new Promise((resolve, reject) => {
    const child = cp.spawn('dotnet', ['run', '--project', analyzerProjectPath, '--', solutionPath], {
      cwd: analyzerProjectPath
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      reject(new Error(`MediatR Lens: failed to start analyzer process: ${error.message}`));
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`MediatR Lens: analyzer exited with code ${code}.\n${stderr}`));
        return;
      }

      try {
        resolve(JSON.parse(stdout) as AnalyzerOutput);
      } catch (error) {
        reject(new Error(`MediatR Lens: could not parse analyzer output as JSON.\n${stderr}`));
      }
    });
  });
}

export class AnalysisService {
  private cached: AnalyzerOutput | undefined;
  private pending: Promise<AnalyzerOutput> | undefined;

  private requestNameIndex = new Map<string, RequestEntry[]>();
  private handlerNameIndex = new Map<string, { entry: RequestEntry; handler: HandlerRegistration }[]>();

  public async getAnalysis(): Promise<AnalyzerOutput | undefined> {
    if (this.cached) {
      return this.cached;
    }
    return this.refresh();
  }

  public async refresh(): Promise<AnalyzerOutput | undefined> {
    if (this.pending) {
      return this.pending;
    }

    const analyzerProjectPath = getAnalyzerProjectPath();
    if (!analyzerProjectPath) {
      vscode.window.showWarningMessage('MediatR Lens: set "mediatrLens.analyzerProjectPath" in settings.');
      return undefined;
    }

    const solutionPath = await resolveSolutionPath();
    if (!solutionPath) {
      vscode.window.showWarningMessage('MediatR Lens: no .sln or .csproj file found in the open workspace.');
      return undefined;
    }

    this.pending = runAnalyzer(analyzerProjectPath, solutionPath);

    try {
      const result = await this.pending;
      this.cached = result;
      this.buildIndexes(result);
      return result;
    } catch (error) {
      vscode.window.showErrorMessage(error instanceof Error ? error.message : String(error));
      return undefined;
    } finally {
      this.pending = undefined;
    }
  }

  private buildIndexes(output: AnalyzerOutput): void {
    this.requestNameIndex.clear();
    this.handlerNameIndex.clear();

    for (const entry of Object.values(output.MediatRHandlers)) {
      for (const node of entry.RequestChain) {
        const nameWithoutGenerics = node.Name.replace(/<.*>$/, '');
        const simpleName = nameWithoutGenerics.split('.').pop() ?? nameWithoutGenerics;

        this.addToIndex(this.requestNameIndex, node.Name, entry);
        this.addToIndex(this.requestNameIndex, nameWithoutGenerics, entry);
        this.addToIndex(this.requestNameIndex, simpleName, entry);
      }

      for (const handler of entry.Handlers) {
        const list = this.handlerNameIndex.get(handler.Handler) ?? [];
        list.push({ entry, handler });
        this.handlerNameIndex.set(handler.Handler, list);
      }
    }
  }

  private addToIndex(index: Map<string, RequestEntry[]>, key: string, entry: RequestEntry): void {
    const list = index.get(key) ?? [];
    if (!list.includes(entry)) {
      list.push(entry);
    }
    index.set(key, list);
  }

  public isKnownRequestName(className: string): boolean {
    return this.requestNameIndex.has(className);
  }

  public isKnownHandlerName(className: string): boolean {
    return this.handlerNameIndex.has(className);
  }

  public findEntriesForRequestName(className: string): RequestEntry[] {
    return this.requestNameIndex.get(className) ?? [];
  }

  public findHandlerMatchesForHandlerName(
    className: string
  ): { entry: RequestEntry; handler: HandlerRegistration }[] {
    return this.handlerNameIndex.get(className) ?? [];
  }
}

export const analysisService = new AnalysisService();
