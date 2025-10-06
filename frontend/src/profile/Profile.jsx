import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import "./Profile.css";
import { useNavigate } from "react-router-dom";
import { FaEdit, FaPlus, FaTimes, FaStar } from "react-icons/fa";
import { useTheme } from "../context/themecontext";
import api from "../server/api";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import HeaderProfile from "../components/HeaderProfile";
import { useQuery } from "@tanstack/react-query";
import {
  fetchUserPhotos,
  fetchCurrentUser,
  fetchUserInfo,
} from "../lib/queries";

const MAX_CHARS = 400;
const MAX_NICKNAME = 30;

const ProfileStat = ({ count, label }) => (
  <div className="profile-stat">
    <span className="stat-count">{count}</span>
    <span className="stat-label">{label}</span>
  </div>
);

const Profile = () => {
  const { t } = useTranslation();
  const userEmail = localStorage.getItem("userEmail");
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  const [userInfo, setUserInfo] = useState({ detail: "" });
  const [tempInfo, setTempInfo] = useState({ detail: "" });
  const [nickName, setNickName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userPhotos, setUserPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const { data: photoUsers, refetch: refetchPhotos } = useQuery({
    queryKey: ["userPhotos", userEmail],
    queryFn: () => fetchUserPhotos(userEmail),
    enabled: !!userEmail,
  });
  const { data: infoUser = { detail: "" }, refetch: refetchUserInfo } =
    useQuery({
      queryKey: ["userInfos", userEmail],
      queryFn: () => fetchUserInfo(userEmail),
      enabled: !!userEmail,
    });
  const { data: currentUser, refetch: refetchCurrentUser } = useQuery({
    queryKey: ["currentUser", userEmail],
    queryFn: () => fetchCurrentUser(userEmail),
    enabled: !!userEmail,
  });

  useEffect(() => {
    if (!userEmail) {
      setLoading(false);
      return;
    }
    try {
      if (infoUser && infoUser.length > 0) {
        setTempInfo(infoUser);
        setUserInfo(infoUser);
      } else {
        refetchUserInfo();
      }
      if (currentUser && currentUser.length > 0) {
        setFollowers(currentUser.followers || []);
        setFollowing(currentUser.following || []);
      } else {
        refetchCurrentUser();
      }
      if (photoUsers && photoUsers.length > 0) {
        setUserPhotos(photoUsers);
      } else {
        refetchPhotos();
      }
      setLoading(true);
    } catch (err) {
      setError("Could not fetch profile data.");
      toast.error("Could not fetch profile data.");
    } finally {
      setLoading(false);
    }
  }, [userEmail, userInfo, currentUser, photoUsers, refetchCurrentUser, refetchPhotos, refetchUserInfo]);

  const handleSaveNickName = async () => {
    if (!nickName.trim()) {
      toast.error(t('nicknameCannotBeEmpty'));
      return;
    }
    if (nickName.length > MAX_NICKNAME) {
      toast.error(t('nicknameTooLong', { max: MAX_NICKNAME }));
      return;
    }

    try {
      await api.post(`/api/save-user-name`, { userEmail, nickName });
      toast.success(t('nicknameUpdated'));
      setIsEditingName(false);
    } catch (err) {
      toast.error(t('failedToUpdateNickname'));
    }
  };

  const handleSaveAbout = async () => {
    if (tempInfo.detail.length > MAX_CHARS) {
      toast.error(t('aboutMeTooLong', { max: MAX_CHARS }));
      return;
    }

    try {
      await api.post(`/api/save-user-info`, {
        email: userEmail,
        userInfo: tempInfo,
      });
      setUserInfo(tempInfo);
      setIsEditingAbout(false);
      toast.success(t('profileUpdated'));
    } catch (error) {
      toast.error(t('failedToSaveProfile'));
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t('pleaseUploadImage'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('fileSizeTooLarge'));
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("photo", file);
    formData.append("email", userEmail);

    try {
      const response = await api.post(`/api/upload-user-photo`, formData);
      if (response.data.success) {
        await refetchPhotos();
        toast.success(t('photoUploaded'));
      } else {
        throw new Error(response.data.message || t('uploadFailed'));
      }
    } catch (err) {
      toast.error(err.message || t('uploadFailed'));
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
      toast.success(t('profilePhotoUpdated'));
    } catch (error) {
      toast.error(t('failedToUpdateProfilePhoto'));
    }
  };

  const handleSetMainPhoto = (selectedPhoto) => {
    if (userPhotos[0]?._id === selectedPhoto._id) return;

    const newOrder = [
      selectedPhoto,
      ...userPhotos.filter((p) => p._id !== selectedPhoto._id),
    ];

    setUserPhotos(newOrder);
    localStorage.setItem("userPhoto", selectedPhoto.url);

    const photoIds = newOrder.map((p) => p._id);
    handleSavePhotoOrder(photoIds);
  };

  const handleRemovePhoto = async (photoId) => {
    const isMainPhoto = userPhotos[0]?._id === photoId;
    const remainingPhotos = userPhotos.filter((photo) => photo._id !== photoId);

    try {
      const response = await api.delete(`/api/user-photo/${photoId}`, {
        data: { email: userEmail },
      });
      if (response.data.success) {
        setUserPhotos(remainingPhotos);
        toast.success(t('photoDeleted'));

        if (isMainPhoto && remainingPhotos.length > 0) {
          localStorage.setItem("userPhoto", remainingPhotos[0].url);
        } else if (remainingPhotos.length === 0) {
          localStorage.removeItem("userPhoto");
        }
      } else {
        throw new Error(response.data.message || t('deletionFailed'));
      }
    } catch (err) {
      toast.error(err.message || t('deletionFailed'));
    }
  };
  const getFullImageUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http")) {
      return url;
    }
    return `${import.meta.env.VITE_APP_API_BASE_URL}${url}`;
  };

  if (loading) {
    return <div className="profile-loading">{t('loadingProfile')}</div>;
  }

  if (!userEmail) {
    return (
      <div className={`profile-page ${isDarkMode ? "dark-mode" : ""}`}>
        <div className="login-prompt">
          <h2>{t('pleaseLogin')}</h2>
          <p>{t('loginToViewProfile')}</p>
          <Button onClick={() => navigate("/login")}>{t('goToLogin')}</Button>
        </div>
      </div>
    );
  }

  const mainProfilePhoto =
    userPhotos.length > 0
      ? userPhotos[0].url
      : localStorage.getItem("userPhoto");
  return (
    <div className={`profile-page ${isDarkMode ? "dark-mode" : ""}`}>
      <ToastContainer
        theme={isDarkMode ? "dark" : "light"}
        position="bottom-right"
      />
      <header className="header-home">
        <HeaderProfile />
      </header>

      <div className="profile-content-new">
        <div className="profile-card-new">
          <div className="profile-header-new">
            <div className="profile-image-container">
              <img
                src={getFullImageUrl(mainProfilePhoto)}
                alt="Profile"
                className="profile-image-new"
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
                  <Button onClick={handleSaveNickName} className="save-btn">
                    {t('save')}
                  </Button>
                  <Button
                    onClick={() => setIsEditingName(false)}
                    className="cancel-btn"
                  >
                    {t('cancel')}
                  </Button>
                </div>
              ) : (
                <h1 className="profile-nickname">
                  {nickName}
                  <FaEdit
                    onClick={() => setIsEditingName(true)}
                    className="edit-icon-new"
                  />
                </h1>
              )}
              <div className="profile-stats">
                <ProfileStat count={userPhotos.length} label={t('photos')} />
                <ProfileStat count={followers.length} label={t('followers')} />
                <ProfileStat count={following.length} label={t('following')} />
              </div>
            </div>
          </div>

          <div className="profile-about">
            <h3>{t('aboutMe')}</h3>
            {isEditingAbout ? (
              <div className="edit-container">
                <textarea
                  value={tempInfo.detail}
                  onChange={(e) =>
                    setTempInfo({ ...tempInfo, detail: e.target.value })
                  }
                  maxLength={MAX_CHARS}
                  className="about-textarea"
                />
                <p className="char-counter">
                  {tempInfo.detail.length} / {MAX_CHARS}
                </p>
                <Button onClick={handleSaveAbout} className="save-btn">
                  {t('save')}
                </Button>
                <Button
                  onClick={() => setIsEditingAbout(false)}
                  className="cancel-btn"
                >
                  {t('cancel')}
                </Button>
              </div>
            ) : (
              <p onClick={() => setIsEditingAbout(true)} className="about-text">
                {userInfo.detail || t('tellUsAboutYourself')}
                <FaEdit className="edit-icon-new" />
              </p>
            )}
          </div>
        </div>

        <div className="profile-gallery">
          <h3>{t('myPhotos')}</h3>
          <div className="photo-grid">
            {userPhotos.map((photo) => (
              <div key={photo._id} className="photo-wrapper">
                <img src={getFullImageUrl(photo.url)} alt="User photo" />
                <div className="photo-overlay">
                  {userPhotos[0]?._id !== photo._id ? (
                    <button
                      className="set-main-btn"
                      onClick={() => handleSetMainPhoto(photo)}
                      title={t('setAsProfilePicture')}
                    >
                      <FaStar />
                    </button>
                  ) : (
                    <div
                      className="main-photo-badge"
                      title={t('currentProfilePicture')}
                    >
                      <FaStar />
                    </div>
                  )}
                  <button
                    className="remove-photo-btn-gallery"
                    onClick={() => handleRemovePhoto(photo._id)}
                    title={t('removePhoto')}
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>
            ))}
            {userPhotos.length < 9 && (
              <div
                className="add-photo-box"
                onClick={() => fileInputRef.current.click()}
              >
                {uploading ? (
                  <div className="loader"></div>
                ) : (
                  <>
                    <FaPlus />
                    <span>{t('addPhoto')}</span>
                  </>
                )}
              </div>
            )}
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePhotoUpload}
            style={{ display: "none" }}
            accept="image/*"
            disabled={uploading}
          />
        </div>
      </div>
    </div>
  );
};

export default Profile;