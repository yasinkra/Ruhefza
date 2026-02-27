
-- ARTICLES TABLE
create table public.articles (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  summary text not null,
  content text not null, -- Markdown content
  image_url text,
  category text,
  author_id uuid not null references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.articles enable row level security;

-- Policies
create policy "Articles are viewable by everyone"
  on public.articles for select
  using ( true );

-- Only teachers (or admins/specific roles if we had them) can insert/update
-- For now, let's allow any authenticated user to create for simplicity in testing, 
-- effectively making it a community wiki. 
-- In a real app we'd restrict check ( auth.uid() in (select id from profiles where role = 'teacher') )
create policy "Authenticated users can create articles"
  on public.articles for insert
  with check ( auth.role() = 'authenticated' );

create policy "Users can update their own articles"
  on public.articles for update
  using ( auth.uid() = author_id );

-- Insert some dummy data for testing (optional, user can run this block)
-- insert into public.articles (title, summary, content, author_id, category)
-- values ('Otizm Nedir?', 'Otizm spektrum bozukluğu hakkında genel bilgiler.', '# Otizm Nedir?\n\nOtizm spektrum bozukluğu...', [USER_UUID], 'Otizm');
