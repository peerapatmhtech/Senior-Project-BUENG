import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const SERPAPI_URL = 'https://serpapi.com/search.json';
const API_KEY = process.env.SERPAPI_API_KEY;

/**
 * Search for events using SerpApi (Google Events engine)
 * @param {string} query - The search query (e.g., "Events in Bangkok")
 * @returns {Promise<Array>} - Array of event results
 */
export const searchEvents = async (query) => {
  if (!API_KEY) {
    throw new Error('SERPAPI_API_KEY_MISSING');
  }

  try {
    const response = await axios.get(SERPAPI_URL, {
      params: {
        engine: 'google_events',
        q: query,
        google_domain: 'google.co.th',
        api_key: API_KEY,
      },
    });

    // SerpApi returns results in events_results array
    return response.data.events_results || [];
  } catch (error) {
    console.error('SerpApi request failed:', error.message);
    throw new Error('SERPAPI_REQUEST_FAILED');
  }
};
