import { useEffect, useState, useMemo } from "react";
import api from "../server/api";
import { useNavigate } from "react-router-dom";
import "./css/roomlist.css";
import { toast } from "react-toastify";
import { useTheme } from "../context/themecontext";
import PropTypes from "prop-types";
import { FaUsers } from "react-icons/fa";

const RoomList = ({
  showOnlyMyRooms,
  isDeleteMode,
  selectedRooms,
  setSelectedRooms,
}) => {
  const userEmail = localStorage.getItem("userEmail");
  const { isDarkMode } = useTheme();
  const [rooms, setRooms] = useState([]);
  const [joinedRoomIds, setJoinedRoomIds] = useState([]);
  const navigate = useNavigate();

  const handleRoomSelect = (roomId) => {
    setSelectedRooms((prev) =>
      prev.includes(roomId)
        ? prev.filter((id) => id !== roomId)
        : [...prev, roomId]
    );
  };

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await api.get(`/api/allrooms`);

        // ดึงห้องที่ user join แล้ว
        const filterjoinedRooms = await api.get(`/api/user-rooms/${userEmail}`);
        // สมมติ API ส่งกลับเป็น { roomNames: [{ _id, name, ... }] }
        const joinedIds = Array.isArray(filterjoinedRooms.data.roomIds)
          ? filterjoinedRooms.data.roomIds.filter((id) => !!id)
          : [];
        setJoinedRoomIds(joinedIds);
        setRooms(res.data);

        // ดึงห้องทั้งหมด
      } catch (error) {
        console.error("ไม่สามารถโหลดห้อง:", error);
      }
    };
    fetchRooms();
  }, [userEmail]);

  // filter ห้องที่ user ยังไม่ได้ join
  const filteredRooms = useMemo(() => {
    if (showOnlyMyRooms) {
      return rooms.filter((room) => joinedRoomIds.includes(room._id));
    }
    return rooms;
  }, [rooms, showOnlyMyRooms, joinedRoomIds]);

  const isJoined = (roomId) => joinedRoomIds.includes(roomId);

  const handleAddCommunity = async (roomId, roomName) => {
    try {
      const res = await api.post(`/api/join-community`, {
        userEmail,
        roomId,
        roomName,
      });
      if (res.status !== 200) {
        toast.error("ไม่สามารถเข้าร่วมห้องได้");
        return;
      }
      if (res.status === 200) {
        navigate(`/chat/${roomId}`);
        toast.success("เข้าร่วมห้องสําเร็จ!");
      }
      toast.success("เข้าร่วมห้องสําเร็จ!");
    } catch (error) {
      console.error("Error adding friend:", error);
      toast.error("ไม่สามารถเพิ่มเพื่อนได้");
    }
  };

  const handleRoomClick = (room) => {
    if (isDeleteMode) {
      handleRoomSelect(room._id);
    } else if (showOnlyMyRooms || isJoined(room._id)) {
      navigate(`/chat/${room._id}`);
    } else {
      handleAddCommunity(room._id, room.name);
    }
  };

  const getFullImageUrl = (url) => {
    if (!url) return url;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `${api.defaults.baseURL}${url}`;
  };
console.log(filteredRooms)
  return (
    <section className={`roomlist-section ${isDarkMode ? "dark-mode" : ""}`}>
      <header className="roomlist-header"></header>
      <div className="room-list">
        {filteredRooms.length === 0 ? (
          <div className="roomlist-empty-loading">
            <div className="roomlist-empty-spinner">
              <div className="roomlist-empty-bar"></div>
              <div className="roomlist-empty-bar"></div>
              <div className="roomlist-empty-bar"></div>
              <div className="roomlist-empty-bar"></div>
            </div>
            <div className="roomlist-empty-text">ยังไม่มีห้องในขณะนี้</div>
          </div>
        ) : (
          filteredRooms.map((room) => (
            <div
              key={room._id}
              className={`room-container card-room ${
                selectedRooms.includes(room._id) ? "selected" : ""
              }`}
              onClick={() => handleRoomClick(room)}
            >
              <div className="room-image-wrap">
                {room.image ? (
                  <img
                    src={getFullImageUrl(room.image)}
                    alt="room"
                    className="room-image"
                  />
                ) : (
                  <div className="room-image-placeholder">
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                      <rect width="48" height="48" rx="12" fill="#ecebfa" />
                      <path
                        d="M12 36l8-10 6 8 6-6 4 8"
                        stroke="#b3b0f7"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="18" cy="18" r="3" fill="#b3b0f7" />
                    </svg>
                  </div>
                )}
                {isDeleteMode && (
                  <div className="room-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedRooms.includes(room._id)}
                      onChange={() => handleRoomSelect(room._id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}
              </div>
              <>
                <h4 className="room-name">{room.name}</h4>
                <p className="room-desc">{room.description}</p>
                <div className="room-actions">
                  <div className="room-member-count">
                    <FaUsers />
                    <span>{room.memberCount || 0}</span>
                  </div>
                  {!showOnlyMyRooms && (
                    <button
                      className={`join-button ${
                        isJoined(room._id) ? "joined" : ""
                      }`}
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent card click
                        handleRoomClick(room);
                      }}
                    >
                      {isJoined(room._id) ? "Joined" : "Join"}
                    </button>
                  )}
                </div>
              </>
            </div>
          ))
        )}
      </div>
    </section>
  );
};

export default RoomList;

RoomList.propTypes = {
  showOnlyMyRooms: PropTypes.bool.isRequired,
  isDeleteMode: PropTypes.bool.isRequired,
  selectedRooms: PropTypes.array.isRequired,
  setSelectedRooms: PropTypes.func.isRequired,
};
