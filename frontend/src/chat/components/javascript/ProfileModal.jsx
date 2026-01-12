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
import ProfileModalBody from "./ProfileModalBody";
import ProfileModalGallery from "./ProfileModalGallery";

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

  const getDeleteType = () => {
    if (userImage?.usermatch) return "match";
    if (isCom) return "room";
    return "friend";
  };

  const deleteType = getDeleteType();

  const handleDeleteClick = () => {

    deleteFriendMutation.mutate(
      {
        type: deleteType,
        userToDelete: userImage.email,
        roomName: userImage.name,
        infoMatchId: userImage._id,
      },
      {
        onSuccess: () => {
          toast.success(
            deleteType === "match"
              ? "ยกเลิกแมตช์สำเร็จ"
              : deleteType === "room"
              ? "ออกจากกลุ่มสำเร็จ"
              : "ลบเพื่อนสำเร็จ"
          );
          onClose();
        },
        onError: (error) => {
          console.error("Error deleting:", error);
          toast.error("เกิดข้อผิดพลาดในการลบ");
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
        <ProfileModalBody
          getFullImageUrl={getFullImageUrl}
          getHighResPhoto={getHighResPhoto}
          profilePhotoUrl={profilePhotoUrl}
          matchedUser={matchedUser}
          userImage={userImage}
          userEmail={userEmail}
          isCom={isCom}
          followers={followers}
          following={following}
          handleFollowClick={handleFollowClick}
          isFollowLoading={followMutation.isLoading}
          isFollowing={isFollowing}
          handleDeleteClick={handleDeleteClick}
          isDeleteLoading={deleteFriendMutation.isLoading}
          deleteType={deleteType}
        />
        <ProfileModalGallery
          userPhotosData={userPhotosData}
          getFullImageUrl={getFullImageUrl}
        />
      </div>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
    </div>
  );
};

export default ProfileModal;
