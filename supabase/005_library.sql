-- ============================================================
--  Библиотека: таблица книг + хранилище PDF/обложек + доступы
--  Выполнить в Supabase → SQL Editor.
-- ============================================================

-- 1. Таблица книг
create table if not exists public.books (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  author      text,
  description text,
  year        int,
  tags        text[],
  cover_path  text,          -- путь к обложке в бакете library
  pdf_path    text not null, -- путь к PDF в бакете library
  sort        int default 0,
  created_at  timestamptz default now()
);

alter table public.books enable row level security;

-- Читать книги может кто угодно (публичная библиотека)
drop policy if exists "books public read" on public.books;
create policy "books public read" on public.books
  for select using (true);

-- Добавлять/менять/удалять — только вошедший владелец (роль authenticated)
drop policy if exists "books auth insert" on public.books;
create policy "books auth insert" on public.books
  for insert to authenticated with check (true);

drop policy if exists "books auth update" on public.books;
create policy "books auth update" on public.books
  for update to authenticated using (true) with check (true);

drop policy if exists "books auth delete" on public.books;
create policy "books auth delete" on public.books
  for delete to authenticated using (true);

-- 2. Хранилище файлов (публичное чтение)
insert into storage.buckets (id, name, public)
values ('library', 'library', true)
on conflict (id) do update set public = true;

-- Читать файлы библиотеки может кто угодно
drop policy if exists "library public read" on storage.objects;
create policy "library public read" on storage.objects
  for select using (bucket_id = 'library');

-- Загружать/менять/удалять файлы — только вошедший владелец
drop policy if exists "library auth insert" on storage.objects;
create policy "library auth insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'library');

drop policy if exists "library auth update" on storage.objects;
create policy "library auth update" on storage.objects
  for update to authenticated using (bucket_id = 'library') with check (bucket_id = 'library');

drop policy if exists "library auth delete" on storage.objects;
create policy "library auth delete" on storage.objects
  for delete to authenticated using (bucket_id = 'library');
