-- 0010_s10.sql — S10 (paritet obrazaca organizatora, agent obrazaca). Ne mijenja 0001–0009.
-- Primijenjena je na lokalni D1 (wrangler je pamti kao izvedenu): nove izmjene idu u 0011, ne ovamo.

-- 1. Naslovnica kasice (paritet A24): ista tema iz 15 kao `campaign_settings.cover_theme` (odluka 216).
--    NULL = kasica preuzima naslovnicu kampanje. `cover_file_id` (vlastita fotografija) ostaje neiskorišten bez R2.
ALTER TABLE moneyboxes ADD COLUMN cover_theme TEXT
  CHECK (cover_theme IS NULL OR cover_theme IN ('birthday','charity','general','dream','event','gift','memory','needs',
                                                'animals','project','repairs','school','sports','travel','treatment'));
