import PropTypes from "prop-types";

const ProfileModalBody = ({
  getFullImageUrl,
  getHighResPhoto,
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
  return (
    <div className="profile-modal-body">
      <div className="profile-modal-user">
        <img
          src={getFullImageUrl(getHighResPhoto(profilePhotoUrl))}
          alt={
            matchedUser?.displayName ||
            userImage?.displayName ||
            "ผู้ใช้" ||
            userImage.name ||
            "ไม่มีชื่อ"
          }
          className="profile-modal-avatar"
        />
        <div className="profile-modal-name">
          {matchedUser?.displayName ||
            userImage?.displayName ||
            userImage?.name ||
            "ไม่มีชื่อ"}
        </div>
        <div className="profile-modal-email">
          {userImage.email === userEmail
            ? userImage.usermatch
            : userImage.email}
        </div>
      </div>
      <div className="profile-modal-follow-info">
        {isCom ? (
          <ul className="show-com">
            <li>
              <span className="Created">Created By : </span>
              <span className="Created-detail">{userImage.createdBy}</span>
            </li>
            <li>
              <span className="Created">Description : </span>
              <span className="Created-detail">{userImage.description}</span>
            </li>
          </ul>
        ) : (
          <div className="profile-modal-follow-info-details">
            <div className="profile-modal-follow-info-header">
              <ul className="followers">
                <li>{followers?.length || 0} followers</li>
              </ul>
              <ul className="following">
                <li>{following?.length || 0} following</li>
              </ul>
            </div>
            <button
              className="chat-dropdown-item"
              onClick={handleFollowClick}
              disabled={isFollowLoading}
            >
              {isFollowLoading
                ? "กำลังดำเนินการ..."
                : isFollowing
                ? "กำลังติดตาม"
                : "ติดตาม"}
            </button>
          </div>
        )}
      </div>

      <button
        className="modal-profile"
        onClick={handleDeleteClick}
        disabled={isDeleteLoading}
      >
        {isDeleteLoading
          ? "กำลังลบ..."
          : deleteType === "match"
          ? "ยกเลิกแมตช์"
          : deleteType === "room"
          ? "ออกจากกลุ่ม"
          : "ลบเพื่อน"}
      </button>
    </div>
  );
};

ProfileModalBody.propTypes = {
  getFullImageUrl: PropTypes.func.isRequired,
  getHighResPhoto: PropTypes.func.isRequired,
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