import React, { useEffect, useState } from "react";
import { MdAttachFile } from "react-icons/md";
import { IoIosArrowBack, IoMdSend } from "react-icons/io";
import ProfileModal from "./ProfileModal";
import { useQuery } from "@tanstack/react-query";
import { fetchFollowInfo, fetchInfos, fetchUsers } from "../../../lib/queries";

const ChatPanel = ({
  messages,
  userEmail,
  userPhoto,
  userName,
  sortedFriends,
  RoomsBar,
  openchat,
  input,
  setInput,
  handleSend,
  userImage,
  setOpenchat,
  endOfMessagesRef,
  defaultProfileImage,
  setFriends,
  setJoinedRooms,
  formatChatDate,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isCom, setIscom] = useState(false);

  // Fetch data using React Query
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });
  const { data: getnickName = [] } = useQuery({
    queryKey: ["infos"],
    queryFn: fetchInfos,
  });

  const { data: followInfo } = useQuery({
    queryKey: ["followInfo", userImage?.email],
    queryFn: () => fetchFollowInfo(userImage?.email),
    enabled: !!userImage?.email, // Only run query if userImage.email exists
  });

  const followers = followInfo?.followers || [];
  const following = followInfo?.following || [];

  const handleProfileClick = (userObject) => {
    if (!userObject) return;
    setSelectedUser(userObject);
    setModalVisible(true);
  };

  useEffect(() => {
    if (!userImage) return;
    if (userImage.name || userImage.usermatch) {
      setIscom(true);
    } else if (userImage.email) {
      setIscom(false);
    }
  }, [userImage]);
  return (
    <div className={`chat-container ${openchat ? "mobile-layout-mode" : ""}`}>
      <div className={`show-info ${openchat ? "mobile-layout-mode" : ""}`}>
        <button
          className={`back-button-mobile ${
            openchat ? "mobile-layout-mode" : ""
          }`}
          onClick={() => setOpenchat(false)}
          style={{
            WebkitTapHighlightColor: "transparent",
            userSelect: "none",
          }}
        >
          <IoIosArrowBack />
        </button>
        <div className="center-mobile">
          <img
            src={
              (() => {
                if (!userImage || !users) return defaultProfileImage;
                // For group chats/communities
                if (userImage.image) return userImage.image;
                // For 1-on-1 chats (friends or matches)
                const partnerEmail = userImage.usermatch ? (userImage.email === userEmail ? userImage.usermatch : userImage.email) : userImage.email;
                const partnerUser = users.find(u => u.email === partnerEmail);
                return partnerUser?.photoURL || defaultProfileImage;
              })()
            }
            alt="Profile"
            className={`chat-profile ${openchat ? "mobile-layout-mode" : ""}`}
            onClick={() => {
              if (!userImage || !users) return;
              const userObject =
                users.find((u) => u.email === userImage?.usermatch) ||
                users.find((u) => u.email === userImage?.email) ||
                userImage;
              handleProfileClick(userObject);
            }}
          />
        </div>
        <h2 className={`chat-title ${openchat ? "mobile-layout-mode" : ""}`}>
          {(userImage &&
            Array.isArray(getnickName) &&
            users &&
            (getnickName.find((u) => u.email === userImage?.usermatch)
              ?.nickname ||
              getnickName.find((u) => u.email === userImage?.email)?.nickname ||
              users.find((u) => u.email === userImage?.usermatch)
                ?.displayName ||
              users.find((u) => u.email === userImage?.email)?.displayName ||
              (RoomsBar && RoomsBar.roomName) ||
              userName)) ||
            "Chat"}
        </h2>
      </div>
      <div className="chat-box">
        {messages.length === 0 ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
            }}
          >
            <span style={{ color: "#888", fontSize: "1.1rem" }}>
              ยังไม่มีข้อความ
            </span>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isCurrentUser = msg.sender === userEmail;
            const senderInfo = users.find(
              (user) => user.email?.toLowerCase() === msg.sender?.toLowerCase()
            );
            const messageDate = msg.timestamp?.toDate();
            const previousMessageDate =
              index > 0 ? messages[index - 1].timestamp?.toDate() : null;
            const isNewDay =
              !previousMessageDate ||
              messageDate?.toDateString() !==
                previousMessageDate?.toDateString();

            return (
              <React.Fragment key={msg.id}>
                {isNewDay && (
                  <div className="chat-date-divider">
                    {messageDate && formatChatDate(messageDate)}
                  </div>
                )}
                <div
                  className={`chat-message ${
                    isCurrentUser ? "my-message" : "other-message"
                  }`}
                >
                  {!isCurrentUser && (
                    <img
                      src={senderInfo?.photoURL || defaultProfileImage}
                      alt="Sender"
                      className="message-avatar"
                      onClick={() => handleProfileClick(senderInfo)}
                      style={{ cursor: "pointer" }}
                    />
                  )}
                  <div
                    className={`message-content ${
                      isCurrentUser ? "current" : "other"
                    }`}
                  >
                    <div className="colum-message">
                      <div
                        className={`message-bubble ${
                          isCurrentUser ? "current" : "other"
                        }`}
                      >
                        {msg.content || msg.text}
                      </div>
                      {isCurrentUser && index === messages.length - 1 && (
                        <div className="seen-status">
                          {msg.isSeen ? "Seen" : ""}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
        <div ref={endOfMessagesRef} />
      </div>
      <div className="chat-input-container">
        <div className="chat-border">
          <div className="emoji-right"></div>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            placeholder={"Writing something..."}
            className="chat-input"
          />
          <div className="emoji">{/* <MdAttachFile /> */}</div>
          <div className="emoji-left">
            <IoMdSend onClick={handleSend} />
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={modalVisible}
        onClose={() => setModalVisible(false)}
        user={selectedUser}
        isCom={isCom}
        userImage={userImage}
        setFriends={setFriends}
        sortedFriends={sortedFriends}
        followers={followers}
        setJoinedRooms={setJoinedRooms}
        following={following}
        users={users}
      />
    </div>
  );
};

export default ChatPanel;
