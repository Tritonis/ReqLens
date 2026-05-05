import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('org_members')
    .select('can_upload, can_review, can_export, can_manage_users, organizations(id, name, slug, owner_id, created_at)')
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgs = (data ?? []).map((row: any) => ({
    ...row.organizations,
    member: {
      can_upload: row.can_upload,
      can_review: row.can_review,
      can_export: row.can_export,
      can_manage_users: row.can_manage_users,
    },
  }));

  return NextResponse.json(orgs);
}
