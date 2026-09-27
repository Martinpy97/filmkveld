CREATE TABLE `pokemon_collection` (
	`user_id` text NOT NULL,
	`pokemon_id` integer NOT NULL,
	`owned_at` text,
	`wanted_at` text,
	PRIMARY KEY(`user_id`, `pokemon_id`)
);
