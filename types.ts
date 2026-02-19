
export interface CodeNode {
  id: string;
  name: string;
  file: string;
  line: number;
  size: number;
  color: string;
  language: string;
  linesOfCode: number;
  type: 'function' | 'method' | 'class' | 'file' | 'library' | 'interface' | 'type';
  isType?: boolean;
  isLibrary?: boolean;
}

export interface CodeLink {
  source: string;
  target: string;
  value: number;
  type?: 'call' | 'structure' | 'import';
}

export interface GraphData {
  nodes: CodeNode[];
  links: CodeLink[];
}

export type SupportedLanguage = 'typescript' | 'javascript' | 'python' | 'go' | 'java' | 'rust';

export interface AnalysisStats {
  totalFiles: number;
  totalFunctions: number;
  totalCalls: number;
  languageDistribution: Record<string, number>;
}
