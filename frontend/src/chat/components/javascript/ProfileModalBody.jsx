import PropTypes from 'prop-types';
import { getFullImageUrl, getHighResPhoto } from '../../../common/utils/image';

const ProfileModalBody = ({
  profilePhotoUrl,
  matchedUser,
  userImage,
  userEmail,
  isCom,
  followers,
  following,
  handleFollowClick,
  isFollowLoading,
  isFollowing,
  handleDeleteClick,
  isDeleteLoading,
  deleteType,
}) => {
  const displayName =
    matchedUser?.displayName || userImage?.displayName || userImage?.name || 'ไม่มีชื่อ';

  const displayEmail = !isCom
    ? matchedUser?.email || (userImage.email === userEmail ? userImage.usermatch : userImage.email)
    : null;

  return (
    <div className="profile-modal-body">
      <div className="profile-modal-user">
        <img
          src={getFullImageUrl(getHighResPhoto(profilePhotoUrl))}
          alt={displayName}
          className="profile-modal-avatar"
        />
        <div className="profile-modal-name">{displayName}</div>
        {displayEmail && <div className="profile-modal-email">{displayEmail}</div>}
      </div>
      <div className="profile-modal-follow-info">
        {isCom ? (
          <ul className="show-com">
            <li>
              <span className="Created">สร้างโดย : </span>
              <span className="Created-detail">{userImage.createdBy}</span>
            </li>
            <li>
              <span className="Created">รายละเอียด : </span>
              <span className="Created-detail">{userImage.description}</span>
            </li>
          </ul>
        ) : (
          <div className="profile-modal-follow-info-details">
            <div className="profile-modal-follow-info-header">
              <ul className="followers">
                <li>{followers?.length || 0} ผู้ติดตาม</li>
              </ul>
              <ul className="following">
                <li>{following?.length || 0} กำลังติดตาม</li>
              </ul>
            </div>
            <button
              className="chat-dropdown-item"
              onClick={handleFollowClick}
              disabled={isFollowLoading}
            >
              {isFollowLoading ? 'กำลังดำเนินการ...' : isFollowing ? 'กำลังติดตาม' : 'ติดตาม'}
            </button>
          </div>
        )}
      </div>

      <button className="modal-profile" onClick={handleDeleteClick} disabled={isDeleteLoading}>
        {isDeleteLoading
          ? 'กำลังลบ...'
          : deleteType === 'match'
            ? 'ยกเลิกแมตช์'
            : deleteType === 'room'
              ? 'ออกจากกลุ่ม'
              : 'ลบเพื่อน'}
      </button>
    </div>
  );
};

ProfileModalBody.propTypes = {
  getFullImageUrl: PropTypes.func.isRequired,
  profilePhotoUrl: PropTypes.string,
  matchedUser: PropTypes.object,
  userImage: PropTypes.object.isRequired,
  userEmail: PropTypes.string,
  isCom: PropTypes.bool,
  followers: PropTypes.array,
  following: PropTypes.array,
  handleFollowClick: PropTypes.func.isRequired,
  isFollowLoading: PropTypes.bool.isRequired,
  isFollowing: PropTypes.bool,
  handleDeleteClick: PropTypes.func.isRequired,
  isDeleteLoading: PropTypes.bool.isRequired,
  deleteType: PropTypes.string.isRequired,
};

export default ProfileModalBody;
