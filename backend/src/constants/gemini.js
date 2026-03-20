/**
 * Gemini AI Configuration Constants
 */

// Gemini Model Names (Available models for rotation to avoid rate limits)
export const GEMINI_MODELS = [
  'gemini-3-flash-preview', // Requested futuristic model
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash-exp',
];

// Deprecated: Use GEMINI_MODELS or TASK_MODELS mapping instead
export const GEMINI_MODEL = 'gemini-2.5-flash';
export const GEMINI_MODEL_PRO = 'gemini-2.5-flash';

// Task-specific model mapping
export const TASK_MODELS = {
  SEARCH: 'gemini-2.5-flash',
  RECOMMENDATION: 'gemini-2.5-flash',
  INSIGHT: 'gemini-2.5-flash-lite',
  MATCHING: 'gemini-2.5-flash-lite', // Pro for better semantic analysis
  CHAT: 'gemini-2.5-flash', // Flash for faster chat response
};

// Generation Configuration Defaults
export const DEFAULT_TEMPERATURE = 0.7;
export const DEFAULT_MAX_OUTPUT_TOKENS = 500;
export const DEFAULT_MAX_OUTPUT_TOKENS_LONG = 1000;
export const DEFAULT_MAX_OUTPUT_TOKENS_SHORT = 100;

// Conversation History Limits
export const MAX_HISTORY_MESSAGES = 10;
export const MAX_RECENT_EVENTS = 20;
