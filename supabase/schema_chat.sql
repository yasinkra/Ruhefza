
-- Helper function to get unique conversations for a user
-- This is complex because we need the latest message from each unique counterpart
create or replace function public.get_conversations(current_user_id uuid)
returns table (
  user_id uuid,
  full_name text,
  avatar_url text,
  last_message text,
  last_message_at timestamp with time zone,
  unread_count bigint
)
language plpgsql
security definer
as $$
begin
  return query
  with last_messages as (
    select distinct on (
      case when sender_id = current_user_id then receiver_id else sender_id end
    )
      case when sender_id = current_user_id then receiver_id else sender_id end as partner_id,
      content,
      created_at,
      sender_id
    from public.messages
    where sender_id = current_user_id or receiver_id = current_user_id
    order by 
      case when sender_id = current_user_id then receiver_id else sender_id end,
      created_at desc
  ),
  unread_counts as (
    select
      sender_id,
      count(*) as count
    from public.messages
    where receiver_id = current_user_id and is_read = false
    group by sender_id
  )
  select
    p.id as user_id,
    p.full_name,
    p.avatar_url,
    lm.content as last_message,
    lm.created_at as last_message_at,
    coalesce(uc.count, 0) as unread_count
  from last_messages lm
  join public.profiles p on p.id = lm.partner_id
  left join unread_counts uc on uc.sender_id = p.id
  order by lm.created_at desc;
end;
$$;
