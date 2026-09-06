export interface IsolatedSession {
  id: string;
  name: string;
  color: string;
  createdAt: number;
  cookies: Record<string, string>;
  localStorageData: Record<string, string>;
  currentUrl: string;
  history: string[];
  historyIndex: number;
}

export interface DomMutationEvent {
  id: string;
  timestamp: number;
  reason: 'initial' | 'mutation' | 'input' | 'submit' | 'navigation' | 'click' | 'storage';
  url: string;
  title: string;
  nodeCount: number;
  summary: string;
}

export interface InspectorState {
  rawHtml: string;
  formattedHtml: string;
  pageTitle: string;
  pageUrl: string;
  nodeCount: number;
  lastUpdated: number;
  activeElement: string | null;
  history: DomMutationEvent[];
}

export type ViewportMode = 'responsive' | 'desktop' | 'laptop' | 'tablet' | 'mobile';

export type InspectorTab = 'source' | 'tree' | 'mutations' | 'storage';

export interface SandboxPreset {
  id: string;
  title: string;
  description: string;
  category: string;
  initialUrl: string;
  iconName: string;
  badge: string;
}
