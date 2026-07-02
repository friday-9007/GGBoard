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

// Sign-up = credentials only; the role is chosen afterwards on /auth/select-role.
const signupSchema = z.object({
  username: z.string().trim().min(3, 'Username must be at least 3 characters.').max(30, 'Username is too long.'),
  password: z.string().min(6, 'Password must be at least 6 characters.').max(200),
  display_name: z.string().trim().max(60, 'Display name is too long.').optional(),
});

const selectRoleSchema = z.object({
  role: z.enum(['organizer', 'player']),
});

const gameCreateSchema = z.object({
  game_title: z.string().trim().min(1, 'Game title is required.').max(80),
  tournament_name: z.string().trim().min(1, 'Tournament name is required.').max(120),
  status: z.enum(['active', 'inactive']).optional(),
  num_rounds: z.coerce.number().int().min(1).max(20).optional(),
});

const scoreUpdateSchema = z.object({
  team_id: z.coerce.number().int().positive(),
  game_id: z.coerce.number().int().positive(),
  round_scores: z.array(z.number()).min(1, 'round_scores must be a non-empty array of numbers.'),
});

module.exports = { registerSchema, loginSchema, signupSchema, selectRoleSchema, gameCreateSchema, scoreUpdateSchema };
