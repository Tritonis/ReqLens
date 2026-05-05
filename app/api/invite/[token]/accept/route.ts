import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(_req: NextRequest, { params }: { params: { token: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: invite, error: ie } = await supabase
    .from('org_invitations')
    .select('*').eq('token', params.token).single();

  if (ie || !invite) return NextResponse.json({ error: 'Invalid invitation' }, { status: 404 });
  if (invite.accepted_at) return NextResponse.json({ error: 'Already accepted' }, { status: 410 });
  if (new Date(invite.expires_at) < new Date()) return NextResponse.json({ error: 'Expired' }, { status: 410 });
  if (user.email !== invite.email) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { error: me } = await supabase.from('org_members').insert({
    org_id: invite.org_id,
    user_id: user.id,
    email: user.email,
    can_upload: invite.can_upload,
    can_review: invite.can_review,
    can_export: invite.can_export,
    can_manage_users: invite.can_manage_users,
    invited_by: invite.invited_by,
  });

  if (me) return NextResponse.json({ error: me.message }, { status: 500 });

  await supabase.from('org_invitations')
    .update({ accepted_at: new Date().toISOString() }).eq('id', invite.id);

  return NextResponse.json({ orgId: invite.org_id });
}
