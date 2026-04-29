import { Priority } from '@/lib/types';
const COLORS: Record<Priority, string> = { high: 'bg-red-500', medium: 'bg-amber-400', low: 'bg-green-500' };
export function PriorityDot({ priority }: { priority: Priority }) {
  return <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${COLORS[priority]}`} />;
}
