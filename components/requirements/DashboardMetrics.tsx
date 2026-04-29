import { MetricCard } from '@/components/ui/MetricCard';
import { Requirement } from '@/lib/types';

export function DashboardMetrics({ requirements }: { requirements: Requirement[] }) {
  return (
    <div className="grid grid-cols-4 gap-3">
      <MetricCard label="Functional" value={requirements.filter(r => r.type === 'functional').length} color="text-blue-700" />
      <MetricCard label="Non-functional" value={requirements.filter(r => r.type === 'non-functional').length} color="text-purple-700" />
      <MetricCard label="Constraints" value={requirements.filter(r => r.type === 'constraint').length} color="text-amber-700" />
      <MetricCard label="Needs review" value={requirements.filter(r => r.is_ambiguous).length} color="text-red-700" />
    </div>
  );
}
