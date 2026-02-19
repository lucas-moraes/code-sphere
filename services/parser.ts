
import type { CodeNode, CodeLink, GraphData, SupportedLanguage } from '../types';

export class CodeParser {
  private nodes: Map<string, CodeNode> = new Map();
  private links: CodeLink[] = [];
  private folderColors: Map<string, string> = new Map();
  private importRegistry: Map<string, Map<string, { sourceFile: string, originalName: string }>> = new Map();
  private classMethods: Map<string, Map<string, Map<string, string>>> = new Map();
  
  private greenPalette = [
    '#00ff41', '#00ff9f', '#ccff00', '#00ffff', '#a0ff00',
    '#39ff14', '#7fff00', '#00ffcc', '#f0ff00', '#adff2f',
  ];

  private normalizePath(rawPath: string): string {
    const parts = rawPath.split(/[\\/]+/);
    const stack: string[] = [];

    for (const part of parts) {
      if (!part || part === '.') continue;
      if (part === '..') {
        stack.pop();
        continue;
      }
      stack.push(part);
    }

    return stack.join('/');
  }

  private resolveImportPath(filePath: string, importPath: string): string {
    if (!importPath.startsWith('.')) return importPath;
    const baseDir = filePath.split('/').slice(0, -1).join('/');
    return this.normalizePath(`${baseDir}/${importPath}`);
  }

  private getFolderColor(path: string): string {
    const segments = path.split(/[\\/]/);
    segments.pop();
    const folder = segments.join('/') || 'root';

    if (!this.folderColors.has(folder)) {
      const colorIdx = this.folderColors.size % this.greenPalette.length;
      this.folderColors.set(folder, this.greenPalette[colorIdx]);
    }
    const color = this.folderColors.get(folder);
    return color || this.greenPalette[0];
  }

  private generateId(file: string, name: string): string {
    return `${file}:${name}`;
  }

  async analyzeFiles(files: File[], mainLanguage: SupportedLanguage): Promise<GraphData> {
    this.nodes.clear();
    this.links = [];
    this.folderColors.clear();
    this.importRegistry.clear();
    this.classMethods.clear();

    const fileContents: Array<{ name: string; path: string; content: string; lang: SupportedLanguage }> = [];
    for (const file of files) {
      const fileWithPath = file as File & { webkitRelativePath?: string };
      fileContents.push({
        name: file.name,
        path: this.normalizePath(fileWithPath.webkitRelativePath || file.name),
        content: await file.text(),
        lang: this.detectLanguage(file.name, mainLanguage)
      });
    }

    for (const f of fileContents) {
      const folderColor = this.getFolderColor(f.path);
      this.nodes.set(f.path, {
        id: f.path, name: f.name, file: f.path, line: 0, size: 15,
        color: folderColor, language: 'system', linesOfCode: 0, type: 'file'
      });
    }

    for (const { path, content, lang } of fileContents) {
      this.extractEntities(content, path, lang);
    }

    for (const { path, content, lang } of fileContents) {
      this.extractImports(content, path, lang);
    }

    this.createFileImportLinks(fileContents.map(f => f.path));

    for (const { content, path, lang } of fileContents) {
      this.extractCalls(content, path, lang);
    }

    for (const node of Array.from(this.nodes.values())) {
      if (node.type !== 'file' && this.nodes.has(node.file)) {
        this.links.push({
          source: node.file,
          target: node.id,
          value: 2,
          type: 'structure'
        });
      }
    }

    return {
      nodes: Array.from(this.nodes.values()),
      links: this.links
    };
  }

  private detectLanguage(fileName: string, fallback: SupportedLanguage): SupportedLanguage {
    if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) return 'typescript';
    if (fileName.endsWith('.js') || fileName.endsWith('.jsx')) return 'javascript';
    if (fileName.endsWith('.py')) return 'python';
    if (fileName.endsWith('.go')) return 'go';
    if (fileName.endsWith('.java')) return 'java';
    if (fileName.endsWith('.rs')) return 'rust';
    return fallback;
  }

  private extractEntities(content: string, path: string, lang: SupportedLanguage) {
    const folderColor = this.getFolderColor(path);
    
    const patterns = {
      rust: /\b(?:pub(?:\([^)]+\))?\s+)?(?:async\s+)?fn\s+([a-zA-Z0-9_]+)\s*(?:<[^>]*>)?\s*\(/g,
      javascript: /(?:export\s+)?(?:function\s+([a-zA-Z0-9_$]+)|(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_$]+)\s*=>)/g,
      typescript: /(?:export\s+)?(?:function\s+([a-zA-Z0-9_$]+)|(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_$]+)\s*=>)/g,
      python: /def\s+([a-zA-Z0-9_]+)\s*\(/g
    };

    const regex = (patterns as Partial<Record<SupportedLanguage, RegExp>>)[lang];
    if (regex) {
      let match: RegExpExecArray | null = null;
      while (true) {
        match = regex.exec(content);
        if (!match) break;
        const name = match[1] || match[2];
        if (!name || ['if', 'while', 'for', 'loop', 'match'].includes(name)) continue;
        const lineNum = content.substring(0, match.index).split('\n').length;
        const id = this.generateId(path, name);
        this.nodes.set(id, {
          id, name, file: path, line: lineNum, size: 8,
          color: folderColor, language: lang, linesOfCode: 0, type: 'function'
        });
      }
    }

    if (lang === 'typescript' || lang === 'javascript') {
      this.extractClassMethods(content, path, lang, folderColor);
      
      if (lang === 'typescript') {
        this.extractTypeScriptTypes(content, path, folderColor);
      }
    }
  }

  private extractTypeScriptTypes(content: string, path: string, folderColor: string) {
    const interfacePattern = /(?:export\s+)?(?:interface|type)\s+([a-zA-Z0-9_$]+)/g;
    
    let match: RegExpExecArray | null = null;
    while (true) {
      match = interfacePattern.exec(content);
      if (!match) break;
      const typeName = match[1];
      const isInterface = match[0].includes('interface');
      const lineNum = content.substring(0, match.index).split('\n').length;
      const typeId = `${path}:${typeName}`;
      
      if (!this.nodes.has(typeId)) {
        this.nodes.set(typeId, {
          id: typeId,
          name: typeName,
          file: path,
          line: lineNum,
          size: 6,
          color: isInterface ? '#00bfff' : '#ff69b4',
          language: 'typescript',
          linesOfCode: 0,
          type: isInterface ? 'interface' : 'type',
          isType: true
        });
      }
    }
  }

  private extractClassMethods(content: string, path: string, lang: SupportedLanguage, folderColor: string) {
    const classPattern = /class\s+([a-zA-Z0-9_$]+)\s*(?:extends\s+[a-zA-Z0-9_$]+)?\s*\{/g;
    const methodPattern = /(?:async\s+)?(?:private\s+|protected\s+|public\s+)?(?:static\s+)?(?:async\s+)?([a-zA-Z0-9_$]+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{/g;
    
    let classMatch: RegExpExecArray | null = null;
    while (true) {
      classMatch = classPattern.exec(content);
      if (!classMatch) break;
      const className = classMatch[1];
      const classStartIdx = classMatch.index;
      
      let braceCount = 1;
      let classEndIdx = classStartIdx + classMatch[0].length;
      while (braceCount > 0 && classEndIdx < content.length) {
        if (content[classEndIdx] === '{') braceCount++;
        if (content[classEndIdx] === '}') braceCount--;
        classEndIdx++;
      }
      
      const classContent = content.substring(classStartIdx, classEndIdx);
      const classMethods = new Map<string, string>();
      
      let methodMatch: RegExpExecArray | null = null;
      while (true) {
        methodMatch = methodPattern.exec(classContent);
        if (!methodMatch) break;
        const methodName = methodMatch[1];
        const methodLine = content.substring(0, classStartIdx + methodMatch.index).split('\n').length;
        const methodId = `${path}:${className}.${methodName}`;
        
        this.nodes.set(methodId, {
          id: methodId,
          name: `${className}.${methodName}`,
          file: path,
          line: methodLine,
          size: 8,
          color: folderColor,
          language: lang,
          linesOfCode: 0,
          type: 'method'
        });
        
        classMethods.set(methodName, methodId);
      }
      
      if (!this.classMethods.has(path)) {
        this.classMethods.set(path, new Map());
      }
      const fileClassMethods = this.classMethods.get(path);
      if (fileClassMethods) {
        fileClassMethods.set(className, classMethods);
      }
    }
  }

  private extractImports(content: string, path: string, lang: SupportedLanguage) {
    if (lang !== 'typescript' && lang !== 'javascript') return;

    const fileImports = new Map<string, { sourceFile: string, originalName: string }>();
    const importRegex = /import\s+(?:([a-zA-Z0-9_$]+)|(?:\{([^}]+)\})|(?:\*\s+as\s+([a-zA-Z0-9_$]+)))\s+from\s+['"]([^'"]+)['"]/g;
    
    let match: RegExpExecArray | null = null;
    while (true) {
      match = importRegex.exec(content);
      if (!match) break;
      const defaultImport = match[1];
      const namedImports = match[2];
      const starImport = match[3];
      const importPath = match[4];

      const resolvedPath = this.resolveImportPath(path, importPath);

      if (defaultImport) fileImports.set(defaultImport, { sourceFile: resolvedPath, originalName: 'default' });
      if (starImport) fileImports.set(starImport, { sourceFile: resolvedPath, originalName: '*' });
      if (namedImports) {
        for (const p of namedImports.split(',')) {
          const [orig, alias] = p.trim().split(/\s+as\s+/);
          fileImports.set(alias || orig, { sourceFile: resolvedPath, originalName: orig });
        }
      }
    }
    this.importRegistry.set(path, fileImports);
  }

  private extractCalls(content: string, path: string, lang: SupportedLanguage) {
    const nodeArray = Array.from(this.nodes.values());
    const fileImports = this.importRegistry.get(path);

    const allNodes = Array.from(this.nodes.values());

    for (const targetNode of allNodes) {
      if (targetNode.type === 'file') continue;

      let isVisible = targetNode.file === path;
      let callName = targetNode.name;

      if (!isVisible && fileImports) {
        for (const [localName, meta] of fileImports.entries()) {
          const targetBaseName = targetNode.file.replace(/\.(ts|js)x?$/, '').split('/').pop();
          const importBaseName = meta.sourceFile.replace(/\.(ts|js)x?$/, '').split('/').pop();
          
          if (targetBaseName === importBaseName || targetNode.file.includes(meta.sourceFile)) {
            if (meta.originalName === '*' || meta.originalName === targetNode.name) {
              isVisible = true;
              callName = localName;
              break;
            }
          }
        }
      }

      if (!isVisible && lang !== 'python') continue;

      const callPattern = `\\b${callName}\\s*\\(`;
      const callRegex = new RegExp(callPattern, 'g');
      let match: RegExpExecArray | null = null;
      while (true) {
        match = callRegex.exec(content);
        if (!match) break;
        const currentLine = content.substring(0, match.index).split('\n').length;
        const sourceNode = this.findEnclosingEntity(path, currentLine);
        
        if (sourceNode && sourceNode.id !== targetNode.id) {
          const existingLink = this.links.find(
            l => l.source === sourceNode.id && l.target === targetNode.id
          );
          if (!existingLink) {
            this.links.push({ 
              source: sourceNode.id, 
              target: targetNode.id, 
              value: 1,
              type: 'call'
            });
            const node = this.nodes.get(targetNode.id);
            if (node) node.size += 0.3;
          }
        }
      }
    }
  }

  private findEnclosingEntity(path: string, line: number): CodeNode | null {
    return Array.from(this.nodes.values())
      .filter(n => n.file === path && n.type !== 'file')
      .sort((a, b) => b.line - a.line)
      .find(n => n.line <= line) || null;
  }

  private createFileImportLinks(filePaths: string[]) {
    const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '.d.ts', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];

    for (const [importingFile, imports] of this.importRegistry) {
      if (!this.nodes.has(importingFile)) continue;

      for (const [, importMeta] of imports) {
        const resolvedPath = importMeta.sourceFile;
        
        for (const ext of extensions) {
          const targetPath = resolvedPath + ext;
          if (this.nodes.has(targetPath)) {
            const existingLink = this.links.find(
              l => l.source === importingFile && l.target === targetPath
            );
            if (!existingLink) {
              this.links.push({
                source: importingFile,
                target: targetPath,
                value: 3,
                type: 'import'
              });
            }
            break;
          }
        }
      }
    }
  }
}
export const parser = new CodeParser();
