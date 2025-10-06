import api from './api'; // Assuming api is an axios instance

/**
 * Sends a message to the backend AI service and returns the AI's response.
 * @param {string} message - The user's message.
 * @param {Array} history - The conversation history.
 * @returns {Promise<string>} The AI's response message.
 */
export async function sendMessageToAI(message, history = []) {
  try {
    // Make a POST request to our secure backend endpoint
    const response = await api.post('/api/ai/chat', {
      message,
      history,
    });

    // Return the response from the backend
    return response.data.response;

  } catch (error) {
    console.error("Error calling backend AI service:", error);

    // Provide a user-friendly error message
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Error data:', error.response.data);
      return `ขออภัยค่ะ เกิดข้อผิดพลาดจากเซิร์ฟเวอร์: ${error.response.data.error}`;
    } else if (error.request) {
      // The request was made but no response was received
      return "ขออภัยค่ะ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ AI ได้";
    } else {
      // Something happened in setting up the request that triggered an Error
      return "ขออภัยค่ะ เกิดข้อผิดพลาดในการส่งคำขอ";
    }
  }
}
