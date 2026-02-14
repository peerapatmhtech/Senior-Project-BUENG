import PropTypes from 'prop-types';
import UserAvatar from '../../../components/UserAvatar';

const ProfileModalGallery = ({ userPhotosData }) => {
  if (!userPhotosData || userPhotosData.length === 0) return null;

  return (
    <div className="profile-modal-gallery">
      <div className="photo-grid">
        {userPhotosData.map((photo) => (
          <div key={photo.url} className="photo-grid-item">
            <UserAvatar src={photo.url} alt="User upload" />
          </div>
        ))}
      </div>
    </div>
  );
};

ProfileModalGallery.propTypes = {
  userPhotosData: PropTypes.array,
};

export default ProfileModalGallery;
