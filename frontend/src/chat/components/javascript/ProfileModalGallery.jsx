import PropTypes from "prop-types";

const ProfileModalGallery = ({ userPhotosData, getFullImageUrl }) => {
  if (!userPhotosData || userPhotosData.length === 0) return null;

  return (
    <div className="profile-modal-gallery">
      <div className="photo-grid">
        {userPhotosData.map((photo) => (
          <div key={photo.url} className="photo-grid-item">
            <img src={getFullImageUrl(photo.url)} alt="User upload" />
          </div>
        ))}
      </div>
    </div>
  );
};

ProfileModalGallery.propTypes = {
  userPhotosData: PropTypes.array,
  getFullImageUrl: PropTypes.func.isRequired,
};

export default ProfileModalGallery;
