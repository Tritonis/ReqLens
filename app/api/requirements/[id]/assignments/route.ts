import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgMember } from '@/lib/auth/permissions';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orgId = req.headers.get('x-org-id');
  if (!orgId) return NextResponse.json({ error: 'x-org-id header required' }, { status: 400 });

  const membership = await getOrgMember(supabase, user.id, orgId);
  if (!membership?.can_review) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data, error } = await supabase
    .from('requirement_assignments')
    .select('id, assignee_id, assigned_by, assigned_at')
    .eq('requirement_id', params.id)
    .eq('org_id', orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) return NextResponse.json([]);

  const assigneeIds = data.map(a => a.assignee_id);
  const { data: members } = await supabase
    .from('org_members')
    .select('user_id, email')
    .eq('org_id', orgId)
    .in('user_id', assigneeIds);

  const emailMap = Object.fromEntries((members ?? []).map(m => [m.user_id, m.email]));

  const assignments = data.map(a => ({
    id: a.id,
    assignee_id: a.assignee_id,
    email: emailMap[a.assignee_id] ?? '',
    assigned_by: a.assigned_by,
    assigned_at: a.assigned_at,
  }));

  return NextResponse.json(assignments);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orgId = req.headers.get('x-org-id');
  if (!orgId) return NextResponse.json({ error: 'x-org-id header required' }, { status: 400 });

  const membership = await getOrgMember(supabase, user.id, orgId);
  if (!membership?.can_review) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { assignee_id } = await req.json();
  if (!assignee_id) return NextResponse.json({ error: 'assignee_id required' }, { status: 400 });

  // Validate assignee is an org member
  const assigneeMembership = await getOrgMember(supabase, assignee_id, orgId);
  if (!assigneeMembership) return NextResponse.json({ error: 'Assignee is not a member of this org' }, { status: 400 });

  const { data, error } = await supabase
    .from('requirement_assignments')
    .insert({ requirement_id: params.id, assignee_id, assigned_by: user.id, org_id: orgId })
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
