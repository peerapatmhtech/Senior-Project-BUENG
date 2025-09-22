import React, { useState, useEffect, useRef, useCallback } from "react";
import "./Profile.css";
import { Button } from "../ui";
import { useNavigate } from "react-router-dom";
import { FaEdit, FaCamera, FaPlus, FaTimes, FaStar } from "react-icons/fa";
import { useTheme } from "../context/themecontext";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import HeaderProfile from "../ui/HeaderProfile";

const MAX_CHARS = 400;
const MAX_NICKNAME = 30;

// A small component for the profile stats
const ProfileStat = ({ count, label }) => (
  <div className="profile-stat">
    <span className="stat-count">{count}</span>
    <span className="stat-label">{label}</span>
  </div>
);

const Profile = () => {
  const userEmail = localStorage.getItem("userEmail");
  const displayName = localStorage.getItem("userName");
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

  const fetchUserPhotos = useCallback(async () => {
    if (!userEmail) return;
    try {
      const photosRes = await axios.get(`${import.meta.env.VITE_APP_API_BASE_URL}/api/user-photos/${encodeURIComponent(userEmail)}`);
      if (photosRes.data.success) {
        setUserPhotos(photosRes.data.data || []);
      } else {
        setUserPhotos([]);
      }
    } catch (err) {
      setUserPhotos([]);
      console.error("Failed to fetch photos", err);
    }
  }, [userEmail]);

  useEffect(() => {
    if (!userEmail) {
      setLoading(false);
      return;
    }

    const fetchAll = async () => {
      setLoading(true);
      try {
        const [userRes, followRes, nickRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_APP_API_BASE_URL}/api/user-info/${encodeURIComponent(userEmail)}`),
          axios.get(`${import.meta.env.VITE_APP_API_BASE_URL}/api/user/${encodeURIComponent(userEmail)}/follow-info`),
          axios.get(`${import.meta.env.VITE_APP_API_BASE_URL}/api/infos?email=${userEmail}`),
        ]);

        setUserInfo(userRes.data || { detail: "" });
        setTempInfo(userRes.data || { detail: "" });
        setFollowers(followRes.data.followers || []);
        setFollowing(followRes.data.following || []);
        setNickName(nickRes.data.nickname || displayName || "");

        await fetchUserPhotos();

      } catch (err) {
        setError("Could not fetch profile data.");
        toast.error("Could not fetch profile data.");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [userEmail, displayName, fetchUserPhotos]);

  const handleSaveNickName = async () => {
    if (!nickName.trim()) {
      toast.error("Nickname cannot be empty.");
      return;
    }
    if (nickName.length > MAX_NICKNAME) {
      toast.error(`Nickname cannot exceed ${MAX_NICKNAME} characters`);
      return;
    }

    try {
      await axios.post(`${import.meta.env.VITE_APP_API_BASE_URL}/api/save-user-name`, { userEmail, nickName });
      toast.success("Nickname updated!");
      setIsEditingName(false);
    } catch (err) {
      toast.error("Failed to update nickname.");
    }
  };

  const handleSaveAbout = async () => {
    if (tempInfo.detail.length > MAX_CHARS) {
      toast.error(`About me cannot exceed ${MAX_CHARS} characters`);
      return;
    }

    try {
      await axios.post(`${import.meta.env.VITE_APP_API_BASE_URL}/api/save-user-info`, { email: userEmail, userInfo: tempInfo });
      setUserInfo(tempInfo);
      setIsEditingAbout(false);
      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error("Failed to save profile.");
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error("File size cannot exceed 5MB.");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("photo", file);
    formData.append("email", userEmail);

    try {
      const response = await axios.post(`${import.meta.env.VITE_APP_API_BASE_URL}/api/upload-user-photo`, formData);
      if (response.data.success) {
        await fetchUserPhotos(); // Correctly refetch photos
        toast.success("Photo uploaded successfully!");
      } else {
        throw new Error(response.data.message || "Upload failed");
      }
    } catch (err) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSavePhotoOrder = async (photoIds) => {
    try {
      await axios.post(
        `${import.meta.env.VITE_APP_API_BASE_URL}/api/user-photos/reorder`,
        {
          email: userEmail,
          photoIds,
        }
      );
      toast.success("Profile photo updated!");
    } catch (error) {
      toast.error("Failed to update profile photo.");
      // Optionally revert state change here
    }
  };

  const handleSetMainPhoto = (selectedPhoto) => {
    if (userPhotos[0]?._id === selectedPhoto._id) return; // It's already the main photo

    const newOrder = [
      selectedPhoto,
      ...userPhotos.filter(p => p._id !== selectedPhoto._id)
    ];

    setUserPhotos(newOrder); // Update UI instantly
    localStorage.setItem("userPhoto", selectedPhoto.url);

    const photoIds = newOrder.map(p => p._id);
    handleSavePhotoOrder(photoIds);
  };

  const handleRemovePhoto = async (photoId) => {
    const isMainPhoto = userPhotos[0]?._id === photoId;
    const remainingPhotos = userPhotos.filter((photo) => photo._id !== photoId);

    try {
      const response = await axios.delete(`${import.meta.env.VITE_APP_API_BASE_URL}/api/user-photo/${photoId}`, { data: { email: userEmail } });
      if (response.data.success) {
        setUserPhotos(remainingPhotos);
        toast.success("Photo deleted");

        if (isMainPhoto && remainingPhotos.length > 0) {
          localStorage.setItem("userPhoto", remainingPhotos[0].url);
        } else if (remainingPhotos.length === 0) {
          localStorage.removeItem("userPhoto");
        }
      } else {
        throw new Error(response.data.message || "Deletion failed");
      }
    } catch (err) {
      toast.error(err.message || "Deletion failed");
    }
  };

  if (loading) {
    return <div className="profile-loading">Loading Profile...</div>;
  }

  if (!userEmail) {
    return (
      <div className={`profile-page ${isDarkMode ? "dark-mode" : ""}`}>
        <div className="login-prompt">
          <h2>Please log in</h2>
          <p>Log in to view and edit your profile.</p>
          <Button onClick={() => navigate("/login")}>Go to Login</Button>
        </div>
      </div>
    );
  }

  const mainProfilePhoto = userPhotos.length > 0 ? userPhotos[0].url : localStorage.getItem("userPhoto");

  return (
    <div className={`profile-page ${isDarkMode ? "dark-mode" : ""}`}>
      <ToastContainer theme={isDarkMode ? "dark" : "light"} position="bottom-right" />
      <header className="header-home">
        <HeaderProfile />
      </header>

      <div className="profile-content-new">
        <div className="profile-card-new">
          <div className="profile-header-new">
            <div className="profile-image-container">
              <img src={mainProfilePhoto} alt="Profile" className="profile-image-new" />
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
                  <Button onClick={handleSaveNickName} className="save-btn">Save</Button>
                  <Button onClick={() => setIsEditingName(false)} className="cancel-btn">Cancel</Button>
                </div>
              ) : (
                <h1 className="profile-nickname">
                  {nickName}
                  <FaEdit onClick={() => setIsEditingName(true)} className="edit-icon-new" />
                </h1>
              )}
              <div className="profile-stats">
                <ProfileStat count={userPhotos.length} label="Photos" />
                <ProfileStat count={followers.length} label="Followers" />
                <ProfileStat count={following.length} label="Following" />
              </div>
            </div>
          </div>

          <div className="profile-about">
            <h3>About Me</h3>
            {isEditingAbout ? (
              <div className="edit-container">
                <textarea
                  value={tempInfo.detail}
                  onChange={(e) => setTempInfo({ ...tempInfo, detail: e.target.value })}
                  maxLength={MAX_CHARS}
                  className="about-textarea"
                />
                <p className="char-counter">{tempInfo.detail.length} / {MAX_CHARS}</p>
                <Button onClick={handleSaveAbout} className="save-btn">Save</Button>
                <Button onClick={() => setIsEditingAbout(false)} className="cancel-btn">Cancel</Button>
              </div>
            ) : (
              <p onClick={() => setIsEditingAbout(true)} className="about-text">
                {userInfo.detail || "Tell us about yourself..."}
                <FaEdit className="edit-icon-new" />
              </p>
            )}
          </div>
        </div>

        <div className="profile-gallery">
          <h3>My Photos</h3>
          <div className="photo-grid">
            {userPhotos.map((photo) => (
              <div key={photo._id} className="photo-wrapper">
                <img src={photo.url} alt="User photo" />
                <div className="photo-overlay">
                  {userPhotos[0]?._id !== photo._id ? (
                    <button
                      className="set-main-btn"
                      onClick={() => handleSetMainPhoto(photo)}
                      title="Set as profile picture"
                    >
                      <FaStar />
                    </button>
                  ) : (
                    <div className="main-photo-badge" title="Current profile picture">
                      <FaStar />
                    </div>
                  )}
                  <button
                    className="remove-photo-btn-gallery"
                    onClick={() => handleRemovePhoto(photo._id)}
                    title="Remove photo"
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>
            ))}
            {userPhotos.length < 9 && (
              <div className="add-photo-box" onClick={() => fileInputRef.current.click()}>
                {uploading ? (
                  <div className="loader"></div>
                ) : (
                  <>
                    <FaPlus />
                    <span>Add Photo</span>
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