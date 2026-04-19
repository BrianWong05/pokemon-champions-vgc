import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

export const pokemon = sqliteTable('pokemon', {
  id: integer('id').primaryKey(),
  identifier: text('identifier').notNull(),
  nameEn: text('name_en'),
  nameJa: text('name_ja'),
  nameZh: text('name_zh'),
  type1: text('type1').notNull(),
  type2: text('type2'),
  baseHp: integer('base_hp').notNull(),
  baseAttack: integer('base_attack').notNull(),
  baseDefense: integer('base_defense').notNull(),
  baseSpAtk: integer('base_sp_atk').notNull(),
  baseSpDef: integer('base_sp_def').notNull(),
  baseSpeed: integer('base_speed').notNull(),
  height: integer('height'),
  weight: integer('weight'),
  baseExperience: integer('base_experience'),
  order: integer('order'),
  isDefault: integer('is_default', { mode: 'boolean' }),
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

export const types = sqliteTable('types', {
  id: integer('id').primaryKey(),
  identifier: text('identifier').notNull(),
  nameEn: text('name_en'),
  nameJa: text('name_ja'),
  nameZh: text('name_zh'),
  generationId: integer('generation_id').notNull(),
  damageClassId: integer('damage_class_id'),
});

export const typeEfficacy = sqliteTable('type_efficacy', {
  damageTypeId: integer('damage_type_id')
    .notNull()
    .references(() => types.id, { onDelete: 'cascade' }),
  targetTypeId: integer('target_type_id')
    .notNull()
    .references(() => types.id, { onDelete: 'cascade' }),
  damageFactor: integer('damage_factor').notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.damageTypeId, t.targetTypeId] }),
}));

export const formats = sqliteTable('formats', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
});

export const formatPokemon = sqliteTable('format_pokemon', {
  formatId: integer('format_id')
    .notNull()
    .references(() => formats.id, { onDelete: 'cascade' }),
  pokemonId: integer('pokemon_id')
    .notNull()
    .references(() => pokemon.id, { onDelete: 'cascade' }),
}, (t) => ({
  pk: primaryKey({ columns: [t.formatId, t.pokemonId] }),
}));

export const pokemonForms = sqliteTable('pokemon_forms', {
  id: integer('id').primaryKey(),
  identifier: text('identifier').notNull(),
  pokemonId: integer('pokemon_id')
    .notNull()
    .references(() => pokemon.id, { onDelete: 'cascade' }),
  introducedInVersionGroupId: integer('introduced_in_version_group_id'),
  isDefault: integer('is_default', { mode: 'boolean' }),
  isBattleOnly: integer('is_battle_only', { mode: 'boolean' }),
  isMega: integer('is_mega', { mode: 'boolean' }),
  formIdentifier: text('form_identifier'),
  order: integer('order'),
  formOrder: integer('form_order'),
});

export const calculatedSpeeds = sqliteTable('calculated_speeds', {
  pokemonId: integer('pokemon_id')
    .primaryKey()
    .references(() => pokemon.id, { onDelete: 'cascade' }),
  maxPlus: integer('max_plus').notNull(),
  maxNeutral: integer('max_neutral').notNull(),
  uninvested: integer('uninvested').notNull(),
  minMinus: integer('min_minus').notNull(),
});

// Relations
export const typesRelations = relations(types, ({ many }) => ({
  attackingEfficacy: many(typeEfficacy, { relationName: 'attacker' }),
  defendingEfficacy: many(typeEfficacy, { relationName: 'defender' }),
}));

export const typeEfficacyRelations = relations(typeEfficacy, ({ one }) => ({
  damageType: one(types, {
    fields: [typeEfficacy.damageTypeId],
    references: [types.id],
    relationName: 'attacker',
  }),
  targetType: one(types, {
    fields: [typeEfficacy.targetTypeId],
    references: [types.id],
    relationName: 'defender',
  }),
}));

export const pokemonRelations = relations(pokemon, ({ many, one }) => ({
  pokemonMoves: many(pokemonMoves),
  forms: many(pokemonForms),
  formatLegality: many(formatPokemon),
  calculatedSpeed: one(calculatedSpeeds, {
    fields: [pokemon.id],
    references: [calculatedSpeeds.pokemonId],
  }),
}));

export const calculatedSpeedsRelations = relations(calculatedSpeeds, ({ one }) => ({
  pokemon: one(pokemon, {
    fields: [calculatedSpeeds.pokemonId],
    references: [pokemon.id],
  }),
}));

export const pokemonFormsRelations = relations(pokemonForms, ({ one }) => ({
  pokemon: one(pokemon, {
    fields: [pokemonForms.pokemonId],
    references: [pokemon.id],
  }),
}));

export const formatsRelations = relations(formats, ({ many }) => ({
  pokemonLegality: many(formatPokemon),
}));

export const formatPokemonRelations = relations(formatPokemon, ({ one }) => ({
  format: one(formats, {
    fields: [formatPokemon.formatId],
    references: [formats.id],
  }),
  pokemon: one(pokemon, {
    fields: [formatPokemon.pokemonId],
    references: [pokemon.id],
  }),
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
