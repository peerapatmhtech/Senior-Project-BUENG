export const DEFAULT_PROFILE_IMAGE = '/default-profile.png';

export const getFullImageUrl = (url) => {
  if (!url) return DEFAULT_PROFILE_IMAGE;

  // If it's already a full URL (http/https) or a data URI, return as is
  if (url.startsWith('http') || url.startsWith('data:')) {
    return url;
  }

  // If it's a backend upload path (starts with /uploads), prepend the API base URL
  if (url.startsWith('/uploads')) {
    return `${import.meta.env.VITE_APP_API_BASE_URL}${url}`;
  }

  // If it's a relative path NOT starting with our specific upload directories,
  // it's likely a local asset (like /default-profile.png) or needs the prefix if it's not a local asset.
  // We need to be careful here to not prefix local assets that start with /
  if (url.startsWith('/')) {
    return url;
  }

  // Fallback: prepend API base URL for other relative paths
  return `${import.meta.env.VITE_APP_API_BASE_URL}/${url}`;
};

export const getHighResPhoto = (url) => {
  if (!url) return DEFAULT_PROFILE_IMAGE;
  try {
    if (typeof url === 'string' && url.includes('=s')) {
      return url.replace(/=s\d+-c(?=[&?]|$)/, '=s400-c');
    }
    return url;
  } catch (error) {
    console.error('Error processing photo URL:', error);
    return url || DEFAULT_PROFILE_IMAGE;
  }
};

