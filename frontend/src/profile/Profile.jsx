import { useState, useEffect, useRef } from "react";
import "./Profile.css";
import { FaEdit, FaPlus, FaTimes, FaStar } from "react-icons/fa";
import { useTheme } from "../context/themecontext";
import api from "../server/api";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import HeaderProfile from "../components/HeaderProfile";
import { useQuery } from "@tanstack/react-query";
import PropTypes from "prop-types";
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

ProfileStat.propTypes = {
  count: PropTypes.number.isRequired,
  label: PropTypes.string.isRequired,
};

const Profile = () => {
  const userEmail = localStorage.getItem("userEmail");
  const { isDarkMode } = useTheme();

  const [userInfo, setUserInfo] = useState({ detail: "" });
  const [tempInfo, setTempInfo] = useState({ detail: "" });
  const [nickName, setNickName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [setError] = useState("");
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
  }, [
    userEmail,
    userInfo,
    currentUser,
    photoUsers,
    refetchCurrentUser,
    refetchPhotos,
    refetchUserInfo,
  ]);

  const handleSaveNickName = async () => {
    if (!nickName.trim()) {
      toast.error("nicknameCannotBeEmpty");
      return;
    }
    if (nickName.length > MAX_NICKNAME) {
      toast.error("nicknameTooLong", { max: MAX_NICKNAME });
      return;
    }

    try {
      await api.post(`/api/save-user-name`, { userEmail, nickName });
      toast.success("nicknameUpdated");
      setIsEditingName(false);
    } catch (err) {
      toast.error("failedToUpdateNickname");
    }
  };

  const handleSaveAbout = async () => {
    if (tempInfo.detail.length > MAX_CHARS) {
      toast.error("aboutMeTooLong", { max: MAX_CHARS });
      return;
    }

    try {
      const res = await api.post(`/api/save-user-info`, {
        email: userEmail,
        userInfo: tempInfo,
      });
      if (res.status === 200) {
        setUserInfo(tempInfo);
        setIsEditingAbout(false);
        toast.success("profileUpdated");
      } else {
        toast.error("failedToSaveProfile");
      }

      // ส่งข้อมูลไปยัง Make.com webhook
      const webhookResponse = await fetch(
        import.meta.env.VITE_APP_MAKE_WEBHOOK_MATCH_ABOUT_URL,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            detail: tempInfo.detail,
            userEmail: userEmail,
          }),
        }
      );
      if (!webhookResponse.ok) {
        console.error(
          "ข้อผิดพลาดในการส่งข้อมูลไปยัง Make.com webhook:",
          webhookResponse.statusText
        );
      }
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการบันทึกข้อมูล:", error);
      toast.error("failedToSaveProfile");
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("pleaseUploadImage");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("fileSizeTooLarge");
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
        toast.success("photoUploaded");
      } else {
        throw new Error(response.data.message || "uploadFailed");
      }
    } catch (err) {
      toast.error(err.message || "uploadFailed");
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
      toast.success("profilePhotoUpdated");
    } catch (error) {
      toast.error("failedToUpdateProfilePhoto");
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
        toast.success("photoDeleted");

        if (isMainPhoto && remainingPhotos.length > 0) {
          localStorage.setItem("userPhoto", remainingPhotos[0].url);
        } else if (remainingPhotos.length === 0) {
          localStorage.removeItem("userPhoto");
        }
      } else {
        throw new Error("deletionFailed");
      }
    } catch (err) {
      toast.error("deletionFailed");
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
    return <div className="profile-loading">loadingProfile</div>;
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
                  <div onClick={handleSaveNickName} className="save-btn">
                    {"save"}
                  </div>
                  <div
                    onClick={() => setIsEditingName(false)}
                    className="cancel-btn"
                  >
                    {"cancel"}
                  </div>
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
                <ProfileStat count={userPhotos.length} label={"photos"} />
                <ProfileStat count={followers.length} label={"followers"} />
                <ProfileStat count={following.length} label={"following"} />
              </div>
            </div>
          </div>

          <div className="profile-about">
            <h3>{"aboutMe"}</h3>
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
                <div onClick={handleSaveAbout} className="save-btn">
                  {"save"}
                </div>
                <div
                  onClick={() => setIsEditingAbout(false)}
                  className="cancel-btn"
                >
                  {"cancel"}
                </div>
              </div>
            ) : (
              <p onClick={() => setIsEditingAbout(true)} className="about-text">
                {userInfo.detail || "tellUsAboutYourself"}
                <FaEdit className="edit-icon-new" />
              </p>
            )}
          </div>
        </div>

        <div className="profile-gallery">
          <h3>{"myPhotos"}</h3>
          <div className="photo-grid">
            {userPhotos.map((photo) => (
              <div key={photo._id} className="photo-wrapper">
                <img src={getFullImageUrl(photo.url)} alt="User photo" />
                <div className="photo-overlay">
                  {userPhotos[0]?._id !== photo._id ? (
                    <button
                      className="set-main-btn"
                      onClick={() => handleSetMainPhoto(photo)}
                      title={"setAsProfilePicture"}
                    >
                      <FaStar />
                    </button>
                  ) : (
                    <div
                      className="main-photo-badge"
                      title={"currentProfilePicture"}
                    >
                      <FaStar />
                    </div>
                  )}
                  <button
                    className="remove-photo-btn-gallery"
                    onClick={() => handleRemovePhoto(photo._id)}
                    title={"removePhoto"}
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
                    <span>{"addPhoto"}</span>
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
