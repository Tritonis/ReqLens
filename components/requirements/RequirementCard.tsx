import { Requirement } from '@/lib/types';
import { PriorityDot } from '@/components/ui/PriorityDot';

const TYPE_COLORS: Record<string, string> = {
  functional: 'bg-blue-50 text-blue-800',
  'non-functional': 'bg-purple-50 text-purple-800',
  constraint: 'bg-amber-50 text-amber-800',
  ambiguous: 'bg-red-50 text-red-800',
};

interface Props { requirement: Requirement; isSelected: boolean; onClick: () => void; }

export function RequirementCard({ requirement: r, isSelected, onClick }: Props) {
  return (
    <div onClick={onClick}
      className={`flex gap-3 items-start p-3 rounded-lg border cursor-pointer transition-all
        ${isSelected ? 'border-2 border-blue-400 bg-blue-50/30' : 'border-gray-100 hover:border-gray-200 bg-white'}`}>
      <PriorityDot priority={r.priority} />
      <span className="text-xs font-medium text-blue-600 whitespace-nowrap mt-0.5">{r.req_id}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 leading-relaxed mb-2 line-clamp-2">{r.text}</p>
        <div className="flex gap-1.5 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLORS[r.type] ?? ''}`}>{r.type}</span>
          {r.category && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-50 text-gray-600">{r.category}</span>}
          {r.is_ambiguous && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-700">needs review</span>}
        </div>
      </div>
    </div>
  );
}
