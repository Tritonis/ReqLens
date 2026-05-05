import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgMember } from '@/lib/auth/permissions';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const membership = await getOrgMember(supabase, user.id, params.id);
  if (!membership?.can_manage_users) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data, error } = await supabase
    .from('org_invitations')
    .select('id, email, can_upload, can_review, can_export, can_manage_users, expires_at, accepted_at, created_at')
    .eq('org_id', params.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const membership = await getOrgMember(supabase, user.id, params.id);
  if (!membership?.can_manage_users) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { email, can_upload = false, can_review = false, can_export = false, can_manage_users = false } = await req.json();
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

  const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('org_invitations')
    .insert({ org_id: params.id, email, can_upload, can_review, can_export, can_manage_users, invited_by: user.id, expires_at })
    .select('token').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/invite/${data.token}`;
  return NextResponse.json({ inviteUrl });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const membership = await getOrgMember(supabase, user.id, params.id);
  if (!membership?.can_manage_users) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { invitationId } = await req.json();
  const { error } = await supabase
    .from('org_invitations').delete().eq('id', invitationId).eq('org_id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
