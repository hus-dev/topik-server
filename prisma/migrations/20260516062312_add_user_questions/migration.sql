-- CreateTable
CREATE TABLE `user_questions` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `question_id` VARCHAR(36) NOT NULL,
    `is_bookmarked` TINYINT NOT NULL DEFAULT 0,
    `updated_at` BIGINT NOT NULL,

    INDEX `question_id`(`question_id`),
    UNIQUE INDEX `uq_user_questions_user_question`(`user_id`, `question_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_questions` ADD CONSTRAINT `user_questions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user_questions` ADD CONSTRAINT `user_questions_ibfk_2` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
