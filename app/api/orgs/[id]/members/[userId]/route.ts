import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgMember } from '@/lib/auth/permissions';

type Params = { params: { id: string; userId: string } };

export async function PATCH(req: NextRequest, { params }: Params) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const membership = await getOrgMember(supabase, user.id, params.id);
  if (!membership?.can_manage_users) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const allowed = ['can_upload', 'can_review', 'can_export', 'can_manage_users'];
  const update = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));

  const { error } = await supabase
    .from('org_members').update(update)
    .eq('org_id', params.id).eq('user_id', params.userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const membership = await getOrgMember(supabase, user.id, params.id);
  if (!membership?.can_manage_users) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Prevent removing org owner
  const { data: org } = await supabase
    .from('organizations').select('owner_id').eq('id', params.id).single();
  if (org?.owner_id === params.userId) {
    return NextResponse.json({ error: 'Cannot remove the org owner' }, { status: 400 });
  }

  const { error } = await supabase
    .from('org_members').delete()
    .eq('org_id', params.id).eq('user_id', params.userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
