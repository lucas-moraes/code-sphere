
import { useCallback, useRef, useEffect, useMemo } from 'react';
import ForceGraph3D, { type ForceGraphMethods } from 'react-force-graph-3d';
import type { GraphData, CodeNode, CodeLink } from '../types';

interface Graph3DProps {
  data: GraphData;
  onNodeClick: (node: CodeNode) => void;
  focusedNode?: CodeNode | null;
}

type NodeWithForce = CodeNode & {
  fx?: number;
  fy?: number;
  fz?: number;
  x?: number;
  y?: number;
  z?: number;
};

type LinkWithNodes = CodeLink & {
  source: NodeWithForce | string;
  target: NodeWithForce | string;
};

const isNodeObject = (value: NodeWithForce | string): value is NodeWithForce => {
  return typeof value !== 'string';
};

const getNodeId = (value: NodeWithForce | string): string => {
  return typeof value === 'string' ? value : value.id;
};

const Graph3D: React.FC<Graph3DProps> = ({ data, onNodeClick }) => {
  const fgRef = useRef<ForceGraphMethods | null>(null);

  const folderCenters = useMemo(() => {
    const folders = new Map<string, number>();
    for (const node of data.nodes) {
      if (node.type !== 'file') continue;
      const folder = node.file.split('/').slice(0, -1).join('/') || 'root';
      if (!folders.has(folder)) folders.set(folder, folders.size);
    }

    const total = Math.max(folders.size, 1);
    const radius = Math.max(152, total * 48);
    const centers = new Map<string, { x: number; y: number; z: number }>();
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    for (const [folder, index] of folders.entries()) {
      const t = total === 1 ? 0 : index / (total - 1);
      const y = 1 - 2 * t;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const angle = goldenAngle * index;
      centers.set(folder, {
        x: Math.cos(angle) * r * radius,
        y: y * radius,
        z: Math.sin(angle) * r * radius
      });
    }

    return centers;
  }, [data.nodes]);

  const positionedData = useMemo<GraphData>(() => {
    if (folderCenters.size === 0) return data;

    const folderOffsets = new Map<string, number>();
    const fileCenters = new Map<string, { x: number; y: number; z: number }>();

    const fileNodes = data.nodes
      .filter((node) => node.type === 'file' && typeof node.file === 'string')
      .map((node) => {
        const folder = node.file.split('/').slice(0, -1).join('/') || 'root';
        const center = folderCenters.get(folder);
        if (!center) return node;

        const offsetIndex = folderOffsets.get(folder) || 0;
        folderOffsets.set(folder, offsetIndex + 1);

        const ring = Math.floor(offsetIndex / 12) + 1;
        const angle = (offsetIndex % 12) * (Math.PI / 6);
        const ringRadius = ring * 140;
        const fx = center.x + Math.cos(angle) * ringRadius;
        const fy = center.y + Math.sin(angle) * 90;
        const fz = center.z + Math.sin(angle) * ringRadius;

        fileCenters.set(node.id, { x: fx, y: fy, z: fz });

        return {
          ...node,
          fx,
          fy,
          fz
        } satisfies NodeWithForce;
      });

    const fileNodeIds = new Set(fileNodes.map((node) => node.id));
    const nodeOffsets = new Map<string, number>();

    const otherNodes = data.nodes
      .filter((node) => !fileNodeIds.has(node.id))
      .map((node) => {
        const parentCenter = fileCenters.get(node.file);
        if (!parentCenter) return node;

        const offsetIndex = nodeOffsets.get(node.file) || 0;
        nodeOffsets.set(node.file, offsetIndex + 1);

        const ring = Math.floor(offsetIndex / 14) + 1;
        const angle = (offsetIndex % 14) * (Math.PI / 7);
        const ringRadius = ring * 320;
        return {
          ...node,
          fx: parentCenter.x + Math.cos(angle) * ringRadius,
          fy: parentCenter.y + Math.sin(angle) * 220,
          fz: parentCenter.z + Math.sin(angle) * ringRadius
        } satisfies NodeWithForce;
      });

    const links = (data.links as LinkWithNodes[]).map((link) => ({
      ...link,
      source: getNodeId(link.source),
      target: getNodeId(link.target)
    }));

    return {
      nodes: [...fileNodes, ...otherNodes],
      links
    };
  }, [data, folderCenters]);

  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3Force('charge')?.strength(-150);
      fgRef.current.d3Force('link')?.distance(80);
      
      setTimeout(() => {
        if (fgRef.current) {
          fgRef.current.cameraPosition({ x: 0, y: 0, z: 500 });
        }
      }, 300);
    }
  }, []);

  const handleNodeClick = useCallback((node: NodeWithForce) => {
    if (!fgRef.current || !node) return;
    onNodeClick(node);
  }, [onNodeClick]);

  if (!data.nodes.length) {
    return (
      <div className="w-full h-full bg-[#0d0208] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#00ff41] text-lg mb-2">CODESPHERE_3D</p>
          <p className="text-[#008f11] text-sm">Selecione arquivos para visualizar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-[#0d0208]">
      <ForceGraph3D
        ref={fgRef}
        graphData={positionedData}
        warmupTicks={100}
        cooldownTicks={50}
        nodeLabel={(node: NodeWithForce) => `
          <div style="background: rgba(0,0,0,0.95); border: 1px solid ${node.type === 'file' ? '#ffd700' : '#00ff41'}; padding: 8px; font-family: monospace; font-size: 10px;">
            <div style="color: ${node.type === 'file' ? '#ffd700' : '#00ff41'}; font-weight: bold; margin-bottom: 4px;">${node.name}${node.type === 'function' || node.type === 'method' ? '()' : ''}</div>
            <div style="color: #008f11;">FILE: ${node.file}</div>
            <div style="color: #008f11;">LINE: ${node.line}</div>
            <div style="color: #003b00; margin-top: 4px; font-style: italic;">Type: ${node.type}</div>
          </div>
        `}
        nodeColor={(node: NodeWithForce) => {
          if (node.type === 'file') return '#ffd700';
          if (node.isLibrary || node.type === 'library') return '#888888';
          if (node.type === 'interface') return '#00bfff';
          if (node.type === 'type') return '#ff69b4';
          if (node.type === 'class') return '#ffa500';
          
          const colors: Record<string, string> = {
            typescript: '#00ff41',
            python: '#00ffff',
            java: '#ff00ff',
            go: '#ffff00',
            javascript: '#00ffcc',
            rust: '#dea584'
          };
          return colors[node.language] || '#00ff41';
        }}
        nodeVal={(node: NodeWithForce) => {
          if (node.type === 'file') return 12;
          if (node.isLibrary) return 4;
          if (node.type === 'interface' || node.type === 'type') return 5;
          return 8;
        }}
        nodeResolution={16}
        linkWidth={(link: LinkWithNodes) => {
          const source = isNodeObject(link.source) ? link.source : null;
          const target = isNodeObject(link.target) ? link.target : null;
          if (source?.type === 'file' && target?.type === 'file') return 3;
          return link.type === 'import' ? 2 : 1;
        }}
        linkColor={(link: LinkWithNodes) => {
          const source = isNodeObject(link.source) ? link.source : null;
          const target = isNodeObject(link.target) ? link.target : null;
          if (source?.type === 'file' && target?.type === 'file') return 'rgba(255, 215, 0, 0.8)';
          if (link.type === 'import') return 'rgba(255, 215, 0, 0.5)';
          if (link.type === 'structure') return 'rgba(0, 255, 65, 0.15)';
          return 'rgba(0, 255, 65, 0.3)';
        }}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={1}
        linkDirectionalParticles={(link: LinkWithNodes) => {
          const source = isNodeObject(link.source) ? link.source : null;
          const target = isNodeObject(link.target) ? link.target : null;
          if (source?.type === 'file' && target?.type === 'file') return 6;
          return link.type === 'import' ? 3 : 2;
        }}
        linkDirectionalParticleSpeed={0.006}
        linkDirectionalParticleWidth={(link: LinkWithNodes) => {
          const source = isNodeObject(link.source) ? link.source : null;
          const target = isNodeObject(link.target) ? link.target : null;
          if (source?.type === 'file' && target?.type === 'file') return 3;
          return 1.5;
        }}
        linkDirectionalParticleColor={(link: LinkWithNodes) => {
          const source = isNodeObject(link.source) ? link.source : null;
          const target = isNodeObject(link.target) ? link.target : null;
          if (source?.type === 'file' && target?.type === 'file') return '#ffd700';
          return link.type === 'import' ? '#ffd700' : '#00ff41';
        }}
        backgroundColor="#0d0208"
        onNodeClick={handleNodeClick}
        enableNodeDrag={true}
        enableNavigationControls={true}
      />
    </div>
  );
};

export default Graph3D;
