/**
 * Zod request-body schemas for ggBoard write endpoints.
 * Kept intentionally lenient so they match what the handlers already accept.
 */

const { z } = require('zod');

const registerSchema = z.object({
  role: z.enum(['organizer', 'player']),
  username: z.string().trim().min(3, 'Username must be at least 3 characters.').max(30, 'Username is too long.'),
  password: z.string().min(6, 'Password must be at least 6 characters.').max(200),
  display_name: z.string().trim().max(60, 'Display name is too long.').optional(),
});

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required.'),
  password: z.string().min(1, 'Password is required.'),
});

// Sign-up = role-first: pick organizer/player, which account table to create in.
const signupSchema = z.object({
  role: z.enum(['organizer', 'player']),
  username: z.string().trim().min(3, 'Username must be at least 3 characters.').max(30, 'Username is too long.'),
  password: z.string().min(6, 'Password must be at least 6 characters.').max(200),
  display_name: z.string().trim().max(60, 'Display name is too long.').optional(),
});

const selectRoleSchema = z.object({
  role: z.enum(['organizer', 'player']),
});

// Accepts ISO / date strings; treats '' / null as "not provided".
const optionalDate = z.preprocess(
  (v) => (v === '' || v === null ? undefined : v),
  z.coerce.date().optional()
);

// A player's per-game identity. ign/uid are optional at profile time, but required
// to register for an event of that game (enforced separately). rank/role enrich the profile.
const gameEntrySchema = z.object({
  game: z.string().trim().min(1).max(40),
  ign: z.string().trim().max(60).optional().default(''),
  uid: z.string().trim().max(60).optional().default(''),
  rank: z.string().trim().max(40).optional().default(''),
  role: z.string().trim().max(40).optional().default(''),
});

const profileSchema = z.object({
  display_name: z.string().trim().max(60, 'Display name is too long.').optional(),
  email: z.union([z.string().trim().email('Enter a valid email.'), z.literal('')]).optional(),
  phone: z.string().trim().max(30, 'Phone number is too long.').optional(),
  games: z.array(gameEntrySchema).max(40, 'Too many games selected.').optional(),
  date_of_birth: optionalDate,
  country: z.string().trim().max(60).optional(),
  city: z.string().trim().max(60).optional(),
  gender: z.string().trim().max(30).optional(),
  language: z.string().trim().max(40).optional(),
  looking_for_team: z.boolean().optional(),
  preferred_role: z.string().trim().max(40).optional(),
  bio: z.string().trim().max(500, 'Bio is too long.').optional(),
});

// Upsert a single game's identity (used by the registration gate). Here ign+uid are required.
const gameProfileSchema = z.object({
  game: z.string().trim().min(1, 'Game is required.').max(40),
  ign: z.string().trim().min(1, 'In-game name is required.').max(60),
  uid: z.string().trim().min(1, 'UID is required.').max(60),
});

// '' / null → undefined (leave unset); otherwise a non-negative integer.
const optionalInt = z.preprocess(
  (v) => (v === '' || v === null ? undefined : v),
  z.coerce.number().int().min(0).optional()
);

const gameCreateSchema = z.object({
  game_title: z.string().trim().min(1, 'Game title is required.').max(80),
  tournament_name: z.string().trim().min(1, 'Tournament name is required.').max(120),
  status: z.enum(['active', 'inactive']).optional(),
  description: z.string().trim().max(2000).optional(),
  start_date: optionalDate,           // event start
  end_date: optionalDate,
  registration_start: optionalDate,   // registration opens
  registration_deadline: optionalDate, // registration closes
  team_limit: optionalInt,            // max teams; unset = unlimited
  is_paid: z.boolean().optional(),
  entry_fee: optionalInt,             // per-team fee
  prize_pool: z.string().trim().max(80).optional(),
  prize_type: z.enum(['cash', 'gift_card', 'uc', 'other']).optional(),
});

const scoreUpdateSchema = z.object({
  team_id: z.coerce.number().int().positive(),
  game_id: z.coerce.number().int().positive(),
  round_scores: z.array(z.number()).min(1, 'round_scores must be a non-empty array of numbers.'),
});

module.exports = { registerSchema, loginSchema, signupSchema, selectRoleSchema, profileSchema, gameProfileSchema, gameCreateSchema, scoreUpdateSchema };
