/**
 * Gemini AI Configuration Constants
 */

// Gemini Model Names (Available models for rotation to avoid rate limits)
export const GEMINI_MODELS = [
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-2.0-flash-exp', // New experimental model
  'gemini-2.0-flash-lite-preview-02-05',
];

// Deprecated: Use GEMINI_MODELS or TASK_MODELS mapping instead
export const GEMINI_MODEL = 'gemini-1.5-flash';
export const GEMINI_MODEL_PRO = 'gemini-1.5-pro';

// Task-specific model mapping
export const TASK_MODELS = {
  SEARCH: 'gemini-1.5-flash',
  RECOMMENDATION: 'gemini-1.5-flash',
  INSIGHT: 'gemini-1.5-flash',
  MATCHING: 'gemini-1.5-pro', // Pro for better semantic analysis
  CHAT: 'gemini-1.5-flash', // Flash for faster chat response
};

// Generation Configuration Defaults
export const DEFAULT_TEMPERATURE = 0.7;
export const DEFAULT_MAX_OUTPUT_TOKENS = 500;
export const DEFAULT_MAX_OUTPUT_TOKENS_LONG = 1000;
export const DEFAULT_MAX_OUTPUT_TOKENS_SHORT = 100;

// Conversation History Limits
export const MAX_HISTORY_MESSAGES = 10;
export const MAX_RECENT_EVENTS = 20;
