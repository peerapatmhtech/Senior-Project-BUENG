import React, { useState, useEffect, useRef } from "react";
import "./Profile.css";
import { Button } from "../ui";
import { useNavigate } from "react-router-dom";
import { FaEdit, FaCamera } from "react-icons/fa";
import { useTheme } from "../context/themecontext";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import HeaderProfile from "../ui/HeaderProfile";

const MAX_CHARS = 400;
const MAX_NICKNAME = 30;

const Profile = () => {
  const userPhoto = localStorage.getItem("userPhoto");
  const userEmail = localStorage.getItem("userEmail");
  const displayName = localStorage.getItem("userName");
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  const [userInfo, setUserInfo] = useState({ detail: "Loading..." });
  const [tempInfo, setTempInfo] = useState({ ...userInfo });
  const [nickName, setNickName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userPhotos, setUserPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const fileInputRef = useRef(null);
  const [draggedPhoto, setDraggedPhoto] = useState(null);
  const [draggedOverPhoto, setDraggedOverPhoto] = useState(null);

  const validateNickname = (name) => {
    if (!name.trim()) return "Nickname is required";
    if (name.length > MAX_NICKNAME)
      return `Nickname cannot exceed ${MAX_NICKNAME} characters`;
    return "";
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "detail" && value.length > MAX_CHARS) return;
    setTempInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveInfo = async () => {
    setLoading(true);
    setError("");
    if (!userEmail) {
      setError("User email not found");
      setLoading(false);
      return;
    }
    try {
      await axios.post(
        `${import.meta.env.VITE_APP_API_BASE_URL}/api/save-user-info`,
        { email: userEmail, userInfo: tempInfo }
      );
      setUserInfo(tempInfo);
      setEditingField(null);
      toast.success("Profile updated successfully");
    } catch (error) {
      setError("Failed to save profile");
      toast.error("Failed to save profile");
    }
    setLoading(false);
  };

  const handleNickNameChange = (e) => {
    setNickName(e.target.value);
  };

  const handleNickNameBlur = async () => {
    const err = validateNickname(nickName);
    if (err) {
      setError(err);
      toast.error(err);
      setIsEditing(false);
      return;
    }
    setLoading(true);
    try {
      await axios.post(
        `${import.meta.env.VITE_APP_API_BASE_URL}/api/save-user-name`,
        { userEmail, nickName }
      );
      toast.success("Nickname updated");
    } catch (err) {
      toast.error("Failed to update nickname");
    }
    setIsEditing(false);
    setLoading(false);
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      // 5MB limit
      toast.error("File size cannot exceed 5MB.");
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append("photo", file);
    formData.append("email", userEmail);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_APP_API_BASE_URL}/api/upload-user-photo`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      if (response.data.success) {
        fetchUserPhotos();
        toast.success("Photo uploaded successfully");
      } else {
        throw new Error(response.data.message || "Upload failed");
      }
    } catch (err) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async (photoId) => {
    if (!window.confirm("Are you sure you want to delete this photo?")) return;
    try {
      const response = await axios.delete(
        `${import.meta.env.VITE_APP_API_BASE_URL}/api/user-photo/${photoId}`,
        { data: { email: userEmail } }
      );
      if (response.data.success) {
        setUserPhotos(userPhotos.filter((photo) => photo._id !== photoId));
        if (activePhotoIndex >= userPhotos.length - 1) {
          setActivePhotoIndex(Math.max(0, userPhotos.length - 2));
        }
        toast.success("Photo deleted");
      } else {
        throw new Error(response.data.message || "Deletion failed");
      }
    } catch (err) {
      toast.error(err.message || "Deletion failed");
    }
  };

  const fetchUserPhotos = async () => {
    if (!userEmail) return;
    try {
      const response = await axios.get(
        `${
          import.meta.env.VITE_APP_API_BASE_URL
        }/api/user-photos/${encodeURIComponent(userEmail)}`
      );
      if (response.data.success) {
        setUserPhotos(response.data.photos);
      }
    } catch (err) {
      console.error("Failed to fetch photos:", err);
    }
  };

  const handleDragStart = (e, photo) => {
    setDraggedPhoto(photo);
  };

  const handleDragEnter = (e, photo) => {
    setDraggedOverPhoto(photo);
  };

  const handleDragEnd = () => {
    const fromIndex = userPhotos.findIndex((p) => p._id === draggedPhoto._id);
    const toIndex = userPhotos.findIndex((p) => p._id === draggedOverPhoto._id);
    if (fromIndex !== toIndex) {
      const newUserPhotos = [...userPhotos];
      const [removed] = newUserPhotos.splice(fromIndex, 1);
      newUserPhotos.splice(toIndex, 0, removed);
      setUserPhotos(newUserPhotos);
      handleSavePhotoOrder(newUserPhotos.map((p) => p._id));
    }
    setDraggedPhoto(null);
    setDraggedOverPhoto(null);
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
      toast.success("Photo order saved");
    } catch (error) {
      toast.error("Failed to save photo order");
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      if (!userEmail) return;
      setLoading(true);
      try {
        const [userRes, followRes, nickRes] = await Promise.all([
          axios.get(
            `${
              import.meta.env.VITE_APP_API_BASE_URL
            }/api/user-info/${encodeURIComponent(userEmail)}`
          ),
          axios.get(
            `${
              import.meta.env.VITE_APP_API_BASE_URL
            }/api/user/${encodeURIComponent(userEmail)}/follow-info`
          ),
          axios.get(
            `${
              import.meta.env.VITE_APP_API_BASE_URL
            }/api/get-user?email=${userEmail}`
          ),
        ]);
        setUserInfo(userRes.data);
        setTempInfo(userRes.data);
        setFollowers(followRes.data.followers);
        setFollowing(followRes.data.following);
        setNickName(nickRes.data.nickname || "");
        fetchUserPhotos();
      } catch (err) {
        setError("Could not fetch profile data.");
      }
      setLoading(false);
    };
    fetchAll();
  }, [userEmail]);

  if (!userEmail) {
    return (
      <div className="container-profile">
        <div className="text-center mt-8">
          <h2 className="text-xl font-semibold">
            Please log in to view your profile.
          </h2>
          <Button className="mt-4" onClick={() => navigate("/login")}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`container-profile ${isDarkMode ? "dark-mode" : ""}`}>
      <ToastContainer />
      <header className="header-home">
        <HeaderProfile />
      </header>

      <div className="profile-content">
        <div className="profile-main-info">
          <img src={userPhoto} alt="Profile" className="profile-image" />{" "}
          <h2>
            {isEditing ? (
              <input
                type="text"
                value={nickName}
                onChange={handleNickNameChange}
                onBlur={handleNickNameBlur}
                autoFocus
                maxLength={MAX_NICKNAME}
              />
            ) : (
              <span>{nickName || displayName}</span>
            )}
            <FaEdit onClick={() => setIsEditing(true)} className="edit-icon" />
          </h2>
          <div className="tabs">
            <ul className="followers">
              <li>{followers.length} followers</li>
            </ul>
            <ul className="following">
              <li>{following.length} following</li>
            </ul>
          </div>
          {error && <div className="error-message">{error}</div>}
          {loading && <div className="loading-message">Loading...</div>}
          <div className="info-box">
            <h3>About Me</h3>
            {editingField === "detail" ? (
              <div>
                <textarea
                  name="detail"
                  value={tempInfo.detail}
                  onChange={handleInputChange}
                  rows={4}
                  maxLength={MAX_CHARS}
                />
                <p className="word-limit-info">
                  {tempInfo.detail.length} / {MAX_CHARS}
                </p>
              </div>
            ) : (
              <p
                onClick={() => {
                  setEditingField("detail");
                  setTempInfo({ ...userInfo });
                }}
              >
                {userInfo.detail || "Click to add details..."}
              </p>
            )}
            {editingField && (
              <div className="save-button-container">
                <Button
                  onClick={handleSaveInfo}
                  className="save-button"
                  disabled={loading}
                >
                  Save
                </Button>
                <Button
                  onClick={() => setEditingField(null)}
                  className="edit-button-cancel-button"
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
        <div className="profile-card">
          <div className="profile-photos">
            <div className="main-photo">
              {userPhotos.length > 0 ? (
                <img src={userPhotos[activePhotoIndex]?.url} alt="Profile" className="profile-image-card"/>
              ) : (
                <div
                  className="no-photo-placeholder"
                  onClick={() => fileInputRef.current.click()}
                >
                  <FaCamera />
                  <p>Upload a photo</p>
                </div>
              )}
            </div>
            <div className="thumbnail-container">
              {userPhotos.map((photo, index) => (
                <div
                  key={photo._id}
                  className={`thumbnail ${
                    index === activePhotoIndex ? "active" : ""
                  } ${
                    draggedOverPhoto && draggedOverPhoto._id === photo._id
                      ? "drag-over"
                      : ""
                  }`}
                  onClick={() => setActivePhotoIndex(index)}
                  draggable
                  onDragStart={(e) => handleDragStart(e, photo)}
                  onDragEnter={(e) => handleDragEnter(e, photo)}
                  onDragEnd={handleDragEnd}
                  onDrop={(e) => e.preventDefault()}
                >
                  <img src={photo.url} alt={`Thumbnail ${index + 1}`} />
                  <button
                    className="remove-photo-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemovePhoto(photo._id);
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
              {userPhotos.length < 5 && (
                <div
                  className="thumbnail add-photo-thumbnail"
                  onClick={() => fileInputRef.current.click()}
                >
                  +
                </div>
              )}
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePhotoChange}
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
