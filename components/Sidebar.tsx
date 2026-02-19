
import React, { useRef, useState, useMemo } from 'react';
import { SupportedLanguage, AnalysisStats, CodeNode, GraphData } from '../types';
import { Terminal, Upload, Cpu, Search } from 'lucide-react';

interface SidebarProps {
  onFilesSelected: (files: FileList, lang: SupportedLanguage) => void;
  stats: AnalysisStats | null;
  selectedNode: CodeNode | null;
  isAnalyzing: boolean;
  graphData: GraphData;
  onNodeFocus: (node: CodeNode) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  onFilesSelected, 
  stats, 
  selectedNode, 
  isAnalyzing, 
  graphData,
  onNodeFocus 
}) => {
  const dirInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lang, setLang] = useState<SupportedLanguage>('typescript');
  const [searchTerm, setSearchTerm] = useState('');

  const handleDirClick = () => dirInputRef.current?.click();
  const handleFileClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files, lang);
    }
  };

  const filteredNodes = useMemo(() => {
    if (!searchTerm.trim() || !graphData.nodes) return [];
    const term = searchTerm.toLowerCase();
    return graphData.nodes
      .filter(n => n.name.toLowerCase().includes(term) || n.file.toLowerCase().includes(term))
      .slice(0, 50); 
  }, [searchTerm, graphData.nodes]);

  return (
    <div className="w-80 h-screen bg-[#0d0208] border-r border-[#003b00] flex flex-col z-10 font-mono">
      <div className="p-6 border-b border-[#003b00]">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-[#003b00] rounded-sm">
            <Terminal className="w-6 h-6 text-[#00ff41]" />
          </div>
          <h1 className="text-xl font-bold text-[#00ff41] tracking-tighter uppercase">CodeSphere <span className="animate-pulse">_</span></h1>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="text-[10px] font-bold text-[#008f11] uppercase tracking-widest mb-2 block">/root/language_config</span>
            <select 
              value={lang}
              onChange={(e) => setLang(e.target.value as SupportedLanguage)}
              className="w-full bg-black border border-[#003b00] text-[#00ff41] text-xs p-2.5 focus:outline-none focus:border-[#00ff41] cursor-pointer appearance-none"
            >
              <option value="typescript">TYPE_SCRIPT</option>
              <option value="python">PYTHON_ENV</option>
              <option value="rust">RUST_CARGO</option>
              <option value="go">GOLANG_X</option>
              <option value="java">JAVA_RUNTIME</option>
            </select>
          </label>

          <div className="grid grid-cols-1 gap-2">
            <input 
              type="file" 
              ref={dirInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              {...({ webkitdirectory: "true" } as any)} 
              multiple 
            />
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple />
            
            <button
              onClick={handleDirClick}
              disabled={isAnalyzing}
              className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold transition-all border ${
                isAnalyzing 
                ? 'bg-black text-[#003b00] border-[#003b00]' 
                : 'bg-black text-[#00ff41] border-[#008f11] hover:bg-[#003b00] hover:text-white'
              }`}
            >
              <Upload className="w-4 h-4" />
              SCAN_DIRECTORY
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <section className="space-y-4">
          <h3 className="text-[10px] font-bold text-[#008f11] uppercase tracking-widest flex items-center gap-2">
            {">"} LOCATE_ENTITY
          </h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#003b00]" />
            <input
              type="text"
              placeholder="SEARCH..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black border border-[#003b00] text-[#00ff41] text-xs py-2.5 pl-10 pr-4 focus:outline-none focus:border-[#00ff41] placeholder:text-[#003b00]"
            />
          </div>
          
          {searchTerm.trim() && (
            <div className="space-y-1 max-h-60 overflow-y-auto border border-[#003b00] bg-black/50">
              {filteredNodes.map(node => (
                <button
                  key={node.id}
                  onClick={() => onNodeFocus(node)}
                  className="w-full text-left p-2 hover:bg-[#00ff41]/10 border-b border-[#003b00] group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Cpu className="w-3 h-3 text-[#00ff41]" />
                    <span className="text-[10px] font-bold text-[#00ff41] truncate">
                      {node.name}
                    </span>
                  </div>
                  <div className="text-[9px] text-[#003b00] truncate uppercase">
                    {node.file.split('/').pop()}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {stats && (
          <section className="space-y-4">
            <h3 className="text-[10px] font-bold text-[#008f11] uppercase tracking-widest flex items-center gap-2">
              {">"} SYS_STATS
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center bg-[#001500] p-2 border-l-2 border-[#00ff41]">
                <span className="text-[10px] text-[#008f11]">FILES:</span>
                <span className="text-sm font-bold text-[#00ff41]">{stats.totalFiles}</span>
              </div>
              <div className="flex justify-between items-center bg-[#001500] p-2 border-l-2 border-[#00ff41]">
                <span className="text-[10px] text-[#008f11]">FUNCTIONS:</span>
                <span className="text-sm font-bold text-[#00ff41]">{stats.totalFunctions}</span>
              </div>
              <div className="flex justify-between items-center bg-[#001500] p-2 border-l-2 border-[#00ff41]">
                <span className="text-[10px] text-[#008f11]">CALLS:</span>
                <span className="text-sm font-bold text-[#00ff41]">{stats.totalCalls}</span>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
