-- ============================================================
--  003 — новые типы блоков (metrics, table) + наполнение кейса Валентайна
--  Данные взяты из дашборда PowerBI (Google Ads, июль–октябрь 2019).
--  Запускать в Supabase → SQL Editor ПОСЛЕ 002_case_pages.sql.
-- ============================================================

-- 1) Разрешаем новые типы блоков (metrics = плитки-KPI, table = таблица)
do $$
declare c text;
begin
  select conname into c from pg_constraint
  where conrelid = 'public.case_blocks'::regclass and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%type%';
  if c is not null then execute format('alter table public.case_blocks drop constraint %I', c); end if;
end $$;
alter table public.case_blocks add constraint case_blocks_type_check
  check (type in ('heading','text','image','video','gallery','quote','metrics','table'));

-- 2) Чистим прежние блоки Валентайна (идемпотентно) и наполняем заново
delete from public.case_blocks
where case_id = (select id from public.cases where slug = 'valentine');

with c as (select id from public.cases where slug = 'valentine')
insert into public.case_blocks (case_id, sort, type, data)
select c.id, v.sort, v.type, v.data::jsonb
from c, (values
  (10, 'heading', $j${"text":"Результаты рекламной кампании"}$j$),
  (20, 'text',    $j${"text":"Google Ads: спец-кампания по категориям замороженной выпечки и ретаргетинг. Период — июль–октябрь 2019. Сквозная аналитика на PowerBI + Owox: считали и прямые (last-click), и ассоциированные конверсии."}$j$),
  (30, 'metrics', $j${"items":[{"value":"537","label":"прямых конверсий (last-click)"},{"value":"+150","label":"ассоциированных конверсий"},{"value":"324 ₽","label":"CPA · −46% к целевому"},{"value":"169 450 ₽","label":"бюджет · июль–окт 2019"}]}$j$),
  (40, 'heading', $j${"text":"Топ-категории по конверсиям"}$j$),
  (50, 'table',   $j${"columns":["Категория","Конверсии","CPA","Расход"],"rows":[["Замороженная выпечка","145","320 ₽","46 465 ₽"],["Ретаргетинг","82","173 ₽","14 213 ₽"],["Чизкейки","75","320 ₽","23 963 ₽"],["Замороженные десерты","43","304 ₽","13 064 ₽"],["Замороженный хлеб","41","343 ₽","14 052 ₽"],["Новинки","36","457 ₽","16 443 ₽"],["Тесто для пиццы","30","433 ₽","12 981 ₽"],["Замороженные слойки","29","302 ₽","8 762 ₽"]],"caption":"Данные PowerBI · Google Ads · 05.07–17.10.2019"}$j$),
  (60, 'heading', $j${"text":"Как приходили заявки"}$j$),
  (70, 'metrics', $j${"items":[{"value":"239","label":"чат менеджеру"},{"value":"213","label":"звонок"},{"value":"15","label":"обратный звонок"},{"value":"12","label":"email"}]}$j$),
  (72, 'heading', $j${"text":"Данные из PowerBI"}$j$),
  (74, 'image',   $j${"path":"cases/valentine/powerbi-direct.jpg","caption":"Дашборд Google Ads: прямые (last-click) конверсии по категориям"}$j$),
  (76, 'image',   $j${"path":"cases/valentine/powerbi-assisted.jpg","caption":"Сводка: ассоциированные + прямые конверсии, CPAas 247 ₽"}$j$),
  (80, 'text',    $j${"text":"Сузили семантику до целевых запросов, сместили бюджет в ретаргетинг и топ-категории (выпечка, чизкейки, десерты). Итог кампании — CPA на 46% ниже целевого при росте числа заявок. В связке с общей перестройкой digital-стратегии это дало рост выручки клиента до +300%."}$j$)
) as v(sort, type, data);
