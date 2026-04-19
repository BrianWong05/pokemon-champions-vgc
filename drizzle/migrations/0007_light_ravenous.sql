PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_moves` (
	`id` integer PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`name_en` text NOT NULL,
	`name_ja` text,
	`name_zh` text,
	`type_id` integer NOT NULL,
	`damage_class_id` integer,
	`power` integer,
	`accuracy` integer,
	`pp` integer,
	`priority` integer,
	FOREIGN KEY (`type_id`) REFERENCES `types`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_moves`("id", "identifier", "name_en", "name_ja", "name_zh", "type_id", "damage_class_id", "power", "accuracy", "pp", "priority") SELECT "id", "identifier", "name_en", "name_ja", "name_zh", "type_id", "damage_class_id", "power", "accuracy", "pp", "priority" FROM `moves`;--> statement-breakpoint
DROP TABLE `moves`;--> statement-breakpoint
ALTER TABLE `__new_moves` RENAME TO `moves`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `types` ADD `name_en` text;--> statement-breakpoint
ALTER TABLE `types` ADD `name_ja` text;--> statement-breakpoint
ALTER TABLE `types` ADD `name_zh` text;