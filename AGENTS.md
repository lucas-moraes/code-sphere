# AGENTS.md - CodeSphere 3D

## Project Overview
A 3D code call graph visualizer with a Matrix/cyberpunk terminal aesthetic. Built with TypeScript, React 19, Vite, and Express.

## Build Commands

```bash
# Install dependencies
npm install

# Run development server (Vite)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

**Note**: No test framework, linter, or formatter is currently configured.

## Code Style Guidelines

### TypeScript Configuration
- **Target**: ES2022
- **Module**: ESNext with bundler resolution
- **JSX**: react-jsx transform
- **Decorators**: Experimental decorators enabled
- **Strict**: Enabled (isolatedModules, force module detection)

### Import Conventions
```typescript
// External libraries first
import React, { useState, useEffect } from 'react';
import express from 'express';

// Internal absolute imports (using @ alias)
import { GraphData } from '@/types';
import { COLORS } from '@/constants';

// Internal relative imports
import Sidebar from './components/Sidebar';
import { parser } from './services/parser';
```

### Naming Conventions
- **Components**: PascalCase (e.g., `Graph3D`, `Sidebar`)
- **Interfaces/Types**: PascalCase (e.g., `CodeNode`, `GraphData`)
- **Props interfaces**: Suffix with `Props` (e.g., `Graph3DProps`, `SidebarProps`)
- **Functions/Variables**: camelCase (e.g., `handleNodeClick`, `isAnalyzing`)
- **Constants**: UPPER_CASE or PascalCase for objects (e.g., `COLORS`, `PARSER_CONFIG`)
- **Classes**: PascalCase (e.g., `CodeParser`)

### Formatting
- **Indentation**: 2 spaces
- **Quotes**: Single quotes for strings
- **Semicolons**: Optional (omitted preferred)
- **Line length**: No strict limit, but keep readable

### React Patterns
- Use functional components with hooks
- Props destructuring in function parameters
- Callbacks wrapped in `useCallback`
- Memoized values with `useMemo` when needed
- Refs with `useRef` for DOM elements and 3D graph references

```typescript
const Component: React.FC<ComponentProps> = ({ prop1, prop2 }) => {
  const [state, setState] = useState(initialValue);
  const ref = useRef<HTMLElement>(null);
  
  const handleClick = useCallback(() => {
    // handler logic
  }, [dependencies]);
  
  return <div onClick={handleClick}>{prop1}</div>;
};
```

### Error Handling
- Use try/catch for async operations
- Console errors for debugging
- User-friendly alerts for fatal errors
- Always clean up resources in finally blocks

```typescript
try {
  const data = await analyzeProject(path);
  setGraphData(data);
} catch (error) {
  console.error('Analysis failed:', error);
  alert('SYS_ERR: AST_SCAN_FAILURE');
} finally {
  setIsAnalyzing(false);
}
```

### Type Definitions
- Define all types in `types.ts`
- Use explicit return types for public functions
- Prefer interfaces over type aliases for objects
- Use union types for finite sets of values

```typescript
export interface CodeNode {
  id: string;
  name: string;
  file: string;
  line: number;
  size: number;
  color: string;
  language: string;
  linesOfCode: number;
  type: 'function' | 'method' | 'class' | 'file';
}

export type SupportedLanguage = 'typescript' | 'javascript' | 'python' | 'go' | 'java' | 'rust';
```

### File Organization
```
/
├── components/          # React components
│   ├── Graph3D.tsx
│   └── Sidebar.tsx
├── services/           # Business logic
│   └── parser.ts
├── types.ts           # TypeScript definitions
├── constants.tsx      # Constants & config
├── App.tsx           # Main app component
├── index.tsx         # React entry point
├── cli.ts            # CLI entry point
├── server.ts         # Express server
├── analyzer.ts       # Server-side analysis
├── vite.config.ts    # Vite configuration
└── tsconfig.json     # TypeScript configuration
```

### Styling
- Tailwind CSS for all styling
- Matrix theme: greens (#00ff41) on black (#0d0208)
- Font: Monospace (Courier New)
- Custom scrollbar styling in index.html

### Environment Variables
- No environment variables required for basic functionality
- Optional: Use `.env.local` for local development if needed
- Access via `process.env.VAR_NAME` (defined in vite.config.ts)

### Git
- No pre-commit hooks configured
- Standard .gitignore for Node.js projects
- Do not commit: node_modules, dist, .env files

### Additional Notes
- Supports multiple languages: TypeScript, JavaScript, Python, Go, Java, Rust
- Uses react-force-graph-3d for visualization
- CLI mode starts Express server on port 3000
- Browser mode uses esm.sh CDN imports
