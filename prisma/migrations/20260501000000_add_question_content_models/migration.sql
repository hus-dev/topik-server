CREATE TABLE `question_passages` (
  `id` VARCHAR(36) NOT NULL,
  `title` VARCHAR(255) NULL,
  `content` TEXT NOT NULL,
  `translation` TEXT NULL,
  `created_at` BIGINT NOT NULL,
  `updated_at` BIGINT NOT NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `questions` (
  `id` VARCHAR(36) NOT NULL,
  `set_id` VARCHAR(36) NULL,
  `passage_id` VARCHAR(36) NULL,
  `section` VARCHAR(20) NOT NULL,
  `question_type` VARCHAR(50) NOT NULL,
  `question_number` INTEGER NOT NULL,
  `level` TINYINT NULL,
  `prompt` VARCHAR(4000) NOT NULL,
  `correct_answer` VARCHAR(1000) NULL,
  `explanation` VARCHAR(4000) NULL,
  `ai_explanation` VARCHAR(4000) NULL,
  `difficulty` TINYINT NULL,
  `time_limit_seconds` INTEGER NULL,
  `is_ai_generated` TINYINT NOT NULL DEFAULT 0,
  `is_downloaded` TINYINT NOT NULL DEFAULT 0,
  `created_at` BIGINT NOT NULL,
  `updated_at` BIGINT NOT NULL,

  INDEX `set_id`(`set_id`),
  INDEX `passage_id`(`passage_id`),
  INDEX `idx_questions_section_type_level`(`section`, `question_type`, `level`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `question_options` (
  `id` VARCHAR(36) NOT NULL,
  `question_id` VARCHAR(36) NOT NULL,
  `option_number` INTEGER NOT NULL,
  `content` VARCHAR(1000) NOT NULL,
  `is_correct` TINYINT NOT NULL DEFAULT 0,

  UNIQUE INDEX `uq_question_options_question_number`(`question_id`, `option_number`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `question_media` (
  `id` VARCHAR(36) NOT NULL,
  `question_id` VARCHAR(36) NOT NULL,
  `media_type` VARCHAR(20) NOT NULL,
  `url` VARCHAR(500) NOT NULL,
  `duration_seconds` INTEGER NULL,
  `transcript` VARCHAR(4000) NULL,
  `sort_order` INTEGER NOT NULL DEFAULT 1,
  `created_at` BIGINT NOT NULL,
  `updated_at` BIGINT NOT NULL,

  INDEX `question_id`(`question_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `questions`
  ADD CONSTRAINT `questions_ibfk_1` FOREIGN KEY (`set_id`) REFERENCES `question_sets`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `questions_ibfk_2` FOREIGN KEY (`passage_id`) REFERENCES `question_passages`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE `question_options`
  ADD CONSTRAINT `question_options_ibfk_1` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE `question_media`
  ADD CONSTRAINT `question_media_ibfk_1` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE `answers`
  ADD INDEX `question_id`(`question_id`),
  ADD CONSTRAINT `answers_ibfk_2` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
