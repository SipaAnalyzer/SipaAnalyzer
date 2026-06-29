create table if not exists public.invitation_tokens (
  id uuid default gen_random_uuid() primary key,
  token text not null unique,
  role text not null,
  email text,
  created_by_id uuid not null,
  created_by_email text,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_invitation_tokens_token on public.invitation_tokens(token);

alter table public.invitation_tokens enable row level security;

create policy "admins_insert_invitations"
  on public.invitation_tokens for insert
  with check (
    exists (
      select 1 from public.user_permissions
      where user_id = auth.uid()
        and role in ('admin', 'super_admin')
    )
  );

create or replace function public.verify_invitation_token(token_text text)
returns table (valid boolean, role text, email text)
language sql
stable
security definer
as $$
  select
    (expires_at > now() and used_at is null) as valid,
    role,
    email
  from public.invitation_tokens
  where token = token_text;
$$;

create or replace function public.consume_invitation_token(token_text text)
returns boolean
language sql
security definer
as $$
  update public.invitation_tokens
  set used_at = now()
  where token = token_text
    and expires_at > now()
    and used_at is null;
  return found;
$$;
