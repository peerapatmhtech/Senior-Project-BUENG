import PropTypes from 'prop-types';
import UserAvatar from '../../../components/UserAvatar';

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
  aboutMe,
  matchedEvent,
  communityMembers,
}) => {
  const displayName =
    matchedUser?.displayName || userImage?.displayName || userImage?.name || 'ไม่มีชื่อ';

  const displayEmail = !isCom
    ? matchedUser?.email || (userImage.email === userEmail ? userImage.usermatch : userImage.email)
    : null;

  return (
    <div className="profile-modal-body">
      <div className="profile-modal-user">
        <UserAvatar
          src={profilePhotoUrl}
          alt={displayName}
          className="profile-modal-avatar"
          highRes={true}
        />
        <div className="profile-modal-user-info">
          <div className="profile-modal-name">{displayName}</div>
          {displayEmail && <div className="profile-modal-email">{displayEmail}</div>}
        </div>
      </div>

      <div className="profile-modal-details-card">
        {isCom ? (
          <div className="profile-modal-com-info">
            <div className="info-row">
              <span className="info-label">สร้างโดย:</span>
              <span className="info-value">{userImage.createdBy || '-'}</span>
            </div>
            {userImage.description && (
              <div className="info-row description">
                <span className="info-label">รายละเอียด:</span>
                <span className="info-value">{userImage.description}</span>
              </div>
            )}
            {communityMembers && communityMembers.length > 0 && (
              <div className="info-row members-list-wrapper">
                <span className="info-label">รายชื่อสมาชิก ({communityMembers.length}):</span>
                <div className="members-name-list">
                  {communityMembers.map((member) => (
                    <span key={member._id || member.email} className="member-name-badge">
                      {member.nickname || member.displayName || member.email.split('@')[0]}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="profile-modal-follow-section">
            <div className="follow-stats">
              <div className="stat-item">
                <span className="stat-number">{followers?.length || 0}</span>
                <span className="stat-label">ผู้ติดตาม</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <span className="stat-number">{following?.length || 0}</span>
                <span className="stat-label">กำลังติดตาม</span>
              </div>
            </div>

            {deleteType === 'match' && matchedEvent && (
              <div className="info-row match-event-info">
                <span className="info-label">กิจกรรมที่เข้าร่วม:</span>
                <span className="info-value">
                  {matchedEvent.title || matchedEvent.name || 'ไม่ระบุ'}
                </span>
              </div>
            )}

            {deleteType === 'friend' && aboutMe && (
              <div className="info-row user-about-info">
                <span className="info-label">เกี่ยวกับฉัน:</span>
                <span className="info-value about-text-content">{aboutMe}</span>
              </div>
            )}

            <button
              className={`action-btn follow-btn ${isFollowing ? 'following' : ''}`}
              onClick={handleFollowClick}
              disabled={isFollowLoading}
            >
              {isFollowLoading ? 'กำลังดำเนินการ...' : isFollowing ? 'กำลังติดตาม' : 'ติดตาม'}
            </button>
          </div>
        )}
      </div>

      <div className="profile-modal-actions-bottom">
        <button
          className="action-btn delete-btn"
          onClick={handleDeleteClick}
          disabled={isDeleteLoading}
        >
          {isDeleteLoading
            ? 'กำลังลบ...'
            : deleteType === 'match'
              ? 'ยกเลิกแมตช์'
              : deleteType === 'room'
                ? 'ออกจากกลุ่ม'
                : 'ลบเพื่อน'}
        </button>
      </div>
    </div>
  );
};

ProfileModalBody.propTypes = {
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
  aboutMe: PropTypes.string,
  matchedEvent: PropTypes.object,
  communityMembers: PropTypes.array,
};

export default ProfileModalBody;
