CREATE TABLE `users` (
  `id` VARCHAR(36) NOT NULL,
  `email` VARCHAR(255) NULL,
  `password_hash` VARCHAR(255) NULL,
  `provider` VARCHAR(20) NOT NULL,
  `provider_id` VARCHAR(191) NULL,
  `nickname` VARCHAR(100) NOT NULL,
  `target_level` TINYINT NOT NULL,
  `language_code` VARCHAR(10) NOT NULL,
  `timezone` VARCHAR(100) NOT NULL,
  `timer_mode` VARCHAR(20) NOT NULL,
  `font_scale` DECIMAL(3, 2) NOT NULL DEFAULT 1.00,
  `theme_color` VARCHAR(30) NOT NULL DEFAULT 'mint',
  `home_layout` TINYINT NOT NULL DEFAULT 1,
  `practice_layout` TINYINT NOT NULL DEFAULT 1,
  `created_at` BIGINT NOT NULL,
  `updated_at` BIGINT NOT NULL,

  UNIQUE INDEX `uq_users_provider_pid`(`provider`, `provider_id`),
  INDEX `idx_users_email`(`email`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `question_sets` (
  `id` VARCHAR(36) NOT NULL,
  `title` VARCHAR(255) NULL,
  `section` VARCHAR(20) NOT NULL,
  `level` TINYINT NOT NULL,
  `created_at` BIGINT NOT NULL,
  `updated_at` BIGINT NOT NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `exam_sessions` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `mode` VARCHAR(20) NOT NULL,
  `section` VARCHAR(20) NOT NULL,
  `set_id` VARCHAR(36) NULL,
  `total_questions` INTEGER NOT NULL,
  `current_index` INTEGER NOT NULL DEFAULT 0,
  `remaining_seconds` INTEGER NOT NULL,
  `status` VARCHAR(20) NOT NULL,
  `started_at` BIGINT NOT NULL,
  `submitted_at` BIGINT NULL,

  INDEX `idx_sessions_user_status`(`user_id`, `status`),
  INDEX `set_id`(`set_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `answers` (
  `id` VARCHAR(36) NOT NULL,
  `session_id` VARCHAR(36) NOT NULL,
  `question_id` VARCHAR(36) NOT NULL,
  `selected_answer` VARCHAR(1000) NULL,
  `text_answer` VARCHAR(4000) NULL,
  `is_correct` TINYINT NULL,
  `spent_seconds` INTEGER NOT NULL DEFAULT 0,
  `bookmarked` TINYINT NOT NULL DEFAULT 0,
  `updated_at` BIGINT NOT NULL,

  UNIQUE INDEX `uq_answers_session_q`(`session_id`, `question_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `grammar_items` (
  `id` VARCHAR(36) NOT NULL,
  `pattern` VARCHAR(255) NOT NULL,
  `description` VARCHAR(4000) NOT NULL,
  `examples_json` JSON NOT NULL,
  `tags_json` JSON NOT NULL,
  `is_downloaded` TINYINT NOT NULL DEFAULT 0,
  `updated_at` BIGINT NOT NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `sync_queue` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `entity_type` VARCHAR(50) NOT NULL,
  `entity_id` VARCHAR(36) NOT NULL,
  `action` VARCHAR(20) NOT NULL,
  `payload_json` JSON NOT NULL,
  `status` VARCHAR(20) NOT NULL,
  `retry_count` INTEGER NOT NULL DEFAULT 0,
  `created_at` BIGINT NOT NULL,
  `updated_at` BIGINT NOT NULL,

  INDEX `idx_sync_user_status_created`(`user_id`, `status`, `created_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `user_grammar_items` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `grammar_item_id` VARCHAR(36) NOT NULL,
  `is_bookmarked` TINYINT NOT NULL DEFAULT 0,
  `updated_at` BIGINT NOT NULL,

  UNIQUE INDEX `uq_user_grammar_user_item`(`user_id`, `grammar_item_id`),
  INDEX `grammar_item_id`(`grammar_item_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `vocabulary` (
  `id` VARCHAR(36) NOT NULL,
  `word` VARCHAR(255) NOT NULL,
  `meaning_ko` VARCHAR(1000) NOT NULL,
  `meaning_user_lang` VARCHAR(1000) NULL,
  `level` TINYINT NOT NULL,
  `tts_url` VARCHAR(500) NULL,
  `is_downloaded` TINYINT NOT NULL DEFAULT 0,
  `updated_at` BIGINT NOT NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `user_vocabulary` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `vocabulary_id` VARCHAR(36) NOT NULL,
  `is_bookmarked` TINYINT NOT NULL DEFAULT 0,
  `updated_at` BIGINT NOT NULL,

  UNIQUE INDEX `uq_user_vocabulary_user_vocab`(`user_id`, `vocabulary_id`),
  INDEX `vocabulary_id`(`vocabulary_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `exam_sessions`
  ADD CONSTRAINT `exam_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `exam_sessions_ibfk_2` FOREIGN KEY (`set_id`) REFERENCES `question_sets`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE `answers`
  ADD CONSTRAINT `answers_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `exam_sessions`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE `sync_queue`
  ADD CONSTRAINT `sync_queue_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE `user_grammar_items`
  ADD CONSTRAINT `user_grammar_items_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `user_grammar_items_ibfk_2` FOREIGN KEY (`grammar_item_id`) REFERENCES `grammar_items`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE `user_vocabulary`
  ADD CONSTRAINT `user_vocabulary_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `user_vocabulary_ibfk_2` FOREIGN KEY (`vocabulary_id`) REFERENCES `vocabulary`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
