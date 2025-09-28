import React from "react";
import "../../css/ProfileModal.css";
import { toast, ToastContainer } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";
import { useFollowUser, useDeleteFriend } from "../../../lib/queries";

const ProfileModal = ({ isOpen, onClose, user, userImage, followers, following, isCom, users }) => {
    const userEmail = localStorage.getItem("userEmail");
    const queryClient = useQueryClient();
    const followMutation = useFollowUser();
    const deleteFriendMutation = useDeleteFriend();

    if (!isOpen || !user) return null;

    const currentUser = queryClient.getQueryData(["currentUser", userEmail]);
    const isFollowing = currentUser?.following?.includes(userImage.email);

    const getMatchedUser = () => {
        if (!users || !userImage) return null;
        const partnerEmail = userImage.email === userEmail ? userImage.usermatch : userImage.email;
        return users.find(u => u.email === partnerEmail);
    };

    const matchedUser = getMatchedUser();

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
        if (!window.confirm("คุณต้องการลบเพื่อนคนนี้หรือไม่?")) return;

        deleteFriendMutation.mutate(
            { 
                userToDelete: userImage.email, 
                roomName: userImage.name, 
                infoMatchId: userImage._id 
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
            }
        });
    };

    return (
        <div className="profile-modal-overlay" onClick={onClose}>
            <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
                <div className="profile-modal-body">
                    <div className="profile-modal-user">
                        <img
                            src={getHighResPhoto(
                                matchedUser?.photoURL || user.photoURL || userImage?.photoURL || userImage.image
                            )}
                            alt={matchedUser?.displayName || userImage?.displayName || "ผู้ใช้" || userImage.name || "ไม่มีชื่อ"}
                            className="profile-modal-avatar"
                        />
                        <div className="profile-modal-name">
                            {matchedUser?.displayName || userImage?.displayName || userImage?.name || "ไม่มีชื่อ"}
                        </div>
                        <div className="profile-modal-email">{userImage.email === userEmail ? userImage.usermatch : userImage.email}</div>
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
                                    {followMutation.isLoading ? 'กำลังดำเนินการ...' : (isFollowing ? "กำลังติดตาม" : "ติดตาม")}
                                </button></div>
                        )}
                    </div>

                    <button
                        className="modal-profile"
                        onClick={handleDeleteClick}
                        disabled={deleteFriendMutation.isLoading}
                    >
                        {deleteFriendMutation.isLoading ? 'กำลังลบ...' : 'ลบเพื่อน'}
                    </button>
                </div>
            </div>
            <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
        </div>
    );
};

export default ProfileModal;
