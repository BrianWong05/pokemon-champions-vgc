import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

export const pokemon = sqliteTable('pokemon', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type1: text('type1').notNull(),
  type2: text('type2'),
  hp: integer('hp').notNull(),
  atk: integer('atk').notNull(),
  def: integer('def').notNull(),
  spa: integer('spa').notNull(),
  spd: integer('spd').notNull(),
  spe: integer('spe').notNull(),
});

export const moves = sqliteTable('moves', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type').notNull(),
  category: text('category').notNull(), // Physical, Special, Status
  power: integer('power'),
  accuracy: integer('accuracy'),
  pp: integer('pp').notNull(),
  effect: text('effect').notNull(),
});

export const abilities = sqliteTable('abilities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description').notNull(),
});

export const pokemonMoves = sqliteTable('pokemon_moves', {
  pokemonId: integer('pokemon_id')
    .notNull()
    .references(() => pokemon.id, { onDelete: 'cascade' }),
  moveId: integer('move_id')
    .notNull()
    .references(() => moves.id, { onDelete: 'cascade' }),
}, (t) => ({
  pk: primaryKey({ columns: [t.pokemonId, t.moveId] }),
}));

// Relations
export const pokemonRelations = relations(pokemon, ({ many }) => ({
  pokemonMoves: many(pokemonMoves),
}));

export const movesRelations = relations(moves, ({ many }) => ({
  pokemonMoves: many(pokemonMoves),
}));

export const pokemonMovesRelations = relations(pokemonMoves, ({ one }) => ({
  pokemon: one(pokemon, {
    fields: [pokemonMoves.pokemonId],
    references: [pokemon.id],
  }),
  move: one(moves, {
    fields: [pokemonMoves.moveId],
    references: [moves.id],
  }),
}));
