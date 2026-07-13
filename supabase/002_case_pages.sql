-- ============================================================
--  002 — детальные страницы кейсов
--  Добавляет cases.slug (адрес) + cases.cover_path (обложка)
--  и таблицу case_blocks (гибкий контент: текст/фото/видео/…).
--  Запускать в Supabase → SQL Editor ПОСЛЕ schema.sql и seed.sql.
-- ============================================================

alter table public.cases add column if not exists slug       text;
alter table public.cases add column if not exists cover_path text;

-- слаги для уже существующих кейсов (по уникальному tag)
update public.cases set slug = 'ibox-marketplaces' where tag = 'Маркетплейсы · iBOX'    and slug is null;
update public.cases set slug = 'qunits'            where tag = 'Маркетплейсы · Кьюнитс'  and slug is null;
update public.cases set slug = 'ibox-influence'    where tag = 'Инфлюэнс · iBOX'          and slug is null;
update public.cases set slug = 'ibox-content'      where tag = 'Контент · iBOX'           and slug is null;
update public.cases set slug = 'ibox-smm'          where tag = 'SMM · iBOX'               and slug is null;
update public.cases set slug = 'valentine'         where tag = 'Performance · Valentine'  and slug is null;
update public.cases set slug = 'rosmark'           where tag = 'Performance · РОСМАРК'    and slug is null;
update public.cases set slug = 'borge'             where tag = 'Performance · BORGE'      and slug is null;
update public.cases set slug = 'sskomplekt'        where tag = 'Performance · ССКомплект' and slug is null;
update public.cases set slug = 'knopik'            where tag = 'Performance · Кнопик'     and slug is null;

alter table public.cases alter column slug set not null;
create unique index if not exists cases_slug_key on public.cases(slug);

-- ----- Блоки контента кейса ---------------------------------
-- Каждая строка — блок страницы кейса. Поле data (jsonb) зависит от type:
--   heading → {"text": "..."}
--   text    → {"text": "абзац\n\nвторой абзац"}
--   image   → {"path": "cases/ibox/1.jpg", "caption": "..."}
--   video   → {"path": "videos/x.mp4", "poster": "posters/x.jpg", "caption": "..."}
--   gallery → {"images": ["cases/ibox/a.jpg", "cases/ibox/b.jpg"]}
--   quote   → {"text": "...", "author": "..."}
-- Пути к медиа — внутри бакета `media`.
create table if not exists public.case_blocks (
  id         bigint generated always as identity primary key,
  case_id    bigint not null references public.cases(id) on delete cascade,
  sort       int  not null default 0,
  type       text not null check (type in ('heading','text','image','video','gallery','quote')),
  data       jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists case_blocks_case_idx on public.case_blocks(case_id, sort);

alter table public.case_blocks enable row level security;
create policy "public read case_blocks" on public.case_blocks for select using (true);
