<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# CodeSphere 3D - Visualizador de Grafo de Chamadas

Visualizador 3D de grafo de chamadas de código com estética Matrix/terminal cyberpunk.

## Executar Localmente

**Pré-requisitos:** Node.js

1. Instalar dependências:
   ```bash
   npm install
   ```

2. Rodar o app:
   ```bash
   npm run dev
   ```

3. Acesse `http://localhost:3000` no navegador

## Uso

1. Selecione a linguagem do projeto (TypeScript, Python, Rust, Go, Java)
2. Clique em "SCAN DIRECTORY" e selecione uma pasta de código
3. Visualize o grafo 3D de funções e suas chamadas
4. Use o mouse para rotacionar, zoom e clicar nos nós

## Scripts Disponíveis

- `npm run dev` - Modo desenvolvimento
- `npm run build` - Build de produção
- `npm run preview` - Preview do build

## Tecnologias

- TypeScript
- React 19
- Vite
- Three.js / react-force-graph-3d
- Express (para modo CLI)
- Tailwind CSS
