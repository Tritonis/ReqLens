'use client';
import Link from 'next/link';
import { useDocuments } from '@/hooks/useDocuments';

const STATUS_STYLES: Record<string, string> = {
  done: 'text-green-600 bg-green-50',
  processing: 'text-blue-600 bg-blue-50',
  error: 'text-red-600 bg-red-50',
  pending: 'text-gray-500 bg-gray-50',
};

export function RecentDocuments({ orgId }: { orgId?: string }) {
  const { documents, loading } = useDocuments(orgId);
  if (loading) return <p className="text-sm text-gray-400">Loading recent documents…</p>;
  if (documents.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-700 mb-3">Recent documents</h3>
      <div className="flex flex-col gap-2">
        {documents.map(doc => (
          <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-white">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xs uppercase text-gray-400 font-medium w-10">{doc.source_type}</span>
              <span className="text-sm text-gray-800 truncate">{doc.name}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[doc.status] ?? ''}`}>
                {doc.status}
              </span>
              {doc.status === 'done' && (
                <Link href={`/requirements?documentId=${doc.id}`} className="text-xs text-blue-600 hover:underline">
                  View {doc.req_count} reqs →
                </Link>
              )}
              {doc.status === 'error' && doc.error_msg && (
                <span className="text-xs text-red-400 truncate max-w-[8rem]" title={doc.error_msg}>
                  {doc.error_msg.slice(0, 40)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
