import React, { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import "./Eventlist.css";
import { useTheme } from "../../context/themecontext";
import { useSocket } from "../../context/socketcontext"; // Import useSocket
import { MdFavorite, MdFavoriteBorder } from "react-icons/md";
import { FiCalendar, FiX } from "react-icons/fi";

const EventList = () => {
  const [events, setEvents] = useState([]);
  const [eventsImage, setEventsImage] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const email = localStorage.getItem("userEmail");
  const { isDarkMode } = useTheme();
  const [favoriteEvents, setFavoriteEvents] = useState([]);
  const { socket } = useSocket();

  const user = { email };

  const fetchEvents = useCallback(async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_APP_API_BASE_URL}/api/events/${user.email}`
      );
      setEvents(res.data);
    } catch (error) {
      console.error("❌ Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  }, [user.email]);

  const fetchImage = useCallback(async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_APP_API_BASE_URL}/api/get-image-genres`
      );
      setEventsImage(res.data.imageGenres);
    } catch (err) {
      console.error("❌ Error fetching images:", err);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    fetchImage();
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('events_updated', () => {
      fetchEvents();
      fetchImage();
    });

    return () => {
      socket.off('events_updated');
    };
  }, [socket, fetchEvents, fetchImage]);

  const handleDelete = async (id) => {
    const confirm = window.confirm("คุณแน่ใจว่าต้องการลบกิจกรรมนี้หรือไม่?");
    if (!confirm) return;

    try {
      await axios.delete(
        `${import.meta.env.VITE_APP_API_BASE_URL}/api/detele-events/${id}`
      );
    } catch (error) {
      console.error("❌ Error deleting event:", error);
    }
  };

  const handleDeleteAll = async () => {
    const confirm = window.confirm(
      "คุณแน่ใจว่าต้องการลบกิจกรรมทั้งหมดหรือไม่?"
    );
    const userEmail = localStorage.getItem("userEmail");
    if (!confirm) return;

    try {
      await axios.delete(
        `${import.meta.env.VITE_APP_API_BASE_URL}/api/delete-all-events/${userEmail}`
      );
    } catch (error) {
      console.error("❌ Error deleting all events:", error);
    }
  };

  const fetchFavoriteEvents = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_APP_API_BASE_URL}/api/likes/${email}`
      );
      setFavoriteEvents(
        Array.isArray(res.data) ? res.data.map((like) => like.eventId) : []
      );
    } catch (error) {
      console.error("❌ Error fetching favorite events:", error);
    }
  };

  useEffect(() => {
    fetchFavoriteEvents();
  }, []);

  const handleLike = async (eventId, title) => {
    try {
      await axios.post(`${import.meta.env.VITE_APP_API_BASE_URL}/api/like`, {
        userEmail: email,
        eventId: eventId,
        eventTitle: title,
      });
      fetchFavoriteEvents();
    } catch (error) {
      console.error("❌ Error liking event:", error);
    }
  };

  const handleUnlike = async (eventId) => {
    try {
      await axios.delete(
        `${import.meta.env.VITE_APP_API_BASE_URL}/api/like/${email}/${eventId}`
      );
      fetchFavoriteEvents();
    } catch (error) {
      console.error("❌ Error unliking event:", error);
    }
  };

  if (loading) return <p className="loading-text">กำลังโหลด...</p>;

  const EventListContent = () => (
    <div className={`event-container ${isDarkMode ? "dark-mode" : ""}`}>
      {events.length === 0 ? (
        <div className="eventlist-empty-loading">
          <div className="eventlist-empty-spinner">
            <div className="eventlist-empty-bar"></div>
            <div className="eventlist-empty-bar"></div>
            <div className="eventlist-empty-bar"></div>
            <div className="eventlist-empty-bar"></div>
          </div>
          <div className="eventlist-empty-text">ยังไม่มีกิจกรรมในขณะนี้</div>
        </div>
      ) : (
        <div className="event-list">
          {events.map((event, index) => (
            <div key={event._id} className="event-card">
              {eventsImage.map((item) => {
                if (event.genre == item.genres) {
                  return (
                    <div key={item._id}>
                      <img
                        className="event-image"
                        src={item.image}
                        alt={item.genres}
                        width="200"
                      />
                    </div>
                  );
                }
                return null;
              })}
              <div className="row-favorite">
                <h3 className="event-name">{event.title}</h3>
                <button
                  className="favorite-button"
                  onClick={() => {
                    const isFav =
                      Array.isArray(favoriteEvents) &&
                      favoriteEvents.includes(event._id);
                    if (isFav) {
                      handleUnlike(event._id, event.title);
                    } else {
                      handleLike(event._id, event.title);
                    }
                    setFavoriteEvents((prev) => {
                      if (!Array.isArray(prev)) return [event._id];
                      return prev.includes(event._id)
                        ? prev.filter((id) => id !== event._id)
                        : [...prev, event._id];
                    });
                  }}
                  aria-label={
                    Array.isArray(favoriteEvents) &&
                      favoriteEvents.includes(event._id)
                      ? "Unfavorite"
                      : "Favorite"
                  }
                >
                  {Array.isArray(favoriteEvents) &&
                    favoriteEvents.includes(event._id) ? (
                    <MdFavorite size={30} color="red" />
                  ) : (
                    <MdFavoriteBorder size={30} />
                  )}
                </button>
              </div>
              <div className="event-info">
                <p>🎵 <span class="category-label">Category:</span>
                  <span class="genre-border">{event.genre}</span>
                </p>
                <p>📍 <span className="category-label">Location:</span>
                  <span> {event.location}</span>
                </p>
                <p>🗓️ <span className="category-label">Date:</span>
                  <span> {event.date}</span></p>
              </div>
              <p className="event-description">{event.description}</p>
              <div className="bottom-event">
                <a
                  href={event.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="event-link"
                >
                  Info more
                </a>
                <button
                  onClick={() => {
                    handleDelete(event._id);
                    handleUnlike(event._id);
                  }}
                  className="delete-button"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
          <div className="btn-delete-all">
            <button
              onClick={() => {
                handleDeleteAll();
              }}
              className="delete-button-all"
              title="ลบกิจกรรมทั้งหมด"
            >
              <span role="img" aria-label="delete">
                🗑️
              </span>{" "}
              Delete all
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <button
        className="eventlist-modal-toggle-btn"
        onClick={() => setIsModalOpen(true)}
        aria-label="Open Events"
      >
        <FiCalendar />
      </button>

      <div className="eventlist-desktop-view">
        <EventListContent />
      </div>

      <div className={`eventlist-modal-overlay ${isModalOpen ? 'active' : ''}`} onClick={() => setIsModalOpen(false)}>
        <div className={`eventlist-modal-sheet ${isModalOpen ? 'active' : ''}`} onClick={(e) => e.stopPropagation()}>
          <div className="eventlist-modal-header">
            <div className="eventlist-modal-handle"></div>
            <button
              className="eventlist-modal-close"
              onClick={() => setIsModalOpen(false)}
              aria-label="Close Events"
            >
              <FiX />
            </button>
          </div>
          <div className="eventlist-modal-content">
            <EventListContent />
          </div>
        </div>
      </div>
    </>
  );
};

export default EventList;