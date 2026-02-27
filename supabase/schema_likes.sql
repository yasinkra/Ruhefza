
-- POST LIKES TABLE (To track who liked what)
create table public.post_likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, post_id)
);

-- Enable RLS
alter table public.post_likes enable row level security;

-- Policies
create policy "Users can see who liked posts"
  on public.post_likes for select
  using ( auth.role() = 'authenticated' );

create policy "Users can like posts"
  on public.post_likes for insert
  with check ( auth.uid() = user_id );

create policy "Users can unlike posts"
  on public.post_likes for delete
  using ( auth.uid() = user_id );

-- Function to handle like count updates
create or replace function public.handle_new_like()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.posts
  set likes_count = likes_count + 1
  where id = new.post_id;
  return new;
end;
$$;

create or replace function public.handle_unlike()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.posts
  set likes_count = likes_count - 1
  where id = old.post_id;
  return old;
end;
$$;

-- Triggers for like count
create trigger on_like_created
  after insert on public.post_likes
  for each row execute procedure public.handle_new_like();

create trigger on_like_removed
  after delete on public.post_likes
  for each row execute procedure public.handle_unlike();
