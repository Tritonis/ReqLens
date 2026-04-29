'use client';
import { useCallback, useState } from 'react';

interface Props { onFile: (file: File) => void; }

export function DropZone({ onFile }: Props) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }, [onFile]);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onClick={() => document.getElementById('file-input')?.click()}
      className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer
        ${isDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
    >
      <input id="file-input" type="file" accept=".pdf,.docx,.doc,.txt,.md,.xlsx,.xls" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3 text-2xl">↑</div>
      <p className="font-medium text-gray-800">Drop documents here</p>
      <p className="text-sm text-gray-500 mt-1">or click to browse</p>
      <div className="flex gap-2 justify-center flex-wrap mt-4">
        {['PDF', 'DOCX', 'TXT', 'MD', 'XLSX'].map(t => (
          <span key={t} className="text-xs px-2 py-1 rounded-full border border-gray-200 text-gray-500">{t}</span>
        ))}
      </div>
    </div>
  );
}
