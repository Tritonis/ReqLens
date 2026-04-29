'use client';
interface Props { value: string; onChange: (v: string) => void; }

export function PasteBox({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-2 h-full">
      <label className="text-sm font-medium text-gray-700">Or paste text</label>
      <textarea value={value} onChange={e => onChange(e.target.value)}
        placeholder="Paste requirements document text here…"
        className="flex-1 min-h-[200px] px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400" />
    </div>
  );
}
