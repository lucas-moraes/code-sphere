
import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Graph3D from './components/Graph3D';
import { parser } from './services/parser';
import { GraphData, SupportedLanguage, AnalysisStats, CodeNode } from './types';
import { PARSER_CONFIG } from './constants';

const App: React.FC = () => {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [stats, setStats] = useState<AnalysisStats | null>(null);
  const [selectedNode, setSelectedNode] = useState<CodeNode | null>(null);
  const [focusedNode, setFocusedNode] = useState<CodeNode | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    const fetchRemoteData = async () => {
      try {
        const response = await fetch('/api/graph');
        if (response.ok) {
          const data = await response.json();
          setGraphData(data);
          updateStats(data);
        }
      } catch (e) {
        console.log("No remote API found, switching to local upload mode.");
      }
    };
    fetchRemoteData();
  }, []);

  const updateStats = (data: GraphData) => {
    const langDist: Record<string, number> = {};
    const functionNodes = data.nodes.filter(n => n.type !== 'file');
    
    data.nodes.forEach(n => {
      langDist[n.language] = (langDist[n.language] || 0) + 1;
    });

    setStats({
      totalFiles: new Set(data.nodes.map(n => n.file)).size,
      totalFunctions: functionNodes.length,
      totalCalls: data.links.filter(l => l.type === 'call').length,
      languageDistribution: langDist
    });
  };

  const handleFilesSelected = useCallback(async (fileList: FileList, lang: SupportedLanguage) => {
    setIsAnalyzing(true);
    try {
      const files = Array.from(fileList).filter(f => {
        const path = f.webkitRelativePath || f.name;
        return !PARSER_CONFIG.ignoreDirs.some(d => path.includes(d)) && 
               PARSER_CONFIG.supportedExtensions.some(ext => path.endsWith(ext));
      });

      const data = await parser.analyzeFiles(files, lang);
      setGraphData(data);
      updateStats(data);
    } catch (error) {
      alert('SYS_ERR: AST_SCAN_FAILURE');
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const handleNodeFocus = useCallback((node: CodeNode) => {
    setSelectedNode(node);
    setFocusedNode(node);
    setTimeout(() => setFocusedNode(null), 100);
  }, []);

  return (
    <div className="flex w-full h-screen bg-[#0d0208] overflow-hidden font-mono text-[#00ff41]">
      <Sidebar 
        onFilesSelected={handleFilesSelected} 
        stats={stats} 
        selectedNode={selectedNode}
        isAnalyzing={isAnalyzing}
        graphData={graphData}
        onNodeFocus={handleNodeFocus}
      />
      
      <main className="flex-1 relative">
        {graphData.nodes.length > 0 ? (
          <Graph3D 
            data={graphData} 
            onNodeClick={setSelectedNode} 
            focusedNode={focusedNode}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center animate-pulse">
              <h1 className="text-4xl font-bold tracking-[0.5em] mb-4">CODESPHERE_3D</h1>
              <p className="text-xs text-[#008f11]">READY_FOR_DATA_STREAM...</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
