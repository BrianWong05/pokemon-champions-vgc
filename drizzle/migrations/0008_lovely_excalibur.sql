CREATE TABLE `pokemon_abilities` (
	`pokemon_id` integer NOT NULL,
	`ability_id` integer NOT NULL,
	`is_hidden` integer NOT NULL,
	`slot` integer NOT NULL,
	PRIMARY KEY(`pokemon_id`, `ability_id`),
	FOREIGN KEY (`pokemon_id`) REFERENCES `pokemon`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ability_id`) REFERENCES `abilities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_abilities` (
	`id` integer PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`name_en` text,
	`name_ja` text,
	`name_zh` text
);
--> statement-breakpoint
INSERT INTO `__new_abilities`("id", "identifier", "name_en", "name_ja", "name_zh") SELECT "id", "identifier", "name_en", "name_ja", "name_zh" FROM `abilities`;--> statement-breakpoint
DROP TABLE `abilities`;--> statement-breakpoint
ALTER TABLE `__new_abilities` RENAME TO `abilities`;--> statement-breakpoint
PRAGMA foreign_keys=ON;