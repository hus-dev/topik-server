-- CreateTable
CREATE TABLE `user_downloads` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `entity_type` VARCHAR(20) NOT NULL,
    `entity_id` VARCHAR(36) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'downloaded',
    `created_at` BIGINT NOT NULL,
    `updated_at` BIGINT NOT NULL,

    INDEX `idx_user_downloads_user_status_updated`(`user_id`, `status`, `updated_at`),
    INDEX `idx_user_downloads_entity`(`entity_type`, `entity_id`),
    UNIQUE INDEX `uq_user_downloads_user_entity`(`user_id`, `entity_type`, `entity_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_downloads` ADD CONSTRAINT `user_downloads_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
