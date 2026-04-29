'use client';
import { ExtractionOptions as Options } from '@/lib/types';
interface Props { value: Options; onChange: (o: Options) => void; }

export function ExtractionOptions({ value, onChange }: Props) {
  const toggle = (key: keyof Options) => onChange({ ...value, [key]: !value[key] });
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700">Extract</p>
      <div className="flex gap-4">
        {([['functional', 'Functional'], ['nonFunctional', 'Non-functional'], ['constraints', 'Constraints']] as const).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={value[key]} onChange={() => toggle(key)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            {label}
          </label>
        ))}
      </div>
    </div>
  );
}
