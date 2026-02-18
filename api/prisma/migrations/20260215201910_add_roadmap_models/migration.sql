-- AlterTable
ALTER TABLE `tasks` ADD COLUMN `due_date` DATETIME(3) NULL,
    ADD COLUMN `start_date` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `task_dependencies` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `task_id` INTEGER NOT NULL,
    `depends_on_id` INTEGER NOT NULL,
    `type` ENUM('FINISH_TO_START', 'START_TO_START', 'FINISH_TO_FINISH', 'START_TO_FINISH') NOT NULL DEFAULT 'FINISH_TO_START',
    `lag_days` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `task_dependencies_task_id_idx`(`task_id`),
    INDEX `task_dependencies_depends_on_id_idx`(`depends_on_id`),
    UNIQUE INDEX `task_dependencies_task_id_depends_on_id_key`(`task_id`, `depends_on_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `releases` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `project_id` INTEGER NOT NULL,
    `version` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `status` ENUM('PLANNING', 'IN_PROGRESS', 'RELEASED', 'CANCELLED') NOT NULL DEFAULT 'PLANNING',
    `release_date` DATETIME(3) NULL,
    `planned_date` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `releases_project_id_idx`(`project_id`),
    INDEX `releases_status_idx`(`status`),
    INDEX `releases_release_date_idx`(`release_date`),
    UNIQUE INDEX `releases_project_id_version_key`(`project_id`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `release_notes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `release_id` INTEGER NOT NULL,
    `task_id` INTEGER NULL,
    `type` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `release_notes_release_id_idx`(`release_id`),
    INDEX `release_notes_task_id_idx`(`task_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `epic_releases` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `epic_id` INTEGER NOT NULL,
    `release_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `epic_releases_epic_id_idx`(`epic_id`),
    INDEX `epic_releases_release_id_idx`(`release_id`),
    UNIQUE INDEX `epic_releases_epic_id_release_id_key`(`epic_id`, `release_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `tasks_start_date_idx` ON `tasks`(`start_date`);

-- CreateIndex
CREATE INDEX `tasks_due_date_idx` ON `tasks`(`due_date`);

-- AddForeignKey
ALTER TABLE `task_dependencies` ADD CONSTRAINT `task_dependencies_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_dependencies` ADD CONSTRAINT `task_dependencies_depends_on_id_fkey` FOREIGN KEY (`depends_on_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `releases` ADD CONSTRAINT `releases_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `release_notes` ADD CONSTRAINT `release_notes_release_id_fkey` FOREIGN KEY (`release_id`) REFERENCES `releases`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `release_notes` ADD CONSTRAINT `release_notes_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `epic_releases` ADD CONSTRAINT `epic_releases_epic_id_fkey` FOREIGN KEY (`epic_id`) REFERENCES `epics`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `epic_releases` ADD CONSTRAINT `epic_releases_release_id_fkey` FOREIGN KEY (`release_id`) REFERENCES `releases`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
