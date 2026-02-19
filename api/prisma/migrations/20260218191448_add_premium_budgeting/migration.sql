-- CreateTable
CREATE TABLE `budgets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organization_id` INTEGER NOT NULL,
    `project_id` INTEGER NOT NULL,
    `sprint_id` INTEGER NULL,
    `release_id` INTEGER NULL,
    `scope` ENUM('PROJECT', 'SPRINT', 'RELEASE') NOT NULL DEFAULT 'PROJECT',
    `name` VARCHAR(191) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `starts_at` DATETIME(3) NULL,
    `ends_at` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `budgets_organization_id_idx`(`organization_id`),
    INDEX `budgets_project_id_idx`(`project_id`),
    INDEX `budgets_sprint_id_idx`(`sprint_id`),
    INDEX `budgets_release_id_idx`(`release_id`),
    INDEX `budgets_scope_idx`(`scope`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `budget_lines` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `budget_id` INTEGER NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `category_type` ENUM('LABOR', 'SOFTWARE', 'SERVICES', 'HARDWARE', 'TRAVEL', 'OTHER') NOT NULL DEFAULT 'OTHER',
    `planned_cents` INTEGER NOT NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `budget_lines_budget_id_idx`(`budget_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `expenses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `budget_id` INTEGER NOT NULL,
    `project_id` INTEGER NOT NULL,
    `sprint_id` INTEGER NULL,
    `task_id` INTEGER NULL,
    `category` VARCHAR(191) NOT NULL,
    `amount_cents` INTEGER NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `incurred_at` DATETIME(3) NOT NULL,
    `vendor` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `attachment_url` TEXT NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `expenses_budget_id_idx`(`budget_id`),
    INDEX `expenses_project_id_idx`(`project_id`),
    INDEX `expenses_sprint_id_idx`(`sprint_id`),
    INDEX `expenses_task_id_idx`(`task_id`),
    INDEX `expenses_incurred_at_idx`(`incurred_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rate_cards` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `budget_id` INTEGER NOT NULL,
    `project_id` INTEGER NOT NULL,
    `user_id` INTEGER NULL,
    `project_role` ENUM('PRODUCT_OWNER', 'SCRUM_MASTER', 'DEVELOPER', 'TESTER', 'DESIGNER', 'STAKEHOLDER', 'OBSERVER', 'INFRAESTRUCTURA', 'REDES', 'SEGURIDAD') NULL,
    `hourly_cents` INTEGER NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `effective_from` DATETIME(3) NULL,
    `effective_to` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `rate_cards_budget_id_idx`(`budget_id`),
    INDEX `rate_cards_project_id_idx`(`project_id`),
    INDEX `rate_cards_user_id_idx`(`user_id`),
    INDEX `rate_cards_project_role_idx`(`project_role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `users_global_role_idx` ON `users`(`global_role`);

-- AddForeignKey
ALTER TABLE `budgets` ADD CONSTRAINT `budgets_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `budgets` ADD CONSTRAINT `budgets_sprint_id_fkey` FOREIGN KEY (`sprint_id`) REFERENCES `sprints`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `budgets` ADD CONSTRAINT `budgets_release_id_fkey` FOREIGN KEY (`release_id`) REFERENCES `releases`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `budget_lines` ADD CONSTRAINT `budget_lines_budget_id_fkey` FOREIGN KEY (`budget_id`) REFERENCES `budgets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_budget_id_fkey` FOREIGN KEY (`budget_id`) REFERENCES `budgets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_sprint_id_fkey` FOREIGN KEY (`sprint_id`) REFERENCES `sprints`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rate_cards` ADD CONSTRAINT `rate_cards_budget_id_fkey` FOREIGN KEY (`budget_id`) REFERENCES `budgets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rate_cards` ADD CONSTRAINT `rate_cards_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rate_cards` ADD CONSTRAINT `rate_cards_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
