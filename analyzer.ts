
import fs from 'node:fs';
import path from 'node:path';
import { glob } from 'glob';
import type { GraphData, CodeNode, CodeLink, SupportedLanguage } from './types';

export async function analyzeProject(rootPath: string, mainLang: string): Promise<GraphData> {
  const nodes: Map<string, CodeNode> = new Map();
  const links: CodeLink[] = [];
  const classMethods: Map<string, Map<string, Map<string, string>>> = new Map();
  
  const ignorePatterns = ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**', '**/venv/**', '**/__pycache__/**', '**/target/**'];
  
  const files = await glob('**/*.{ts,tsx,js,jsx,py,java,go,rs}', { 
    cwd: rootPath, 
    ignore: ignorePatterns,
    absolute: true 
  });

  const fileRegistry = new Map<string, string>();
  const exportRegistry = new Map<string, Set<string>>();
  const importRegistry = new Map<string, Map<string, { sourceFile: string, originalName: string }>>();

  const getLang = (p: string): SupportedLanguage => {
    const ext = path.extname(p);
    if (['.ts', '.tsx'].includes(ext)) return 'typescript';
    if (['.js', '.jsx'].includes(ext)) return 'javascript';
    if (ext === '.py') return 'python';
    if (ext === '.java') return 'java';
    if (ext === '.go') return 'go';
    if (ext === '.rs') return 'rust';
    return 'typescript';
  };

  const patterns = {
    typescript: /(?:export\s+)?(?:function\s+([a-zA-Z0-9_$]+)|(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*.*=>)/g,
    javascript: /(?:export\s+)?(?:function\s+([a-zA-Z0-9_$]+)|(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*.*=>)/g,
    python: /def\s+([a-zA-Z0-9_]+)\s*\(/g,
    java: /(?:public|private|protected|static)\s+(?:[a-zA-Z0-9_<>]+\s+)?([a-zA-Z0-9_]+)\s*\(/g,
    go: /func\s+(?:\([^)]*\)\s+)?([a-zA-Z0-9_]+)\s*\(/g,
    rust: /\b(?:pub(?:\([^)]+\))?\s+)?(?:async\s+)?fn\s+([a-zA-Z0-9_]+)\s*(?:<[^>]*>)?\s*\(/g
  };

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    const relPath = path.relative(rootPath, filePath);
    const lang = getLang(filePath);
    fileRegistry.set(relPath, content);

    if (!nodes.has(relPath)) {
      nodes.set(relPath, {
        id: relPath,
        name: path.basename(relPath),
        file: relPath,
        line: 0,
        size: 12,
        color: '#ffd700',
        language: 'system',
        linesOfCode: content.split('\n').length,
        type: 'file'
      });
    }

    const fileExports = new Set<string>();
    const regex = patterns[lang] || patterns.typescript;
    const lines = content.split('\n');
    let match: RegExpExecArray | null = null;

    while (true) {
      match = regex.exec(content);
      if (!match) break;
      const name = match[1] || match[2];
      if (!name || ['if', 'for', 'while', 'switch', 'return', 'match', 'loop'].includes(name)) continue;
      
      const lineNum = content.substring(0, match.index).split('\n').length;
      const id = `${relPath}:${name}`;
      
      nodes.set(id, {
        id, name, file: relPath, line: lineNum, size: 6,
        color: lang === 'rust' ? '#dea584' : '#00ff41',
        language: lang, linesOfCode: lines.length, type: 'function'
      });

      if (match[0].includes('export')) {
        fileExports.add(name);
      }
    }
    exportRegistry.set(relPath, fileExports);

    if (lang === 'typescript' || lang === 'javascript') {
      const fileImports = new Map<string, { sourceFile: string, originalName: string }>();
      const importRegex = /import\s+(?:([a-zA-Z0-9_$]+)|(?:\{([^}]+)\})|(?:\*\s+as\s+([a-zA-Z0-9_$]+)))\s+from\s+['"]([^'"]+)['"]/g;
      
      let impMatch: RegExpExecArray | null = null;
      while (true) {
        impMatch = importRegex.exec(content);
        if (!impMatch) break;
        const defaultImport = impMatch[1];
        const namedImports = impMatch[2];
        const starImport = impMatch[3];
        const importPath = impMatch[4];

        let resolvedPath = importPath;
        if (importPath.startsWith('.')) {
          const absoluteImportPath = path.resolve(path.dirname(filePath), importPath);
          const potentialFiles = [
            absoluteImportPath,
            `${absoluteImportPath}.ts`,
            `${absoluteImportPath}.tsx`,
            `${absoluteImportPath}.js`,
            `${absoluteImportPath}.jsx`,
            path.join(absoluteImportPath, 'index.ts'),
            path.join(absoluteImportPath, 'index.js')
          ];
          
          for (const p of potentialFiles) {
            if (fs.existsSync(p) && fs.lstatSync(p).isFile()) {
              resolvedPath = path.relative(rootPath, p);
              break;
            }
          }
        }

        if (defaultImport) {
          fileImports.set(defaultImport, { sourceFile: resolvedPath, originalName: 'default' });
        }
        if (starImport) {
          fileImports.set(starImport, { sourceFile: resolvedPath, originalName: '*' });
        }
        if (namedImports) {
          for (const part of namedImports.split(',')) {
            const [orig, alias] = part.trim().split(/\s+as\s+/);
            fileImports.set(alias || orig, { sourceFile: resolvedPath, originalName: orig });
          }
        }
      }
      importRegistry.set(relPath, fileImports);
    }
  }

  for (const [importingFile, imports] of importRegistry.entries()) {
    if (!nodes.has(importingFile)) continue;

    for (const [, importMeta] of imports.entries()) {
      const targetFile = importMeta.sourceFile;
      if (!nodes.has(targetFile)) continue;

      const existingLink = links.find(
        (link) => link.source === importingFile && link.target === targetFile && link.type === 'import'
      );
      if (!existingLink) {
        links.push({
          source: importingFile,
          target: targetFile,
          value: 3,
          type: 'import'
        });
      }
    }
  }

  for (const [relPath, content] of fileRegistry.entries()) {
    const fileImports = importRegistry.get(relPath);
    const lang = getLang(relPath);

    const nodeArray = Array.from(nodes.values());
    for (const targetNode of nodeArray) {
      let isVisible = false;
      let callName = targetNode.name;

      if (targetNode.file === relPath) {
        isVisible = true;
      } else if (fileImports) {
        for (const [localName, meta] of fileImports.entries()) {
          if (meta.sourceFile === targetNode.file && (meta.originalName === targetNode.name || meta.originalName === '*')) {
            isVisible = true;
            callName = localName;
            break;
          }
        }
      }

      if (!isVisible && lang !== 'python') continue;

      const callPattern = `\\b${callName}\\s*\\(`;
      const callRegex = new RegExp(callPattern, 'g');
      let callMatch: RegExpExecArray | null = null;
      while (true) {
        callMatch = callRegex.exec(content);
        if (!callMatch) break;
        const lineNum = content.substring(0, callMatch.index).split('\n').length;
        const sourceNode = nodeArray
          .filter(n => n.file === relPath)
          .sort((a, b) => b.line - a.line)
          .find(n => n.line <= lineNum);

        if (sourceNode && sourceNode.id !== targetNode.id) {
          links.push({
            source: sourceNode.id,
            target: targetNode.id,
            value: 1,
            type: 'call'
          });
          const node = nodes.get(targetNode.id);
          if (node) node.size += 0.4;
        }
      }
    }
  }

  return { nodes: Array.from(nodes.values()), links };
}
