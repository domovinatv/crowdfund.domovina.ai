-- Referentni podaci (docs/09-d1-shema.md §0003_seed_reference.sql): kategorije (odluka 216).

INSERT INTO categories (key, sort, name_hr, name_en) VALUES
  ('charity',  1, 'Dobrotvorno', 'Charity'),
  ('culture',  2, 'Kultura',     'Culture'),
  ('projects', 3, 'Projekti',    'Projects'),
  ('needs',    4, 'Potrebe',     'Needs'),
  ('sport',    5, 'Sport',       'Sport'),
  ('animals',  6, 'Životinje',   'Animals'),
  ('travel',   7, 'Putovanja',   'Travel'),
  ('other',    8, 'Ostalo',      'Other');
