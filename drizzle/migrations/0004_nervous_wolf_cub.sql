ALTER TABLE `pokemon` ADD `base_hp` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `pokemon` ADD `base_attack` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `pokemon` ADD `base_defense` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `pokemon` ADD `base_sp_atk` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `pokemon` ADD `base_sp_def` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `pokemon` ADD `base_speed` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `pokemon` DROP COLUMN `hp`;--> statement-breakpoint
ALTER TABLE `pokemon` DROP COLUMN `atk`;--> statement-breakpoint
ALTER TABLE `pokemon` DROP COLUMN `def`;--> statement-breakpoint
ALTER TABLE `pokemon` DROP COLUMN `spa`;--> statement-breakpoint
ALTER TABLE `pokemon` DROP COLUMN `spd`;--> statement-breakpoint
ALTER TABLE `pokemon` DROP COLUMN `spe`;