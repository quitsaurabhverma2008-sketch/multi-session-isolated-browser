import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Tag, Hash, FileCode } from 'lucide-react';

interface DomTreeNode {
  tagName: string;
  id?: string;
  className?: string;
  attributes: Record<string, string>;
  children: DomTreeNode[];
  textContent?: string;
}

interface DomTreeViewerProps {
  rawHtml: string;
}

export const DomTreeViewer: React.FC<DomTreeViewerProps> = ({ rawHtml }) => {
  const [selectedNode, setSelectedNode] = useState<DomTreeNode | null>(null);

  // Parse HTML string into DOM structure using browser DOMParser
  const parseHtmlToTree = (htmlStr: string): DomTreeNode | null => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlStr, 'text/html');
      return domElementToNode(doc.documentElement);
    } catch (e) {
      return null;
    }
  };

  const domElementToNode = (el: Element): DomTreeNode => {
    const attrs: Record<string, string> = {};
    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes[i];
      attrs[attr.name] = attr.value;
    }

    const children: DomTreeNode[] = [];
    for (let i = 0; i < el.children.length; i++) {
      children.push(domElementToNode(el.children[i]));
    }

    // Direct text content (excluding child tags)
    let directText = '';
    el.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
        directText += ' ' + node.textContent.trim();
      }
    });

    return {
      tagName: el.tagName.toLowerCase(),
      id: el.id || undefined,
      className: el.className || undefined,
      attributes: attrs,
      children,
      textContent: directText.trim() || undefined
    };
  };

  const treeRoot = parseHtmlToTree(rawHtml);

  return (
    <div className="h-full flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-800 bg-[#010409] font-mono text-xs">
      {/* Tree Left Side */}
      <div className="flex-1 overflow-auto p-3 space-y-0.5 select-none bg-[#010409]">
        {treeRoot ? (
          <TreeNodeItem 
            node={treeRoot} 
            depth={0} 
            selectedNode={selectedNode} 
            onSelectNode={setSelectedNode} 
          />
        ) : (
          <div className="p-4 text-slate-500 italic">No DOM tree available</div>
        )}
      </div>

      {/* Selected Node Inspector Details Right Side */}
      <div className="w-full md:w-64 p-4 bg-[#0d1117] overflow-y-auto shrink-0 space-y-4 border-l border-slate-800">
        <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
          <span className="font-semibold text-slate-300 uppercase tracking-wider text-[10px]">Element Inspector</span>
          {selectedNode && (
            <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 font-mono text-[10px]">
              &lt;{selectedNode.tagName}&gt;
            </span>
          )}
        </div>

        {selectedNode ? (
          <div className="space-y-3">
            <div>
              <span className="text-slate-400 text-[10px] block mb-1">Tag Name:</span>
              <span className="text-blue-400 font-bold">&lt;{selectedNode.tagName}&gt;</span>
            </div>

            {selectedNode.id && (
              <div>
                <span className="text-slate-400 text-[10px] block mb-1">Element ID:</span>
                <span className="text-orange-300 font-mono bg-[#010409] px-2 py-1 rounded border border-slate-800 block truncate">
                  #{selectedNode.id}
                </span>
              </div>
            )}

            {selectedNode.className && (
              <div>
                <span className="text-slate-400 text-[10px] block mb-1">Classes:</span>
                <div className="text-slate-300 font-mono bg-[#010409] p-2 rounded border border-slate-800 text-[10px] break-all max-h-24 overflow-y-auto">
                  {selectedNode.className}
                </div>
              </div>
            )}

            {selectedNode.textContent && (
              <div>
                <span className="text-slate-400 text-[10px] block mb-1">Inner Text:</span>
                <div className="text-slate-200 bg-[#010409] p-2 rounded border border-slate-800 text-[10px] max-h-24 overflow-y-auto">
                  "{selectedNode.textContent}"
                </div>
              </div>
            )}

            <div>
              <span className="text-slate-400 text-[10px] block mb-1">Attributes ({Object.keys(selectedNode.attributes).length}):</span>
              <div className="space-y-1 bg-[#010409] p-2 rounded border border-slate-800 max-h-36 overflow-y-auto">
                {Object.entries(selectedNode.attributes).map(([key, val]) => (
                  <div key={key} className="text-[10px] truncate">
                    <span className="text-orange-300">{key}=</span>
                    <span className="text-green-400">"{val}"</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-slate-500 italic text-[11px] text-center py-6">
            Click any node in the DOM tree on the left to inspect its live attributes and properties.
          </div>
        )}
      </div>
    </div>
  );
};

interface TreeNodeItemProps {
  node: DomTreeNode;
  depth: number;
  selectedNode: DomTreeNode | null;
  onSelectNode: (node: DomTreeNode) => void;
}

const TreeNodeItem: React.FC<TreeNodeItemProps> = ({
  node,
  depth,
  selectedNode,
  onSelectNode
}) => {
  const [expanded, setExpanded] = useState(depth < 3);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedNode === node;

  return (
    <div>
      <div 
        onClick={() => onSelectNode(node)}
        style={{ paddingLeft: `${depth * 14 + 4}px` }}
        className={`flex items-center space-x-1.5 py-1 px-1.5 rounded cursor-pointer transition-colors ${
          isSelected ? 'bg-sky-900/30 text-white border border-sky-500/40' : 'hover:bg-slate-900/50 text-slate-300'
        }`}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="p-0.5 text-slate-500 hover:text-white"
          >
            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
        ) : (
          <span className="w-4"></span>
        )}

        <Tag className="w-3 h-3 text-blue-400 shrink-0" />
        
        <span className="font-bold text-blue-400">&lt;{node.tagName}&gt;</span>

        {node.id && (
          <span className="text-orange-300 truncate max-w-[120px]">
            #{node.id}
          </span>
        )}

        {node.className && (
          <span className="text-slate-500 text-[10px] truncate max-w-[140px]">
            .{node.className.split(' ').slice(0, 2).join('.')}
          </span>
        )}

        {hasChildren && !expanded && (
          <span className="text-[9px] px-1 rounded bg-slate-800 text-slate-400">
            +{node.children.length}
          </span>
        )}
      </div>

      {hasChildren && expanded && (
        <div>
          {node.children.map((child, idx) => (
            <TreeNodeItem
              key={idx}
              node={child}
              depth={depth + 1}
              selectedNode={selectedNode}
              onSelectNode={onSelectNode}
            />
          ))}
        </div>
      )}
    </div>
  );
};
