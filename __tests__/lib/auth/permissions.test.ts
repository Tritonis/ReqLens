import { getOrgMember } from '@/lib/auth/permissions';

function mockSupabase(result: object | null) {
  const chain = { select: jest.fn(), eq: jest.fn(), single: jest.fn() };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.single.mockResolvedValue({ data: result, error: null });
  return { from: jest.fn().mockReturnValue(chain) };
}

test('returns null when user is not a member', async () => {
  const supabase = mockSupabase(null);
  const result = await getOrgMember(supabase as any, 'user1', 'org1');
  expect(result).toBeNull();
});

test('returns member permissions when found', async () => {
  const member = {
    org_id: 'org1', user_id: 'user1',
    can_upload: true, can_review: true, can_export: false, can_manage_users: false,
  };
  const supabase = mockSupabase(member);
  const result = await getOrgMember(supabase as any, 'user1', 'org1');
  expect(result).toEqual(member);
});
