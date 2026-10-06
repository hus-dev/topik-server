-- CreateTable
CREATE TABLE `question_ai_explanations` (
    `id` VARCHAR(36) NOT NULL,
    `question_id` VARCHAR(36) NOT NULL,
    `selected_option` VARCHAR(50) NOT NULL,
    `language_code` VARCHAR(10) NOT NULL,
    `explanation` TEXT NOT NULL,
    `created_at` BIGINT NOT NULL,

    INDEX `idx_q_ai_expl_question_id`(`question_id`),
    UNIQUE INDEX `uq_q_ai_expl_q_opt_lang`(`question_id`, `selected_option`, `language_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `question_ai_explanations` ADD CONSTRAINT `fk_q_ai_expl_question` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
