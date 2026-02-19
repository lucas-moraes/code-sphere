
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { startServer } from './server';
import { analyzeProject } from './analyzer';
import pc from 'picocolors';
// Fix for Error: Property 'argv' does not exist on type 'Process' and Property 'exit' does not exist on type 'Process'
import process from 'process';

const argv = yargs(hideBin(process.argv))
  .usage('Usage: $0 <path> [language]')
  .command('$0 <path> [language]', 'Analyze a project directory', (y) => {
    return y
      .positional('path', { describe: 'Path to project directory', type: 'string', demandOption: true })
      .positional('language', { describe: 'Primary language', type: 'string', default: 'typescript' });
  })
  .help()
  .parseSync();

async function bootstrap() {
  const projectPath = argv.path as string;
  const mainLang = argv.language as string;

  console.log(pc.green(`\n[CodeSphere 3D] Initializing Scan...`));
  console.log(pc.dim(`Target: ${projectPath}`));
  console.log(pc.dim(`Language: ${mainLang}\n`));

  try {
    const graphData = await analyzeProject(projectPath, mainLang);
    console.log(pc.green(`✔ Analysis complete. Found ${graphData.nodes.length} nodes and ${graphData.links.length} connections.`));
    
    startServer(graphData, projectPath);
  } catch (err) {
    console.error(pc.red(`✖ Fatal Error during analysis: ${err}`));
    process.exit(1);
  }
}

bootstrap();
