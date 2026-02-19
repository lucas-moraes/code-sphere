
export const COLORS = {
  primary: '#00ff41', // Matrix/Terminal Green
  background: '#0d0208', // Deep black-green
  border: '#003b00',
  text: {
    bright: '#00ff41',
    dim: '#008f11',
    dark: '#003b00'
  },
  node: {
    ts: '#00ff41', // Matrix Green
    js: '#a0ff00', // Neon Lime
    py: '#00ffff', // Cyber Cyan
    go: '#00ff9f', // Spring Green
    java: '#ccff00', // Electric Lime
    rust: '#dea584'  // Rust Bronze
  },
  link: 'rgba(0, 255, 65, 0.3)',
  particle: '#00ff41'
};

export const PARSER_CONFIG = {
  // Folders that should be strictly ignored during analysis
  ignoreDirs: ['node_modules', '.git', 'dist', 'build', 'venv', '__pycache__', 'out', 'target', '.vscode', 'coverage', 'tests', 'target'],
  // Extensions the parser is capable of reading
  supportedExtensions: ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.java', '.rs']
};
