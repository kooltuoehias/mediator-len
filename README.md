# mediator-len

A lightweight VS Code extension for navigating between MediatR requests and handlers in C# projects.

## Features

- CodeLens above request and handler classes
- `MediatR: Go to Handler` command
- `MediatR: Go to Request` command
- Context menu navigation from C# files

## Build

```bash
npm install
npm run compile
npm run package
```

This generates a `.vsix` package for installation in VS Code or for CI artifact upload.

## CI

The repository includes a GitHub Actions workflow that builds the extension and packages a VSIX artifact.
