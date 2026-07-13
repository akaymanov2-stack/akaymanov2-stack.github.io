-- ============================================================
--  Kaymanov site — схема базы данных (Supabase / Postgres)
--  Запускать в Supabase → SQL Editor (или через supabase CLI).
-- ============================================================

-- ----- Таблица кейсов ---------------------------------------
create table if not exists public.cases (
  id          bigint generated always as identity primary key,
  category    text not null check (category in ('mp', 'perf', 'content')),
  tag         text not null,            -- "Маркетплейсы · iBOX"
  metric      text not null,            -- "+335% оборота за год"
  title       text not null,
  description text not null,
  kpis        text[] not null default '{}',   -- чипы KPI
  link_url    text,                            -- опц. ссылка "смотреть кейс →"
  link_label  text,
  sort        int  not null default 0,         -- порядок вывода
  created_at  timestamptz not null default now()
);

-- ----- Таблица видео-креативов ------------------------------
create table if not exists public.videos (
  id           bigint generated always as identity primary key,
  title        text not null,           -- "RoadScan"
  subtitle     text,                    -- "продуктовый ролик"
  storage_path text not null,           -- путь в бакете: "videos/roadscan.mp4"
  poster_path  text,                    -- опциональный постер (кадр)
  sort         int  not null default 0,
  created_at   timestamptz not null default now()
);

-- ============================================================
--  Row Level Security: публично читаем, писать может только
--  service_role (он обходит RLS) — т.е. анонимам запись закрыта.
-- ============================================================
alter table public.cases  enable row level security;
alter table public.videos enable row level security;

create policy "public read cases"  on public.cases  for select using (true);
create policy "public read videos" on public.videos for select using (true);

-- ============================================================
--  Storage: публичный бакет `media` под видео и фото.
--  Чтение — публичное (public = true), загрузка — service_role.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;
