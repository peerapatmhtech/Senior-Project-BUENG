import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { getFullImageUrl, getHighResPhoto } from '../common/utils/image';

const DEFAULT_AVATAR = '/default-profile.png';

/**
 * A reusable component for user profile pictures with automatic fallback
 * for missing or broken image links.
 */
const UserAvatar = ({ src, alt, className, style, highRes = false, onClick }) => {
  const [imgSrc, setImgSrc] = useState(DEFAULT_AVATAR);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!src) {
      setImgSrc(DEFAULT_AVATAR);
      return;
    }

    const processedUrl = highRes ? getFullImageUrl(getHighResPhoto(src)) : getFullImageUrl(src);
    setImgSrc(processedUrl);
    setHasError(false);
  }, [src, highRes]);

  const handleError = () => {
    if (!hasError) {
      setImgSrc(DEFAULT_AVATAR);
      setHasError(true);
    }
  };

  return (
    <img
      src={imgSrc}
      alt={alt || 'User Profile'}
      className={className}
      style={style}
      onError={handleError}
      onClick={onClick}
    />
  );
};

UserAvatar.propTypes = {
  src: PropTypes.string,
  alt: PropTypes.string,
  className: PropTypes.string,
  style: PropTypes.object,
  highRes: PropTypes.bool,
  onClick: PropTypes.func,
};

export default UserAvatar;
