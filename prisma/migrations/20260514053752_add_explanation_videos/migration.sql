-- CreateTable
CREATE TABLE `explanation_videos` (
    `id` VARCHAR(36) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
    `thumbnail_url` VARCHAR(500) NULL,
    `video_url` VARCHAR(500) NOT NULL,
    `question_id` VARCHAR(36) NULL,
    `set_id` VARCHAR(36) NULL,
    `section` VARCHAR(20) NULL,
    `level` TINYINT NULL,
    `is_recommended` TINYINT NOT NULL DEFAULT 0,
    `display_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` BIGINT NOT NULL,
    `updated_at` BIGINT NOT NULL,

    INDEX `idx_explanation_videos_recommended_order`(`is_recommended`, `display_order`),
    INDEX `idx_explanation_videos_section_level`(`section`, `level`),
    INDEX `idx_explanation_videos_question_id`(`question_id`),
    INDEX `idx_explanation_videos_set_id`(`set_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `explanation_videos` ADD CONSTRAINT `explanation_videos_ibfk_1` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `explanation_videos` ADD CONSTRAINT `explanation_videos_ibfk_2` FOREIGN KEY (`set_id`) REFERENCES `question_sets`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
