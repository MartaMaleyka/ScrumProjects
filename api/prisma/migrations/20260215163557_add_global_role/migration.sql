-- AlterTable
ALTER TABLE `users` ADD COLUMN `global_role` ENUM('ADMIN', 'MANAGER', 'USER') NOT NULL DEFAULT 'USER';

-- CreateIndex
CREATE INDEX `users_global_role_idx` ON `users`(`global_role`);
