-- 1) lessons: 自分が予約したレッスンは見える
create policy if not exists "Trainees can view booked lessons"
on public.lessons
for select
to authenticated
using (
  exists (
    select 1 from public.bookings b
    where b.lesson_id = lessons.id
      and b.client_id = auth.uid()
  )
);

-- 2) users: 予約したレッスンの講師情報は見える
create policy if not exists "Trainees can view trainers of booked lessons"
on public.users
for select
to authenticated
using (
  exists (
    select 1
    from public.lessons l
    join public.bookings b on b.lesson_id = l.id
    where l.trainer_id = users.id
      and b.client_id = auth.uid()
  )
);

-- 3) 古いreservedを確定に寄せる（paidがあるものだけ）
update public.bookings b
set status = 'confirmed',
    payment_status = 'paid'
where b.status = 'reserved'
  and exists (
    select 1 from public.payments p
    where p.booking_id = b.id
      and p.status = 'paid'
  );