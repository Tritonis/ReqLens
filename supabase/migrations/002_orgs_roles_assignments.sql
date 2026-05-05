-- supabase/migrations/002_orgs_roles_assignments.sql

-- ─── New tables ────────────────────────────────────────────────────────────────

create table organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text unique not null,
  owner_id   uuid references auth.users(id) not null,
  created_at timestamptz default now()
);

create table org_members (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid references organizations(id) on delete cascade not null,
  user_id           uuid references auth.users(id) on delete cascade not null,
  email             text not null,
  can_upload        boolean not null default false,
  can_review        boolean not null default false,
  can_export        boolean not null default false,
  can_manage_users  boolean not null default false,
  invited_by        uuid references auth.users(id),
  joined_at         timestamptz default now(),
  unique(org_id, user_id)
);

create table org_invitations (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid references organizations(id) on delete cascade not null,
  email            text not null,
  can_upload       boolean not null default false,
  can_review       boolean not null default false,
  can_export       boolean not null default false,
  can_manage_users boolean not null default false,
  invited_by       uuid references auth.users(id) not null,
  token            uuid unique not null default gen_random_uuid(),
  expires_at       timestamptz not null,
  accepted_at      timestamptz,
  created_at       timestamptz default now()
);

create table requirement_assignments (
  id             uuid primary key default gen_random_uuid(),
  requirement_id uuid references requirements(id) on delete cascade not null,
  assignee_id    uuid references auth.users(id) on delete cascade not null,
  assigned_by    uuid references auth.users(id) not null,
  org_id         uuid references organizations(id) on delete cascade not null,
  assigned_at    timestamptz default now(),
  unique(requirement_id, assignee_id)
);

-- ─── Helper to break RLS recursion on org_members ──────────────────────────────

create or replace function get_user_org_ids(uid uuid)
returns setof uuid
language sql
security definer
stable
as $$
  select org_id from org_members where user_id = uid;
$$;

create or replace function get_admin_org_ids(uid uuid)
returns setof uuid
language sql
security definer
stable
as $$
  select org_id from org_members where user_id = uid and can_manage_users = true;
$$;

-- ─── Auto-create org on signup ─────────────────────────────────────────────────

create or replace function create_org_for_new_user()
returns trigger as $$
declare
  new_org_id uuid;
  email_prefix text;
  org_slug text;
begin
  new_org_id  := gen_random_uuid();
  email_prefix := split_part(NEW.email, '@', 1);
  org_slug     := lower(regexp_replace(email_prefix, '[^a-zA-Z0-9]', '-', 'g'))
                  || '-' || left(new_org_id::text, 6);

  insert into public.organizations (id, name, slug, owner_id)
  values (new_org_id, email_prefix, org_slug, NEW.id);

  insert into public.org_members
    (org_id, user_id, email, can_upload, can_review, can_export, can_manage_users)
  values
    (new_org_id, NEW.id, NEW.email, true, true, true, true);

  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_user_created
after insert on auth.users
for each row execute function create_org_for_new_user();

-- ─── Backfill existing users ───────────────────────────────────────────────────

do $$
declare
  u record;
  new_org_id uuid;
  email_prefix text;
  org_slug text;
begin
  for u in select id, email from auth.users loop
    new_org_id   := gen_random_uuid();
    email_prefix := split_part(u.email, '@', 1);
    org_slug     := lower(regexp_replace(email_prefix, '[^a-zA-Z0-9]', '-', 'g'))
                    || '-' || left(new_org_id::text, 6);

    insert into public.organizations (id, name, slug, owner_id)
    values (new_org_id, email_prefix, org_slug, u.id);

    insert into public.org_members
      (org_id, user_id, email, can_upload, can_review, can_export, can_manage_users)
    values
      (new_org_id, u.id, u.email, true, true, true, true);
  end loop;
end;
$$;

-- ─── Add org_id to existing tables ────────────────────────────────────────────

alter table documents add column org_id uuid references organizations(id);
alter table requirements add column org_id uuid references organizations(id);

update documents d
set org_id = (select org_id from org_members where user_id = d.user_id limit 1);

update requirements r
set org_id = (select org_id from org_members where user_id = r.user_id limit 1);

alter table documents alter column org_id set not null;
alter table requirements alter column org_id set not null;

-- ─── RLS ──────────────────────────────────────────────────────────────────────

alter table organizations        enable row level security;
alter table org_members          enable row level security;
alter table org_invitations      enable row level security;
alter table requirement_assignments enable row level security;

-- Drop old single-user policies
drop policy if exists "users own documents"    on documents;
drop policy if exists "users own requirements" on requirements;

-- organizations: readable by members
create policy "org members can read org"
  on organizations for select
  using (id in (select get_user_org_ids(auth.uid())));

-- org_members: readable by org members; writable only by can_manage_users
create policy "org members can read members"
  on org_members for select
  using (org_id in (select get_user_org_ids(auth.uid())));

create policy "org admins can manage members"
  on org_members for all
  using (org_id in (select get_admin_org_ids(auth.uid())));

-- org_invitations: can_manage_users only
create policy "org admins can manage invitations"
  on org_invitations for all
  using (org_id in (
    select org_id from org_members
    where user_id = auth.uid() and can_manage_users = true
  ));

-- documents
create policy "org members can access documents"
  on documents for all
  using (org_id in (select get_user_org_ids(auth.uid())));

-- requirements
create policy "org members can access requirements"
  on requirements for all
  using (org_id in (select get_user_org_ids(auth.uid())));

-- requirement_assignments
create policy "org members can read assignments"
  on requirement_assignments for select
  using (org_id in (select get_user_org_ids(auth.uid())));

create policy "reviewers can insert assignments"
  on requirement_assignments for insert
  with check (org_id in (
    select org_id from org_members
    where user_id = auth.uid() and can_review = true
  ));

create policy "reviewers can delete assignments"
  on requirement_assignments for delete
  using (org_id in (
    select org_id from org_members
    where user_id = auth.uid() and can_review = true
  ));
