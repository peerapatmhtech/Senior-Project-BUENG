import React, { useEffect, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../server/api";
import { useNavigate } from "react-router-dom";
import TinderCard from "react-tinder-card";
import { useTheme } from "../context/themecontext";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./css/roommatch.css";
import { useSocket } from "../context/make.com";
import PropTypes from "prop-types";
import UserCard from "./UserCard";

// --- API Helper Functions ---
const fetchRoomsForUser = async (email) => {
  if (!email) return [];
  const response = await api.get(`/api/infomatch/${email}`);
  return response.data.data || [];
};

const fetchUsers = async () => {
  const response = await api.get(`/api/users`);
  return response.data || [];
};

const RoomMatch = ({ accordionComponent }) => {
  const userEmail = localStorage.getItem("userEmail");
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const socket = useSocket();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 990);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchedRoom, setMatchedRoom] = useState(null);

  // --- Queries ---
  const { data: filteredRooms = [], isLoading: isLoadingRooms } = useQuery({
    queryKey: ["rooms", userEmail],
    queryFn: () => fetchRoomsForUser(userEmail),
    enabled: !!userEmail,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
  // --- Mutations ---
  const likeMutation = useMutation({
    mutationFn: async ({ room, userEmail }) => {
      // If the current user is NOT the one who initiated the match,
      // this like will complete the match.
      if (room.status === "pending" && room.initiatorEmail !== userEmail) {
        const response = await api.patch(`/api/infomatch/${room._id}/match`, {
          status: "matched",
        });
        return response.data;
      }
      // If the current user already initiated, do nothing, just wait.
      // Or if you want to allow "liking" to create the initial record, that logic would go here.
      // For now, we assume the record is created by the background process.
      return room; // Return the room without change
    },
    onSuccess: (updatedRoom) => {
      toast.success("คุณกดไลค์แล้ว!");
      // ตรวจสอบสถานะ "matched" จากข้อมูลที่ API ส่งกลับมา
      if (
        updatedRoom &&
        updatedRoom.data &&
        updatedRoom.data.status === "matched"
      ) {
        setMatchedRoom(updatedRoom.data);
        setShowMatchModal(true);
        localStorage.setItem(`match_shown_${updatedRoom._id}`, "true");
      }
      queryClient.invalidateQueries({ queryKey: ["rooms", userEmail] });
    },
    onError: () => toast.error("ไม่สามารถกดไลค์ได้"),
  });

  const skipMutation = useMutation({
    mutationFn: (roomId) => api.patch(`/api/infomatch/${roomId}/skip`),
    onSuccess: (_data) => {
      queryClient.invalidateQueries({ queryKey: ["rooms", userEmail] });
    },
    onError: () => toast.error("เกิดข้อผิดพลาดในการข้าม"),
  });

  // --- Memoized Derived State ---
  const childRefs = useMemo(
    () =>
      Array(filteredRooms.length)
        .fill(0)
        .map(() => React.createRef()),
    [filteredRooms.length]
  );

  useEffect(() => {
    setCurrentIndex(filteredRooms.length - 1);
  }, [filteredRooms.length]);

  // --- Effects ---
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 990);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleMatchUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    };
    socket.on("match_updated", handleMatchUpdate);
    return () => socket.off("match_updated", handleMatchUpdate);
  }, [socket, queryClient]);

  // --- Handlers ---
  const handleEnterRoom = (roomId) => {
    const currentRoom = filteredRooms.find((room) => room._id === roomId);
    if (currentRoom) likeMutation.mutate({ room: currentRoom, userEmail });
  };

  const swiped = (direction, roomId) => {
    if (direction === "right") {
      handleEnterRoom(roomId);
    } else if (direction === "left") {
      skipMutation.mutate(roomId);
    }
  };

  const swipe = async (dir) => {
    if (currentIndex >= 0 && currentIndex < filteredRooms.length) {
      await childRefs[currentIndex]?.current?.swipe(dir);
    }
  };

  const handleSkipButtonClick = () => {
    if (currentIndex < filteredRooms.length) {
      const currentRoom = filteredRooms[currentIndex];
      if (currentRoom) {
        skipMutation.mutate(currentRoom._id);
      }
    }
  };

  const getHighResPhoto = (url) =>
    url ? url.replace(/=s\d+-c(?=[&?]|$)/, "=s400-c") : url;

  const getFullImageUrl = (url) => {
    if (!url) return url;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `${api.defaults.baseURL}${url}`;
  };

  const isLoading = isLoadingRooms || isLoadingUsers;

  return (
    <div
      className={`room-match-container ${isDarkMode ? "dark-mode" : ""} ${
        isModalOpen ? "modal-active" : ""
      }`}
    >
      {isMobile && accordionComponent && (
        <div className="roommatch-accordion-mobile">{accordionComponent}</div>
      )}
      {isLoading && (
        <div className="roommatch-loading-overlay">
          <div className="roommatch-spinner">
            <div className="roommatch-dot"></div>
            <div className="roommatch-dot"></div>
            <div className="roommatch-dot"></div>
          </div>
          <div className="roommatch-loading-text">
            กำลังโหลดห้องแนะนำ กรุณารอสักครู่...
          </div>
        </div>
      )}
      <div className="card-stack">
        {!isLoading && filteredRooms.length === 0 && (
          <div className="roommatch-tindercard-loading">
            <div className="roommatch-tindercard-spinner">
              <div className="roommatch-tindercard-bar"></div>
              <div className="roommatch-tindercard-bar"></div>
              <div className="roommatch-tindercard-bar"></div>
              <div className="roommatch-tindercard-bar"></div>
            </div>
            <div className="roommatch-tindercard-loading-text">
              ยังไม่พบผู้คนที่เหมาะสมกับคุณในขณะนี้
            </div>
          </div>
        )}
        {!isLoading &&
          filteredRooms.map((room, index) => (
            <div className="container-tinder-card" key={room._id}>
              <TinderCard
                ref={childRefs[index]}
                key={room._id}
                onSwipe={(dir) => swiped(dir, room._id)}
                preventSwipe={["up", "down"]}
                className="tinder-card"
              >
                <UserCard room={room} userEmail={userEmail} users={users} />
              </TinderCard>
            </div>
          ))}
      </div>

      <div className="button-group">
        <button
          onClick={handleSkipButtonClick}
          className="skip-button"
          disabled={likeMutation.isPending || skipMutation.isPending}
        >
          Skip
        </button>
        <button
          onClick={() => swipe("right")}
          className="join-button"
          disabled={likeMutation.isPending || skipMutation.isPending}
        >
          Like
        </button>
      </div>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />

      {showMatchModal && matchedRoom && (
        <div className="match-modal-overlay">
          <div className="activity-match-modal">
            <div className="activity-match-header">
              <h2>Found a Buddy!</h2>
              <p>You both are interested in the same activity.</p>
            </div>

            <div className="activity-match-users">
              <div className="activity-match-user">
                <img
                  src={getFullImageUrl(
                    getHighResPhoto(
                      users.find((u) => u.email === userEmail)?.photoURL
                    )
                  )}
                  alt="You"
                />
                <span>You</span>
              </div>
              <div className="activity-match-icon">+</div>
              <div className="activity-match-user">
                <img
                  src={getFullImageUrl(
                    getHighResPhoto(
                      users.find((u) => {
                        const matchedUserEmail =
                          matchedRoom.email !== userEmail
                            ? matchedRoom.email
                            : matchedRoom.usermatch;
                        return u.email === matchedUserEmail;
                      })?.photoURL
                    )
                  )}
                  alt="Matched User"
                />
                <span>
                  {users.find(
                    (u) =>
                      u.email ===
                      (matchedRoom.email !== userEmail
                        ? matchedRoom.email
                        : matchedRoom.usermatch)
                  )?.displayName || "Buddy"}
                </span>
              </div>
            </div>

            <div className="activity-match-details">
              <h3>{matchedRoom.title || "Activity"}</h3>
              <p>
                Now you can plan this activity together. Let&apos;s start a
                conversation!
              </p>
            </div>

            <div className="activity-match-actions">
              <button
                className="secondary-btn"
                onClick={() => setShowMatchModal(false)}
              >
                Find More
              </button>
              <button
                className="primary-btn"
                onClick={() => {
                  setShowMatchModal(false);
                  navigate(`/chat/${matchedRoom._id}`);
                }}
              >
                Plan in Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomMatch;

RoomMatch.propTypes = {
  accordionComponent: PropTypes.node,
};
