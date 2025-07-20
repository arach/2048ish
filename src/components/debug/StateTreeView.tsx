'use client';

import { ChevronRight, ChevronDown, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface StateTreeViewProps {
  data: any;
  expandedPaths: Set<string>;
  onTogglePath: (path: string) => void;
  onCopy: (data: any, section: string) => void;
  path?: string;
}

export function StateTreeView({ 
  data, 
  expandedPaths, 
  onTogglePath, 
  onCopy,
  path = ''
}: StateTreeViewProps) {
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  
  const handleCopy = (value: any, currentPath: string) => {
    onCopy(value, currentPath);
    setCopiedPath(currentPath);
    setTimeout(() => setCopiedPath(null), 2000);
  };
  
  const renderValue = (value: any, key: string, currentPath: string): JSX.Element => {
    if (value === null) {
      return <span className="text-gray-500">null</span>;
    }
    
    if (value === undefined) {
      return <span className="text-gray-500">undefined</span>;
    }
    
    if (typeof value === 'boolean') {
      return <span className={value ? 'text-green-400' : 'text-red-400'}>{String(value)}</span>;
    }
    
    if (typeof value === 'number') {
      return <span className="text-blue-400">{value}</span>;
    }
    
    if (typeof value === 'string') {
      return <span className="text-yellow-400">"{value}"</span>;
    }
    
    if (Array.isArray(value)) {
      const isExpanded = expandedPaths.has(currentPath);
      const isEmpty = value.length === 0;
      
      return (
        <div className="inline-block">
          <span
            onClick={() => !isEmpty && onTogglePath(currentPath)}
            className={`cursor-pointer inline-flex items-center ${isEmpty ? '' : 'hover:text-white'}`}
          >
            {!isEmpty && (isExpanded ? <ChevronDown className="w-3 h-3 mr-1" /> : <ChevronRight className="w-3 h-3 mr-1" />)}
            <span className="text-gray-400">[{value.length}]</span>
          </span>
          <button
            onClick={() => handleCopy(value, currentPath)}
            className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {copiedPath === currentPath ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-gray-400 hover:text-white" />}
          </button>
          {isExpanded && !isEmpty && (
            <div className="ml-4 mt-1">
              {value.map((item, index) => (
                <div key={index} className="group py-0.5">
                  <span className="text-gray-500">{index}:</span> {renderValue(item, String(index), `${currentPath}.${index}`)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    
    if (typeof value === 'object') {
      const isExpanded = expandedPaths.has(currentPath);
      const entries = Object.entries(value);
      const isEmpty = entries.length === 0;
      
      return (
        <div className="inline-block">
          <span
            onClick={() => !isEmpty && onTogglePath(currentPath)}
            className={`cursor-pointer inline-flex items-center ${isEmpty ? '' : 'hover:text-white'}`}
          >
            {!isEmpty && (isExpanded ? <ChevronDown className="w-3 h-3 mr-1" /> : <ChevronRight className="w-3 h-3 mr-1" />)}
            <span className="text-gray-400">{`{${entries.length}}`}</span>
          </span>
          <button
            onClick={() => handleCopy(value, currentPath)}
            className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {copiedPath === currentPath ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-gray-400 hover:text-white" />}
          </button>
          {isExpanded && !isEmpty && (
            <div className="ml-4 mt-1">
              {entries.map(([k, v]) => (
                <div key={k} className="group py-0.5">
                  <span className="text-purple-400">{k}:</span> {renderValue(v, k, currentPath ? `${currentPath}.${k}` : k)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    
    return <span className="text-gray-400">{String(value)}</span>;
  };
  
  return (
    <div className="font-mono text-xs text-gray-300">
      {renderValue(data, '', path)}
    </div>
  );
}