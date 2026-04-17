CREATE TABLE `pokemon_forms` (
	`id` integer PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`pokemon_id` integer NOT NULL,
	`introduced_in_version_group_id` integer,
	`is_default` integer,
	`is_battle_only` integer,
	`is_mega` integer,
	`form_identifier` text,
	`order` integer,
	`form_order` integer,
	FOREIGN KEY (`pokemon_id`) REFERENCES `pokemon`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `types` (
	`id` integer PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`generation_id` integer,
	`damage_class_id` integer
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_pokemon` (
	`id` integer PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`name` text,
	`name_en` text,
	`name_ja` text,
	`name_zh` text,
	`type1` text NOT NULL,
	`type2` text,
	`hp` integer NOT NULL,
	`atk` integer NOT NULL,
	`def` integer NOT NULL,
	`spa` integer NOT NULL,
	`spd` integer NOT NULL,
	`spe` integer NOT NULL,
	`height` integer,
	`weight` integer,
	`base_experience` integer,
	`order` integer,
	`is_default` integer
);
--> statement-breakpoint
INSERT INTO `__new_pokemon`("id", "identifier", "name", "name_en", "name_ja", "name_zh", "type1", "type2", "hp", "atk", "def", "spa", "spd", "spe", "height", "weight", "base_experience", "order", "is_default") SELECT "id", "identifier", "name", "name_en", "name_ja", "name_zh", "type1", "type2", "hp", "atk", "def", "spa", "spd", "spe", "height", "weight", "base_experience", "order", "is_default" FROM `pokemon`;--> statement-breakpoint
DROP TABLE `pokemon`;--> statement-breakpoint
ALTER TABLE `__new_pokemon` RENAME TO `pokemon`;--> statement-breakpoint
PRAGMA foreign_keys=ON;