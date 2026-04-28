jest.mock('@supabase/ssr');
import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@/lib/supabase/client';

beforeEach(() => {
  (createBrowserClient as jest.Mock).mockReturnValue({ auth: {} });
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
});

test('creates browser client with env vars', () => {
  createClient();
  expect(createBrowserClient).toHaveBeenCalledWith('https://test.supabase.co', 'test-anon-key');
});
