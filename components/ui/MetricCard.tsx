interface Props { label: string; value: number; color: string; }
export function MetricCard({ label, value, color }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}
