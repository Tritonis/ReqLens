import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgMember } from '@/lib/auth/permissions';

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orgId = req.headers.get('x-org-id');
  if (!orgId) return NextResponse.json({ error: 'x-org-id header required' }, { status: 400 });

  const membership = await getOrgMember(supabase, user.id, orgId);
  if (!membership?.can_review) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const documentId  = searchParams.get('documentId');
  const type        = searchParams.get('type');
  const priority    = searchParams.get('priority');
  const ambiguous   = searchParams.get('ambiguous');
  const assignedToMe = searchParams.get('assignedToMe');

  let query = supabase.from('requirements').select('*')
    .eq('org_id', orgId).order('created_at', { ascending: true });

  if (documentId)  query = query.eq('document_id', documentId);
  if (type && type !== 'all') query = query.eq('type', type);
  if (priority)    query = query.eq('priority', priority);
  if (ambiguous === 'true') query = query.eq('is_ambiguous', true);

  if (assignedToMe === 'true') {
    const { data: assignments } = await supabase
      .from('requirement_assignments')
      .select('requirement_id').eq('assignee_id', user.id).eq('org_id', orgId);
    const ids = (assignments ?? []).map((a: { requirement_id: string }) => a.requirement_id);
    if (ids.length === 0) return NextResponse.json([]);
    query = query.in('id', ids);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
