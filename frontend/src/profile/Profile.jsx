import { useState, useRef } from 'react';
import './Profile.css';
import { FaEdit, FaPlus, FaTimes, FaStar } from 'react-icons/fa';
import { useTheme } from '../context/themecontext';
import api from '../server/api';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import HeaderProfile from '../components/HeaderProfile';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PropTypes from 'prop-types';
import { fetchUserPhotos, fetchCurrentUser, fetchUserInfo } from '../lib/queries';
import UserAvatar from '../components/UserAvatar';

const MAX_CHARS = 400;
const MAX_NICKNAME = 30;

const ProfileStat = ({ count, label }) => (
  <div className="profile-stat">
    <span className="stat-count">{count}</span>
    <span className="stat-label">{label}</span>
  </div>
);

ProfileStat.propTypes = {
  count: PropTypes.number.isRequired,
  label: PropTypes.string.isRequired,
};

const Profile = () => {
  const userEmail = localStorage.getItem('userEmail');
  const { isDarkMode } = useTheme();
  const queryClient = useQueryClient();

  // Form States (Draft) - ใช้เฉพาะตอนแก้ไข
  const [tempInfo, setTempInfo] = useState({ detail: '' });
  const [nickName, setNickName] = useState('');

  // UI States
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);

  // Server States - ใช้สำหรับแสดงผล
  const {
    data: photoUsers = [],
    refetch: refetchPhotos,
    isLoading: isLoadingPhotos,
  } = useQuery({
    queryKey: ['userPhotos', userEmail],
    queryFn: () => fetchUserPhotos(userEmail),
    enabled: !!userEmail,
  });
  const { data: infoUser = { detail: '' }, isLoading: isLoadingInfo } = useQuery({
    queryKey: ['userInfos', userEmail],
    queryFn: () => fetchUserInfo(userEmail),
    enabled: !!userEmail,
  });
  const { data: currentUser = {}, isLoading: isLoadingUser } = useQuery({
    queryKey: ['currentUser', userEmail],
    queryFn: () => fetchCurrentUser(userEmail),
    enabled: !!userEmail,
  });
  const loading = isLoadingPhotos || isLoadingInfo || isLoadingUser;

  // Derived Data
  const followers = currentUser.followers || [];
  const following = currentUser.following || [];

  const handleSaveNickName = async () => {
    if (!nickName.trim()) {
      toast.error('nicknameCannotBeEmpty');
      return;
    }
    if (nickName.length > MAX_NICKNAME) {
      toast.error('nicknameTooLong', { max: MAX_NICKNAME });
      return;
    }

    try {
      await api.post(`/api/save-user-name`, { userEmail, nickName });
      toast.success('nicknameUpdated');
      
      localStorage.setItem('userName', nickName);
      
      // React Query v5 syntax: { queryKey: [...] }
      queryClient.invalidateQueries({ queryKey: ['currentUser', userEmail] });
      queryClient.invalidateQueries({ queryKey: ['userInfos', userEmail] });
      // Invalidate users cache เพื่อให้ card ใน RoomMatch ใช้ displayName ใหม่
      queryClient.invalidateQueries({ queryKey: ['users'] });
      
      setIsEditingName(false);
    } catch (err) {
      toast.error('failedToUpdateNickname');
    }
  };

  const handleSaveAbout = async () => {
    if ((tempInfo.detail || '').length > MAX_CHARS) {
      toast.error('aboutMeTooLong', { max: MAX_CHARS });
      return;
    }

    if (isSaving) return;
    setIsSaving(true);

    try {
      const res = await api.post(`/api/save-user-info`, {
        email: userEmail,
        userInfo: tempInfo,
      });
      if (res.status === 200) {
        queryClient.invalidateQueries({ queryKey: ['userInfos', userEmail] }); // Sync ข้อมูลใหม่จาก Server
        queryClient.invalidateQueries({ queryKey: ['currentUser', userEmail] }); 
        queryClient.invalidateQueries({ queryKey: ['users'] }); 
        setIsEditingAbout(false);
        toast.success('profileUpdated');
      } else {
        toast.error('failedToSaveProfile');
      }
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล:', error);
      toast.error('failedToSaveProfile');
    } finally {
      // Debounce delay to prevent double-clicking or rapid changes
      setTimeout(() => setIsSaving(true), 1000); // Wait 1s before allowing another save
      // Wait, actually I should set it back to FALSE to allow next save after delay
      setTimeout(() => setIsSaving(false), 1000);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('pleaseUploadImage');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('fileSizeTooLarge');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('email', userEmail);

    try {
      const response = await api.post(`/api/upload-user-photo`, formData);
      if (response.data.success) {
        const updated = await refetchPhotos();
        // อัพเดท localStorage และ invalidate cache ของ HeaderProfile ให้วงกลมมุมบนขวาเปลี่ยนด้วย
        // updated.data คือ array ของรูปภาพที่ fetchUserPhotos return กลับมา
        const updatedPhotos = Array.isArray(updated?.data) ? updated.data : [];
        if (updatedPhotos.length > 0) {
          localStorage.setItem('userPhoto', updatedPhotos[0].url);
        }
        queryClient.invalidateQueries({ queryKey: ['userPhotos', userEmail] });
        queryClient.invalidateQueries({ queryKey: ['users'] });
        toast.success('photoUploaded');
      } else {
        throw new Error(response.data.message || 'uploadFailed');
      }
    } catch (err) {
      toast.error(err.message || 'uploadFailed');
    } finally {
      setUploading(false);
    }
  };

  const handleSavePhotoOrder = async (photoIds) => {
    try {
      await api.post(`/api/user-photos/reorder`, {
        email: userEmail,
        photoIds,
      });
      toast.success('profilePhotoUpdated');
    } catch (error) {
      toast.error('failedToUpdateProfilePhoto');
    }
  };

  const handleSetMainPhoto = (selectedPhoto) => {
    if (photoUsers[0]?._id === selectedPhoto._id) return;

    const newOrder = [selectedPhoto, ...photoUsers.filter((p) => p._id !== selectedPhoto._id)];

    // Optimistic Update: อัปเดต Cache ทันทีเพื่อให้ UI เปลี่ยนโดยไม่ต้องรอ Refetch
    queryClient.setQueryData(['userPhotos', userEmail], newOrder);
    // อัพเดท localStorage เพื่อให้วงกลมมุมบนขวา (HeaderProfile) เห็นรูปใหม่ทันที
    localStorage.setItem('userPhoto', selectedPhoto.url);
    // Invalidate users cache เพื่อให้ RoomMatch / UserCard เห็นรูปใหม่ด้วย
    queryClient.invalidateQueries({ queryKey: ['users'] });

    const photoIds = newOrder.map((p) => p._id);
    handleSavePhotoOrder(photoIds);
  };

  const handleRemovePhoto = async (photoId) => {
    const isMainPhoto = photoUsers[0]?._id === photoId;
    const remainingPhotos = photoUsers.filter((photo) => photo._id !== photoId);

    try {
      const response = await api.delete(`/api/user-photo/${photoId}`, {
        data: { email: userEmail },
      });
      if (response.data.success) {
        // อัปเดต Cache ทันที หรือจะใช้ refetchPhotos() ก็ได้
        queryClient.setQueryData(['userPhotos', userEmail], remainingPhotos);
        toast.success('photoDeleted');

        if (isMainPhoto && remainingPhotos.length > 0) {
          localStorage.setItem('userPhoto', remainingPhotos[0].url);
        } else if (remainingPhotos.length === 0) {
          localStorage.removeItem('userPhoto');
        }
      } else {
        throw new Error('deletionFailed');
      }
    } catch (err) {
      toast.error('deletionFailed');
    }
  };

  if (loading) {
    return <div className="profile-loading">loadingProfile</div>;
  }

  const mainProfilePhoto =
    photoUsers.length > 0 ? photoUsers[0].url : localStorage.getItem('userPhoto');
  return (
    <div className={`profile-page ${isDarkMode ? 'dark-mode' : ''}`}>
      <ToastContainer theme={isDarkMode ? 'dark' : 'light'} position="bottom-right" />
      <header className="header-home">
        <HeaderProfile />
      </header>

      <div className="profile-content-new">
        <div className="profile-card-new">
          <div className="profile-header-new">
            <div className="profile-image-container">
              <UserAvatar
                src={mainProfilePhoto}
                alt="Profile"
                className="profile-image-new"
                highRes={true}
              />
            </div>
            <div className="profile-info-new">
              {isEditingName ? (
                <div className="edit-container">
                  <input
                    type="text"
                    value={nickName}
                    onChange={(e) => setNickName(e.target.value)}
                    maxLength={MAX_NICKNAME}
                    className="nickname-input"
                  />
                  <div onClick={handleSaveNickName} className="save-btn">
                    {'save'}
                  </div>
                  <div onClick={() => setIsEditingName(false)} className="cancel-btn">
                    {'cancel'}
                  </div>
                </div>
              ) : (
                <h1 className="profile-nickname">
                  {infoUser.nickname || currentUser.displayName}
                  <FaEdit
                    onClick={() => {
                      setNickName(infoUser.nickname || currentUser.displayName || '');
                      setIsEditingName(true);
                    }}
                    className="edit-icon-new"
                  />
                </h1>
              )}
              <div className="profile-stats">
                <ProfileStat count={photoUsers.length} label={'photos'} />
                <ProfileStat count={followers.length} label={'followers'} />
                <ProfileStat count={following.length} label={'following'} />
              </div>
            </div>
          </div>

          <div className="profile-about">
            <h3>{'aboutMe'}</h3>
            {isEditingAbout ? (
              <div className="edit-container">
                <textarea
                  value={tempInfo.detail}
                  onChange={(e) => setTempInfo({ ...tempInfo, detail: e.target.value })}
                  maxLength={MAX_CHARS}
                  className="about-textarea"
                />
                <p className="char-counter">
                  {tempInfo.detail.length} / {MAX_CHARS}
                </p>
                <div onClick={handleSaveAbout} className="save-btn">
                  {'save'}
                </div>
                <div onClick={() => setIsEditingAbout(false)} className="cancel-btn">
                  {'cancel'}
                </div>
              </div>
            ) : (
              <p
                onClick={() => {
                  setTempInfo({ detail: infoUser?.userInfo?.detail || infoUser?.detail || '' });
                  setIsEditingAbout(true);
                }}
                className="about-text"
              >
                {infoUser?.userInfo?.detail || infoUser?.detail || 'tellUsAboutYourself'}
                <FaEdit className="edit-icon-new" />
              </p>
            )}
          </div>
        </div>

        <div className="profile-gallery">
          <h3>{'myPhotos'}</h3>
          <div className="photo-grid">
            {photoUsers.map((photo) => (
              <div key={photo._id} className="photo-wrapper">
                <UserAvatar src={photo.url} alt="User photo" />

                <div className="photo-overlay">
                  {photoUsers[0]?._id !== photo._id ? (
                    <button
                      className="set-main-btn"
                      onClick={() => handleSetMainPhoto(photo)}
                      title={'setAsProfilePicture'}
                    >
                      <FaStar />
                    </button>
                  ) : (
                    <div className="main-photo-badge" title={'currentProfilePicture'}>
                      <FaStar />
                    </div>
                  )}
                  <button
                    className="remove-photo-btn-gallery"
                    onClick={() => handleRemovePhoto(photo._id)}
                    title={'removePhoto'}
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>
            ))}
            {photoUsers.length < 9 && (
              <div className="add-photo-box" onClick={() => fileInputRef.current.click()}>
                {uploading ? (
                  <div className="loader"></div>
                ) : (
                  <>
                    <FaPlus />
                    <span>{'addPhoto'}</span>
                  </>
                )}
              </div>
            )}
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePhotoUpload}
            style={{ display: 'none' }}
            accept="image/*"
            disabled={uploading}
          />
        </div>
      </div>
    </div>
  );
};

export default Profile;
