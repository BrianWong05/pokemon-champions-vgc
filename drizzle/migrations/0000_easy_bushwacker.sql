CREATE TABLE `abilities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `moves` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`category` text NOT NULL,
	`power` integer,
	`accuracy` integer,
	`pp` integer NOT NULL,
	`effect` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pokemon` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type1` text NOT NULL,
	`type2` text,
	`hp` integer NOT NULL,
	`atk` integer NOT NULL,
	`def` integer NOT NULL,
	`spa` integer NOT NULL,
	`spd` integer NOT NULL,
	`spe` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pokemon_moves` (
	`pokemon_id` integer NOT NULL,
	`move_id` integer NOT NULL,
	PRIMARY KEY(`pokemon_id`, `move_id`),
	FOREIGN KEY (`pokemon_id`) REFERENCES `pokemon`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`move_id`) REFERENCES `moves`(`id`) ON UPDATE no action ON DELETE cascade
);
