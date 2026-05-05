import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('org_invitations')
    .select('id, email, can_upload, can_review, can_export, can_manage_users, expires_at, accepted_at, org_id, organizations(name)')
    .eq('token', params.token)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Invalid invitation' }, { status: 404 });
  if (data.accepted_at) return NextResponse.json({ error: 'Invitation already accepted' }, { status: 410 });
  if (new Date(data.expires_at) < new Date()) return NextResponse.json({ error: 'Invitation expired' }, { status: 410 });

  return NextResponse.json(data);
}
