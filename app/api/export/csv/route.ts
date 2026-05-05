import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requirementsToCsv } from '@/lib/export/csv';
import { getOrgMember } from '@/lib/auth/permissions';

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orgId = req.headers.get('x-org-id');
  if (!orgId) return NextResponse.json({ error: 'x-org-id header required' }, { status: 400 });

  const membership = await getOrgMember(supabase, user.id, orgId);
  if (!membership?.can_export) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const documentId = new URL(req.url).searchParams.get('documentId');
  if (!documentId) return NextResponse.json({ error: 'documentId required' }, { status: 400 });

  const { data: reqs, error } = await supabase
    .from('requirements').select('*')
    .eq('document_id', documentId).eq('org_id', orgId).order('created_at');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const csv = requirementsToCsv(reqs ?? []);
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="requirements-${documentId}.csv"`,
    },
  });
}
