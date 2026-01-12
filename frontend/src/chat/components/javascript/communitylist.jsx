import { FaChevronDown, FaChevronRight, FaUsers } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchAllRooms, fetchUserRooms } from "../../../lib/queries";

const CommunityList = ({
  setActiveUser,
  setRoombar,
  isOpencom,
  setIsOpencom,
  selectedTab,
  setSelectedTab,
  setOpenchat,
  setUserImage,
  setIsGroupChat,
}) => {
  const navigate = useNavigate();
  const userEmail = localStorage.getItem("userEmail");

  const { data: joinedRooms = { roomNames: [], roomIds: [] }, isLoading: isLoadingJoined } = useQuery({
    queryKey: ["userRooms", userEmail],
    queryFn: () => fetchUserRooms(userEmail),
    enabled: !!userEmail,
  });

  const { data: allRooms = [], isLoading: isLoadingAll } = useQuery({
    queryKey: ["allRooms"],
    queryFn: fetchAllRooms,
  });

  const validRooms =
    joinedRooms?.roomNames && allRooms?.length > 0
      ? joinedRooms.roomNames
          .map((name) => allRooms.find((r) => r.name === name))
          .filter((room) => !!room)
      : [];

  const handleEnterRoom = (roomId) => {
    navigate(`/chat/${roomId}`);
  };

  return (
    <div className="favorite-container">
      <div
        className="favorite-toggle"
        onClick={() => setIsOpencom((prev) => !prev)}
      >
        {isOpencom ? <FaChevronDown /> : <FaChevronRight />}
        <span>Community</span>
      </div>
      {isOpencom && (
        <div
          className={!isOpencom ? "group-container-open" : "group-container"}
        >
          {isLoadingJoined || isLoadingAll ? (
            <div
              style={{
                padding: "30px 20px",
                textAlign: "center",
                color: "#999",
                fontSize: "14px",
              }}
            >
              กำลังโหลด...
            </div>
          ) : validRooms.length > 0 ? (
            <ul className="friend-list-chat">
              {validRooms.map((room, index) => {
                return (
                  <li
                    key={room._id || index}
                    className={`chat-friend-item ${
                      selectedTab === room.name ? "selected" : ""
                    }`}
                    onClick={() => {
                      setSelectedTab(room.name);
                      setActiveUser(room.name);
                      setRoombar(room.image, room.name);
                      setIsGroupChat(true);
                      setOpenchat(true);
                      setUserImage(room);
                      handleEnterRoom(room._id);
                    }}
                  >
                    <div className="commu-mobile">
                      <img
                        src={
                          room.image ||
                          "https://images.squarespace-cdn.com/content/v1/557adc8ae4b05fe7bf13f9f0/1440602294667-276CNPQ99Q205NXV17BH/image-asset.jpeg"
                        }
                        alt={room.name}
                        className="friend-photo"
                      />
                      <div className="friend-detailss">
                        <span className="friend-name-commu">{room.name}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div
              style={{
                padding: "30px 20px",
                textAlign: "center",
                color: "#999",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <FaUsers size={30} />
              <span style={{ fontSize: "14px" }}>ไม่มีกลุ่มคอมมูนิตี้</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CommunityList;
