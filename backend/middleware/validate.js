/**
 * Validation middleware factory (Zod).
 * Validates req.body against a schema; on failure returns 400 with the first issue.
 * On success, req.body is replaced with the parsed (coerced, stripped) values.
 */

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issue = result.error.issues[0];
      const field = issue.path.join('.') || 'body';
      return res.status(400).json({ error: `${field}: ${issue.message}` });
    }
    req.body = result.data;
    next();
  };
}

module.exports = { validate };
