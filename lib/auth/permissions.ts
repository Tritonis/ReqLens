import { SupabaseClient } from '@supabase/supabase-js';

export interface OrgMemberPermissions {
  org_id: string;
  user_id: string;
  can_upload: boolean;
  can_review: boolean;
  can_export: boolean;
  can_manage_users: boolean;
}

export async function getOrgMember(
  supabase: SupabaseClient,
  userId: string,
  orgId: string
): Promise<OrgMemberPermissions | null> {
  const { data } = await supabase
    .from('org_members')
    .select('org_id, user_id, can_upload, can_review, can_export, can_manage_users')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .single();
  return data ?? null;
}
