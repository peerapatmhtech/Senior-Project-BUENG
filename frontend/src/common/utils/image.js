export const getFullImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) {
    return url;
  }
  return `${import.meta.env.VITE_APP_API_BASE_URL}${url}`;
};

export const getHighResPhoto = (url) => {
  if (!url) return '/default-profile.png';
  try {
    if (typeof url === 'string' && url.includes('=s')) {
      return url.replace(/=s\d+-c(?=[&?]|$)/, '=s400-c');
    }
    return url;
  } catch (error) {
    console.error('Error processing photo URL:', error);
    return url || '/default-profile.png';
  }
};
