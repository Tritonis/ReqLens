import { AnalysisStatus } from '@/hooks/useAnalysis';
interface Props { status: AnalysisStatus; reqCount?: number; error?: string | null; }

export function AnalysisProgress({ status, reqCount, error }: Props) {
  if (status === 'idle') return null;
  const messages: Partial<Record<AnalysisStatus, string>> = {
    uploading: 'Uploading document…',
    processing: 'Extracting requirements with Claude…',
    done: `Done! Found ${reqCount} requirement${reqCount !== 1 ? 's' : ''}.`,
    error: `Error: ${error}`,
  };
  const styles: Partial<Record<AnalysisStatus, string>> = {
    error: 'bg-red-50 text-red-700',
    done: 'bg-green-50 text-green-700',
  };
  return (
    <div className={`rounded-lg px-4 py-3 text-sm ${styles[status] ?? 'bg-blue-50 text-blue-700'}`}>
      {(status === 'uploading' || status === 'processing') && (
        <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-2 align-middle" />
      )}
      {messages[status]}
    </div>
  );
}
