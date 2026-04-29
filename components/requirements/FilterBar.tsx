'use client';
import { FilterChip } from '@/components/ui/FilterChip';
import { RequirementType } from '@/lib/types';

const TYPE_FILTERS: Array<{ value: RequirementType | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'functional', label: 'Functional' },
  { value: 'non-functional', label: 'Non-functional' },
  { value: 'constraint', label: 'Constraints' },
  { value: 'ambiguous', label: 'Ambiguous' },
];

interface Props {
  activeType: RequirementType | 'all';
  showAmbiguous: boolean;
  onTypeChange: (t: RequirementType | 'all') => void;
  onAmbiguousToggle: () => void;
}

export function FilterBar({ activeType, showAmbiguous, onTypeChange, onAmbiguousToggle }: Props) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {TYPE_FILTERS.map(({ value, label }) => (
        <FilterChip key={value} label={label} active={activeType === value} onClick={() => onTypeChange(value)} />
      ))}
      <div className="w-px h-4 bg-gray-200 mx-1" />
      <FilterChip label="Needs review" active={showAmbiguous} onClick={onAmbiguousToggle} />
    </div>
  );
}
