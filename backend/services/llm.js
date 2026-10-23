/**
 * LLM provider interface (Module 3 implements the Anthropic provider).
 * Until LLM_API_KEY is set, isConfigured() is false and callers fall back to the rule-based template report
 * and skip the breed check, so evaluations still complete.
 */

const isConfigured = () => Boolean(process.env.LLM_API_KEY);

// Returns { breed, confidence, inKnownClasses, reasoning } or null when the LLM isn't available
const verifyBreed = async () => null;

// Returns a report object (see Evaluation.report) or null when the LLM isn't available
const generateReport = async () => null;

module.exports = { isConfigured, verifyBreed, generateReport };
