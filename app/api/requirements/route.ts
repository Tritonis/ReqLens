import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const documentId = searchParams.get('documentId');
  const type = searchParams.get('type');
  const priority = searchParams.get('priority');
  const ambiguous = searchParams.get('ambiguous');

  let query = supabase.from('requirements').select('*')
    .eq('user_id', user.id).order('created_at', { ascending: true });

  if (documentId) query = query.eq('document_id', documentId);
  if (type && type !== 'all') query = query.eq('type', type);
  if (priority) query = query.eq('priority', priority);
  if (ambiguous === 'true') query = query.eq('is_ambiguous', true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
