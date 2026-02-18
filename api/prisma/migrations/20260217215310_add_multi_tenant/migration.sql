-- AlterEnum: Agregar SUPER_ADMIN al enum GlobalRole
-- Nota: MySQL no soporta ALTER ENUM directamente, necesitamos recrear la columna
-- Primero, crear una columna temporal
ALTER TABLE `users` ADD COLUMN `global_role_temp` VARCHAR(191) NULL;

-- Copiar datos existentes
UPDATE `users` SET `global_role_temp` = `global_role`;

-- Eliminar la columna antigua
ALTER TABLE `users` DROP COLUMN `global_role`;

-- Crear la nueva columna con el enum actualizado
ALTER TABLE `users` ADD COLUMN `global_role` ENUM('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER') NOT NULL DEFAULT 'USER';

-- Restaurar datos
UPDATE `users` SET `global_role` = `global_role_temp`;

-- Eliminar columna temporal
ALTER TABLE `users` DROP COLUMN `global_role_temp`;

-- CreateTable: organizations
CREATE TABLE `organizations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `organizations_slug_key`(`slug`),
    INDEX `organizations_slug_idx`(`slug`),
    INDEX `organizations_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateDefaultOrganization: Crear organización por defecto
INSERT INTO `organizations` (`name`, `slug`, `is_active`, `created_at`, `updated_at`)
VALUES ('Default Organization', 'default-organization', true, NOW(), NOW());

-- AddColumn: organizationId a users (nullable primero)
ALTER TABLE `users` ADD COLUMN `organization_id` INTEGER NULL;

-- AddColumn: organizationId a projects (nullable primero)
ALTER TABLE `projects` ADD COLUMN `organization_id` INTEGER NULL;

-- MigrateData: Asignar organización por defecto a usuarios existentes
UPDATE `users` SET `organization_id` = (SELECT `id` FROM `organizations` WHERE `slug` = 'default-organization' LIMIT 1)
WHERE `organization_id` IS NULL;

-- MigrateData: Asignar organización por defecto a proyectos existentes
-- Usar la organización del creador si existe, sino la default
UPDATE `projects` p
LEFT JOIN `users` u ON p.`created_by` = u.`id`
SET p.`organization_id` = COALESCE(u.`organization_id`, (SELECT `id` FROM `organizations` WHERE `slug` = 'default-organization' LIMIT 1))
WHERE p.`organization_id` IS NULL;

-- MakeNotNull: Hacer organizationId NOT NULL en users
ALTER TABLE `users` MODIFY COLUMN `organization_id` INTEGER NOT NULL;

-- MakeNotNull: Hacer organizationId NOT NULL en projects
ALTER TABLE `projects` MODIFY COLUMN `organization_id` INTEGER NOT NULL;

-- AddForeignKey: users.organizationId -> organizations.id
ALTER TABLE `users` ADD CONSTRAINT `users_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: projects.organizationId -> organizations.id
ALTER TABLE `projects` ADD CONSTRAINT `projects_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex: organizationId en users
CREATE INDEX `users_organization_id_idx` ON `users`(`organization_id`);

-- CreateIndex: organizationId, globalRole en users
CREATE INDEX `users_organization_id_global_role_idx` ON `users`(`organization_id`, `global_role`);

-- CreateIndex: organizationId en projects
CREATE INDEX `projects_organization_id_idx` ON `projects`(`organization_id`);

-- CreateIndex: organizationId, deletedAt en projects
CREATE INDEX `projects_organization_id_deleted_at_idx` ON `projects`(`organization_id`, `deleted_at`);

