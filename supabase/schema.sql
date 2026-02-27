

-- PROFILES TABLE
create table public.profiles (
  id uuid not null references auth.users on delete cascade primary key,
  full_name text,
  avatar_url text,
  role text check (role in ('parent', 'teacher')),
  special_note text, -- Stores 'child needs' for parents or 'specialization' for teachers
  bio text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Profiles policies
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using ( true );

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile"
  on public.profiles for update
  using ( auth.uid() = id );

-- POSTS TABLE
create table public.posts (
  id uuid default gen_random_uuid() primary key,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  is_anonymous boolean default false,
  likes_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on posts
alter table public.posts enable row level security;

-- Posts policies
create policy "Posts are viewable by authenticated users"
  on public.posts for select
  using ( auth.role() = 'authenticated' );

create policy "Authenticated users can create posts"
  on public.posts for insert
  with check ( auth.uid() = author_id );

-- MESSAGES TABLE
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on messages
alter table public.messages enable row level security;

-- Messages policies
create policy "Users can read their own messages"
  on public.messages for select
  using ( auth.uid() = sender_id or auth.uid() = receiver_id );

create policy "Users can send messages"
  on public.messages for insert
  with check ( auth.uid() = sender_id );

-- TRIGGERS
-- Auto-create profile on signup (Optional, but good for consistency)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'avatar_url');
  return new;
end;
$$;

-- Trigger execution
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
