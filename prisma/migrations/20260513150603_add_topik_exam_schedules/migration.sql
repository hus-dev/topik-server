-- CreateTable
CREATE TABLE `topik_exam_schedules` (
    `id` VARCHAR(36) NOT NULL,
    `exam_name` VARCHAR(255) NOT NULL,
    `exam_date` BIGINT NOT NULL,
    `registration_start_at` BIGINT NOT NULL,
    `registration_end_at` BIGINT NOT NULL,
    `result_date` BIGINT NOT NULL,
    `location` VARCHAR(255) NOT NULL,
    `fee` INTEGER NOT NULL,
    `registration_url` VARCHAR(500) NOT NULL,
    `is_active` TINYINT NOT NULL DEFAULT 1,
    `display_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` BIGINT NOT NULL,
    `updated_at` BIGINT NOT NULL,

    INDEX `idx_topik_exam_schedules_active_exam_date`(`is_active`, `exam_date`),
    INDEX `idx_topik_exam_schedules_order_date`(`display_order`, `exam_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
