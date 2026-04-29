import { Requirement } from '@/lib/types';
import { RequirementCard } from './RequirementCard';

interface Props { requirements: Requirement[]; selectedId: string | null; onSelect: (r: Requirement) => void; loading: boolean; }

export function RequirementsList({ requirements, selectedId, onSelect, loading }: Props) {
  if (loading) return <div className="flex-1 flex items-center justify-center text-sm text-gray-400">Loading…</div>;
  if (requirements.length === 0) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-400 py-16">
      <span className="text-3xl">□</span>
      <p className="text-sm">No requirements found</p>
    </div>
  );
  return (
    <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
      {requirements.map(req => (
        <RequirementCard key={req.id} requirement={req} isSelected={req.id === selectedId} onClick={() => onSelect(req)} />
      ))}
    </div>
  );
}
