import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../server/api";

import PropTypes from "prop-types";
// Helper function to fetch photos for a user
const fetchUserPhotos = async (userEmail, mainPhotoUrl) => {
  if (!userEmail) return [];

  const mainPhoto = mainPhotoUrl
    ? { url: mainPhotoUrl, _id: "main_photo" }
    : null;
  let allPhotos = mainPhoto ? [mainPhoto] : [];

  try {
    console.log("Fetching photos for", userEmail)
    const response = await api.get(`/api/user-photos/${userEmail}`);
    console.log(response.data)
    if (response.data.success && Array.isArray(response.data.data)) {
      const additionalPhotos = response.data.data.filter(
        (p) => p.url !== mainPhotoUrl
      );
      allPhotos = [...allPhotos, ...additionalPhotos];
    }
    return allPhotos;
  } catch (error) {
    console.error("Failed to fetch user photos for", userEmail, error);
    // If fetching additional photos fails, just return the main photo
    return allPhotos;
  }
};

const UserCard = ({ room, userEmail, users }) => {
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  // Determine the email of the user to display on the card
  const userToDisplayEmail = useMemo(
    () => (room.email !== userEmail ? room.email : room.usermatch),
    [room, userEmail]
  );

  // Find the full user object from the 'users' prop (which is already cached by the parent)
  const userToDisplay = useMemo(
    () => users.find((u) => u.email === userToDisplayEmail),
    [users, userToDisplayEmail]
  );

  // 1. Replaced useEffect with useQuery to fetch photos
  const { data: photos = [], isLoading: isLoadingPhotos } = useQuery({
    queryKey: ["userPhotos", userToDisplayEmail], // Unique key for each user's photos
    queryFn: () => fetchUserPhotos(userToDisplayEmail, userToDisplay?.photoURL),
    enabled: !!userToDisplayEmail && !!userToDisplay, // Only fetch if we have the user's email and profile
    staleTime: 1000 * 60 * 5, // Cache photos for 5 minutes
  });
  console.log("photos", photos)

  const getHighResPhoto = (url) => {
    if (!url) return url;
    return url.replace(/=s\d+-c(?=[&?]|$)/, "=s400-c");
  };

  const getFullImageUrl = (url) => {
    if (!url) return url;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `${api.defaults.baseURL}${url}`;
  };

  const handlePhotoNav = (e, direction) => {
    e.stopPropagation();
    if (!photos || photos.length <= 1) return;

    setActivePhotoIndex((prevIndex) => {
      if (direction === "next") return (prevIndex + 1) % photos.length;
      return (prevIndex - 1 + photos.length) % photos.length;
    });
  };

  return (
    <div className="room-card-match">
      {/* <div className="room-chance-badge">โอกาสแมช {room.chance}</div> */}
      {isLoadingPhotos ? (
        <div className="tinder-card-inner-loading">
          <div className="tinder-card-spinner">
            <div className="tinder-card-dot"></div>
            <div className="tinder-card-dot"></div>
            <div className="tinder-card-dot"></div>
          </div>
          <div className="tinder-card-loading-text">กำลังโหลดรูปภาพ...</div>
        </div>
      ) : photos.length > 0 ? (
        <>
          <img
            src={getFullImageUrl(getHighResPhoto(photos[activePhotoIndex]?.url))}
            alt="room"
            className="room-image-match"
          />
          {photos.length > 1 && (
            <>
              <div
                className="photo-nav-overlay-left"
                onClick={(e) => handlePhotoNav(e, "prev")}
              ></div>
              <div
                className="photo-nav-overlay-right"
                onClick={(e) => handlePhotoNav(e, "next")}
              ></div>
              <div className="photo-dots">
                {photos.map((_, index) => (
                  <span
                    key={index}
                    className={`dot ${
                      index === activePhotoIndex ? "active" : ""
                    }`}
                  ></span>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        // Fallback if no photos are found at all
        // <div className="tinder-card-inner-loading">
          <img
            src="https://via.placeholder.com/400"
            alt="placeholder"
            className="room-image-match"
          />
        // </div>
      )}
      <div className="room-match-info">
        <h5>
          {userToDisplay ? userToDisplay.displayName : userToDisplayEmail}
        </h5>
        <p>มีความสนใจในเรื่อง {room.title || room.detail} เหมือนคุณ</p>
      </div>
    </div>
  );
};

export default UserCard;

UserCard.propTypes = {
  room: PropTypes.object.isRequired,
  userEmail: PropTypes.string.isRequired,
  users: PropTypes.array.isRequired,
};
