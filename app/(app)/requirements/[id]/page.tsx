import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { ConfidenceBar } from '@/components/ui/ConfidenceBar';
import { Topbar } from '@/components/layout/Topbar';

export default async function RequirementDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: req } = await supabase.from('requirements').select('*').eq('id', params.id).single();
  if (!req) notFound();

  return (
    <div className="flex flex-col flex-1">
      <Topbar title={req.req_id} />
      <main className="p-6 max-w-2xl space-y-4">
        <p className="text-base text-gray-800 leading-relaxed">{req.text}</p>
        {req.source_quote && (
          <blockquote className="border-l-2 border-blue-300 pl-3 text-sm text-gray-500 italic">{req.source_quote}</blockquote>
        )}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Confidence:</span>
          <ConfidenceBar value={req.confidence} />
          <span>{Math.round(req.confidence * 100)}%</span>
        </div>
      </main>
    </div>
  );
}
