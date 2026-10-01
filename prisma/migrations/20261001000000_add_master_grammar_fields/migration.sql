-- AlterTable
ALTER TABLE `grammar_items`
  ADD COLUMN `level` TINYINT NULL,
  ADD COLUMN `category` VARCHAR(100) NULL,
  ADD COLUMN `meaning_ko` VARCHAR(1000) NULL,
  ADD COLUMN `meaning_uz` VARCHAR(1000) NULL,
  ADD COLUMN `meaning_ru` VARCHAR(1000) NULL,
  ADD COLUMN `meaning_en` VARCHAR(1000) NULL,
  ADD COLUMN `explanation_ko` TEXT NULL,
  ADD COLUMN `explanation_uz` TEXT NULL,
  ADD COLUMN `explanation_ru` TEXT NULL,
  ADD COLUMN `explanation_en` TEXT NULL,
  ADD COLUMN `conjugation_rule` VARCHAR(1000) NULL,
  ADD COLUMN `comparisons_json` JSON NULL,
  ADD COLUMN `quizzes_json` JSON NULL;
