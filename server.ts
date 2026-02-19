
import express from 'express';
import path from 'path';
import open from 'open';
import { GraphData } from './types';
// Fix for Error: Cannot find name '__dirname'. In ES modules, __dirname is not defined.
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function startServer(data: GraphData, projectPath: string) {
  const app = express();
  const port = 3000;

  // Endpoint para os dados do grafo
  app.get('/api/graph', (req, res) => {
    res.json(data);
  });

  // Serve os arquivos estáticos da build (assumindo que estão no mesmo diretório)
  app.use(express.static(__dirname));

  app.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log(`\n🚀 Codesphere Visualization active at: ${url}`);
    console.log(`📡 Press Ctrl+C to stop the server\n`);
    open(url);
  });
}
