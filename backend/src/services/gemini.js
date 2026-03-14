import { GoogleGenerativeAI } from '@google/generative-ai';

let genAIInstance = null;

/**
 * Get the initialized Gemini AI instance.
 * Lazily initializes the instance to ensure process.env.GEMINI_API_KEY is available.
 */
export const getGenAI = () => {
  if (!genAIInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined in environment variables.');
    }
    genAIInstance = new GoogleGenerativeAI(apiKey);
  }
  return genAIInstance;
};
