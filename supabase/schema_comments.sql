
-- POST COMMENTS TABLE
create table public.post_comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.post_comments enable row level security;

-- Policies
create policy "Comments are viewable by authenticated users"
  on public.post_comments for select
  using ( auth.role() = 'authenticated' );

create policy "Authenticated users can create comments"
  on public.post_comments for insert
  with check ( auth.uid() = user_id );

create policy "Users can delete their own comments"
  on public.post_comments for delete
  using ( auth.uid() = user_id );

-- Add comments_count to posts if not exists (or we just use count)
-- Ideally we add a column for performance.
-- Let's check if it exists first? No, I'll just add it and if it errors I'll ignore or the user can run it. 
-- Actually, let's just run a migration that safely adds it.
alter table public.posts add column if not exists comments_count integer default 0;

-- Functions for comment count
create or replace function public.handle_new_comment()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.posts
  set comments_count = comments_count + 1
  where id = new.post_id;
  return new;
end;
$$;

create or replace function public.handle_delete_comment()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.posts
  set comments_count = comments_count - 1
  where id = old.post_id;
  return old;
end;
$$;

-- Triggers
create trigger on_comment_created
  after insert on public.post_comments
  for each row execute procedure public.handle_new_comment();

create trigger on_comment_deleted
  after delete on public.post_comments
  for each row execute procedure public.handle_delete_comment();
