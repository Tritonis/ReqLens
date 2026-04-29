create table documents (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  name         text not null,
  source_type  text not null check (source_type in ('pdf','docx','txt','md','xlsx','paste')),
  storage_path text,
  raw_text     text,
  status       text not null default 'pending'
               check (status in ('pending','processing','done','error')),
  error_msg    text,
  page_count   int,
  req_count    int default 0,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create table requirements (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid references documents(id) on delete cascade not null,
  user_id      uuid references auth.users(id) on delete cascade not null,
  req_id       text not null,
  text         text not null,
  source_quote text,
  source_page  int,
  type         text not null check (type in ('functional','non-functional','constraint','ambiguous')),
  category     text,
  priority     text check (priority in ('high','medium','low')),
  confidence   numeric(4,3),
  is_ambiguous boolean default false,
  notes        text,
  status       text default 'open' check (status in ('open','reviewed','exported','rejected')),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create index on requirements (document_id, type);
create index on requirements (document_id, priority);
create index on requirements (user_id, created_at desc);

create or replace function generate_req_id()
returns trigger as $$
declare seq int;
begin
  select count(*) + 1 into seq from requirements where document_id = NEW.document_id;
  NEW.req_id := 'REQ-' || lpad(seq::text, 3, '0');
  return NEW;
end;
$$ language plpgsql;

create trigger set_req_id
before insert on requirements
for each row execute function generate_req_id();

alter table documents enable row level security;
alter table requirements enable row level security;

create policy "users own documents" on documents for all using (auth.uid() = user_id);
create policy "users own requirements" on requirements for all using (auth.uid() = user_id);
