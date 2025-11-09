// import React from "react";
import "../../css/ProfileModal.css";
import { toast, ToastContainer } from "react-toastify";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import {
  useFollowUser,
  useDeleteFriend,
  fetchUserPhotos,
} from "../../../lib/queries";
import api from "../../../server/api";

const ProfileModal = ({
  isOpen,
  onClose,
  user,
  userImage,
  followers,
  following,
  isCom,
  users,
}) => {
  const userEmail = localStorage.getItem("userEmail");
  const queryClient = useQueryClient();
  const followMutation = useFollowUser();
  const deleteFriendMutation = useDeleteFriend();
  const currentUser = queryClient.getQueryData(["currentUser", userEmail]);
  const isFollowing = currentUser?.following?.includes(userImage.email);

  const profileUserEmail =
    userImage.email === userEmail ? userImage.usermatch : userImage.email;

  const { data: userPhotosData } = useQuery({
    queryKey: ["userPhotos", profileUserEmail],
    queryFn: () => fetchUserPhotos(profileUserEmail),
    enabled: !!profileUserEmail && isOpen,
  });

  if (!isOpen || !user) return null;

  const getMatchedUser = () => {
    if (!users || !userImage) return null;
    const partnerEmail =
      userImage.email === userEmail ? userImage.usermatch : userImage.email;
    return users.find((u) => u.email === partnerEmail);
  };

  const matchedUser = getMatchedUser();

  const profilePhotoUrl =
    userPhotosData?.[0]?.url ||
    matchedUser?.photoURL ||
    user.photoURL ||
    userImage?.photoURL ||
    userImage.image;

  const getHighResPhoto = (url) => {
    if (!url) return "/default-profile.png";
    try {
      if (typeof url === "string" && url.includes("=s")) {
        return url.replace(/=s\d+-c(?=[&?]|$)/, "=s400-c");
      }
      return url;
    } catch (error) {
      console.error("Error processing photo URL:", error);
      return url || "/default-profile.png";
    }
  };

  const handleDeleteClick = () => {
    deleteFriendMutation.mutate(
      {
        type: isCom ? "room" : "friend",
        userToDelete: userImage.email,
        roomName: userImage.name,
        infoMatchId: userImage._id,
      },
      {
        onSuccess: () => {
          toast.success("ลบผู้ใช้สำเร็จ");
          onClose();
        },
        onError: (error) => {
          console.error("Error deleting user:", error);
          toast.error("เกิดข้อผิดพลาดในการลบผู้ใช้");
        },
      }
    );
  };

  const handleFollowClick = () => {
    followMutation.mutate(userImage.email, {
      onSuccess: () => {
        toast.success(isFollowing ? "เลิกติดตามสำเร็จ" : "ติดตามสำเร็จ!");
      },
      onError: () => {
        toast.error("เกิดข้อผิดพลาด!");
      },
    });
  };
  const getFullImageUrl = (url) => {
    if (!url) return url;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `${api.defaults.baseURL}${url}`;
  };

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
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
                  <span className="Created-detail">
                    {userImage.description}
                  </span>
                </li>
              </ul>
            ) : (
              <div className="profile-modal-follow-info-details">
                <div className="profile-modal-follow-info-header">
                  <ul className="followers">
                    <li>{followers.length} followers</li>
                  </ul>
                  <ul className="following">
                    <li>{following.length} following</li>
                  </ul>
                </div>
                <button
                  className="chat-dropdown-item"
                  onClick={handleFollowClick}
                  disabled={followMutation.isLoading}
                >
                  {followMutation.isLoading
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
            disabled={deleteFriendMutation.isLoading}
          >
            {deleteFriendMutation.isLoading ? "กำลังลบ..." : "ลบเพื่อน"}
          </button>
        </div>
        {userPhotosData && userPhotosData.length > 0 && (
          <div className="profile-modal-gallery">
            <div className="photo-grid">
              {userPhotosData.map((photo) => (
                <div key={photo.url} className="photo-grid-item">
                  <img src={getFullImageUrl(photo.url)} alt="User upload" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
    </div>
  );
};

export default ProfileModal;
