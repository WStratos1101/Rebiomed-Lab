ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','supporter','researcher','viewer','user','guest') NOT NULL DEFAULT 'researcher';
