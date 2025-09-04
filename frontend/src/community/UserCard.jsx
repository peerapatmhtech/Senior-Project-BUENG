
import React, { useState, useEffect } from 'react';
import api from '../lib/axiosSecure';

const UserCard = ({ room, userEmail, users }) => {
  const [photos, setPhotos] = useState([]);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const getHighResPhoto = (url) => {
    if (!url) return url;
    return url.replace(/=s\d+-c(?=[&?]|$)/, "=s400-c");
  };

  useEffect(() => {
    const fetchPhotos = async () => {
      const userEmailToFetch = room.email !== userEmail ? room.email : room.usermatch;
      if (!userEmailToFetch) return;

      try {
        const user = users.find(u => u.email === userEmailToFetch);
        const mainPhoto = user ? { url: user.photoURL, _id: 'main_photo' } : null;

        const response = await api.get(`/api/user-photos/${userEmailToFetch}`);
        
        let allPhotos = [];
        if (mainPhoto) {
            allPhotos.push(mainPhoto);
        }

        if (response.data.success && Array.isArray(response.data.data)) {
            const additionalPhotos = response.data.data.filter(p => p.url !== (mainPhoto ? mainPhoto.url : ''));
            allPhotos = [...allPhotos, ...additionalPhotos];
        }
        
        setPhotos(allPhotos);

      } catch (error) {
        console.error("Failed to fetch user photos for", userEmailToFetch, error);
        const user = users.find(u => u.email === userEmailToFetch);
        const mainPhoto = user ? { url: user.photoURL, _id: 'main_photo' } : null;
        if(mainPhoto) setPhotos([mainPhoto]);
        else setPhotos([]);
      }
    };

    if (room && users.length > 0) {
        fetchPhotos();
    }
  }, [room, userEmail, users]);

  const handlePhotoNav = (e, direction) => {
    e.stopPropagation();
    if (!photos || photos.length <= 1) return;

    if (direction === 'next') {
      setActivePhotoIndex((prevIndex) => (prevIndex + 1) % photos.length);
    } else {
      setActivePhotoIndex((prevIndex) => (prevIndex - 1 + photos.length) % photos.length);
    }
  };

  const userToDisplay = users.find(u => u.email === (room.email !== userEmail ? room.email : room.usermatch));

  return (
    <div className="room-card-match">
      <div className="room-chance-badge">
        โอกาสแมช {room.chance}
      </div>
      {photos.length > 0 ? (
        <>
          <img
            src={getHighResPhoto(photos[activePhotoIndex].url)}
            alt="room"
            className="room-image-match"
          />
          {photos.length > 1 && (
            <>
              <div className="photo-nav-overlay-left" onClick={(e) => handlePhotoNav(e, 'prev')}></div>
              <div className="photo-nav-overlay-right" onClick={(e) => handlePhotoNav(e, 'next')}></div>
              <div className="photo-dots">
                {photos.map((_, index) => (
                  <span key={index} className={`dot ${index === activePhotoIndex ? 'active' : ''}`}></span>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <div className="tinder-card-inner-loading">
          <div className="tinder-card-spinner">
            <div className="tinder-card-dot"></div>
            <div className="tinder-card-dot"></div>
            <div className="tinder-card-dot"></div>
          </div>
          <div className="tinder-card-loading-text">
            กำลังโหลดข้อมูล...
          </div>
        </div>
      )}
      <div className="room-match-info">
        <h5>{userToDisplay ? userToDisplay.displayName : (room.email !== userEmail ? room.email : room.usermatch)}</h5>
        <p>
          มีความสนใจในเรื่อง {room.title || room.detail} เหมือนคุณ
        </p>
      </div>
    </div>
  );
};

export default UserCard;
