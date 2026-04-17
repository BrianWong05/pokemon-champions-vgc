CREATE TABLE `calculated_speeds` (
	`pokemon_id` integer PRIMARY KEY NOT NULL,
	`max_plus` integer NOT NULL,
	`max_neutral` integer NOT NULL,
	`uninvested` integer NOT NULL,
	`min_minus` integer NOT NULL,
	FOREIGN KEY (`pokemon_id`) REFERENCES `pokemon`(`id`) ON UPDATE no action ON DELETE cascade
);
