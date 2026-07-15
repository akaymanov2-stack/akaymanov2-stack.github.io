-- ============================================================
--  004 — снять CHECK-ограничение с case_blocks.type
--  Разрешает произвольные типы блоков (например, longreads) —
--  новые типы больше не требуют миграций, добавляются через API.
--  Рендер типа должен поддерживаться в case.js. Запускать в SQL Editor.
-- ============================================================
do $$
declare c text;
begin
  select conname into c from pg_constraint
  where conrelid = 'public.case_blocks'::regclass and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%type%';
  if c is not null then execute format('alter table public.case_blocks drop constraint %I', c); end if;
end $$;
