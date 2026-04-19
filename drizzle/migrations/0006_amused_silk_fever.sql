CREATE TABLE `type_efficacy` (
	`damage_type_id` integer NOT NULL,
	`target_type_id` integer NOT NULL,
	`damage_factor` integer NOT NULL,
	PRIMARY KEY(`damage_type_id`, `target_type_id`),
	FOREIGN KEY (`damage_type_id`) REFERENCES `types`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_type_id`) REFERENCES `types`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_formats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`is_active` integer DEFAULT true
);
--> statement-breakpoint
INSERT INTO `__new_formats`("id", "name", "description", "is_active") SELECT "id", "name", "description", "is_active" FROM `formats`;--> statement-breakpoint
DROP TABLE `formats`;--> statement-breakpoint
ALTER TABLE `__new_formats` RENAME TO `formats`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_types` (
	`id` integer PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`generation_id` integer NOT NULL,
	`damage_class_id` integer
);
--> statement-breakpoint
INSERT INTO `__new_types`("id", "identifier", "generation_id", "damage_class_id") SELECT "id", "identifier", "generation_id", "damage_class_id" FROM `types`;--> statement-breakpoint
DROP TABLE `types`;--> statement-breakpoint
ALTER TABLE `__new_types` RENAME TO `types`;