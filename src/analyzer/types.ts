export interface Registration {
  Implementation: string;
  File: string | null;
  Line: number | null;
}

export interface HandlerRegistration {
  Handler: string;
  File: string | null;
  Line: number | null;
}

export interface NamedTypeLocation {
  Name: string;
  File: string | null;
  Line: number | null;
}

export interface RequestEntry {
  RequestChain: NamedTypeLocation[];
  Handlers: HandlerRegistration[];
}

export interface AnalyzerOutput {
  DIRegistrations: Record<string, Registration[]>;
  MediatRHandlers: Record<string, RequestEntry>;
}
