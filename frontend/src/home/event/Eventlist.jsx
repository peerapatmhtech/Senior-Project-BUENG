import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../server/api";
import "./Eventlist.css";
import { useTheme } from "../../context/themecontext";
import { useSocket } from "../../context/make.com";
import { MdFavorite, MdFavoriteBorder } from "react-icons/md";
import { FiCalendar, FiX } from "react-icons/fi";
import { TbFileDescription } from "react-icons/tb";
import { toast } from "react-toastify";
import axios from "axios";

// Helper function to fetch events
const fetchEvents = async (email) => {
  try {
    const res = await api.get(`/api/events/${email}`);
    return Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    if (error.response && error.response.status === 404) {
      toast.success("ไม่มีกิจกรรมในขณะนี้");
      return []; // Return empty array on 404
    }
    toast.error("เกิดข้อผิดพลาดในการโหลดกิจกรรม");
    throw new Error(error.response?.data?.message || error.message); // Re-throw for React Query to handle
  }
};

// Helper function to fetch favorite events
const fetchFavoriteEvents = async (email) => {
  const res = await api.get(`/api/likes/${email}`);
  return Array.isArray(res.data) ? res.data.map((like) => like.eventId) : [];
};

const EventList = ({ setWaiting, waiting }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const email = localStorage.getItem("userEmail");
  const { isDarkMode } = useTheme();
  const socket = useSocket();
  const queryClient = useQueryClient();

  // 1. Replaced useState/useEffect with useQuery for fetching events
  const {
    data: events = [],
    isLoading: isLoadingEvents,
    isError: isErrorEvents,
  } = useQuery({
    queryKey: ["events", email], // Key for caching
    queryFn: () => fetchEvents(email),
    enabled: !!email, // Only run query if email exists
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // 2. Replaced useState/useEffect with useQuery for fetching favorites
  const { data: favoriteEvents = [] } = useQuery({
    queryKey: ["favorites", email],
    queryFn: () => fetchFavoriteEvents(email),
    enabled: !!email,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const pendingFavoritesRef = React.useRef([]);
  const debounceTimeoutRef = React.useRef(null);

  const sendPendingFavoritesToWebhook = async () => {
    const pendingArr = pendingFavoritesRef.current;
    if (!Array.isArray(pendingArr) || pendingArr.length === 0) return;

    try {
      await axios.post(import.meta.env.VITE_APP_MAKE_WEBHOOK_MATCH_URL, {
        email: email,
        actions: pendingArr.map((event) => ({ event: event.eventTitle })),
      });
      // Clear the array after successful sending
      pendingFavoritesRef.current = [];
    } catch (error) {
      console.error("Error sending to webhook", error);
    }
  };

  const debouncedSendWebhook = () => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(
      sendPendingFavoritesToWebhook,
      5000
    );
  };

  // 3. Socket listener to invalidate query on update
  useEffect(() => {
    if (!socket) return;

    const handleEventsUpdated = () => {
      setWaiting(false);
      // Invalidate the query to trigger a refetch
      queryClient.invalidateQueries({ queryKey: ["events", email] });
    };

    socket.on("events_updated", handleEventsUpdated);

    return () => {
      socket.off("events_updated", handleEventsUpdated);
    };
  }, [socket, queryClient, email, setWaiting]);

  // 4. Replaced API call functions with useMutation

  // Mutations for like/unlike that only refetch favorites to prevent UI jumps
  const likeMutation = useMutation({
    mutationFn: (variables) => api.post(`/api/like`, variables),
    onSuccess: () => {
      toast.success("เพิ่มในรายการโปรดสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["favorites", email] });
    },
    onError: (error) => {
      console.error("❌ Error: เกิดข้อผิดพลาดในการกดไลค์", error);
      toast.error("เกิดข้อผิดพลาดในการกดไลค์");
    },
  });

  const unlikeMutation = useMutation({
    mutationFn: ({ eventId }) => api.delete(`/api/like/${email}/${eventId}`),
    onSuccess: () => {
      toast.success("นำออกจากรายการโปรดสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["favorites", email] });
    },
    onError: (error) => {
      console.error("❌ Error: เกิดข้อผิดพลาดในการยกเลิกไลค์", error);
      toast.error("เกิดข้อผิดพลาดในการยกเลิกไลค์");
    },
  });

  // Generic mutation for actions that should refetch the whole event list (e.g., delete)
  const createListRefetchingMutation = (
    mutationFn,
    successMessage,
    errorMessage
  ) => {
    return useMutation({
      mutationFn,
      onSuccess: () => {
        toast.success(successMessage);
        // Invalidate and refetch both queries to update UI
        queryClient.invalidateQueries({ queryKey: ["events", email] });
        queryClient.invalidateQueries({ queryKey: ["favorites", email] });
      },
      onError: (error) => {
        console.error(`❌ Error: ${errorMessage}`, error);
        toast.error(errorMessage);
      },
    });
  };

  const deleteMutation = createListRefetchingMutation(
    (eventId) => api.delete(`/api/events/${eventId}`),
    "ลบกิจกรรมสำเร็จ",
    "เกิดข้อผิดพลาดในการลบกิจกรรม"
  );

  const deleteAllMutation = createListRefetchingMutation(
    () => api.delete(`/api/events/user/${email}`),
    "ลบกิจกรรมทั้งหมดสำเร็จ",
    "เกิดข้อผิดพลาดในการลบกิจกรรมทั้งหมด"
  );

  // Handler functions now call the mutations
  const handleLike = (eventId, title) => {
    likeMutation.mutate({ userEmail: email, eventId, eventTitle: title });
    pendingFavoritesRef.current.push({ eventId, eventTitle: title });
    debouncedSendWebhook();
  };

  const handleUnlike = (eventId) => {
    unlikeMutation.mutate({ eventId });
  };

  const handleDelete = (id) => {
    deleteMutation.mutate(id);
    // Also unlike it to clean up references
    unlikeMutation.mutate({ eventId: id });
  };

  const handleDeleteAll = () => {
    if (window.confirm("คุณแน่ใจว่าต้องการลบกิจกรรมทั้งหมดหรือไม่?")) {
      deleteAllMutation.mutate();
    }
  };

  if (waiting || isLoadingEvents) return <span className="loader"></span>;
  if (isErrorEvents)
    return <p className="loading-text">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>;
  console.log(events);
  const EventListContent = () => (
    <div className={`event-container ${isDarkMode ? "dark-mode" : ""}`}>
      {events.length < 0 ? (
        <div className="eventlist-empty-loading">
          <div className="eventlist-empty-text">ยังไม่มีกิจกรรมในขณะนี้</div>
        </div>
      ) : (
        <div className="event-list">
          {events.map((event) => (
            <div key={event._id} className="event-card">
              <img
                className="event-image"
                src={event.image}
                alt={event.title}
                width="200"
              />
              <div className="row-favorite">
                <h3 className="event-name">{event.title}</h3>
                <button
                  className="favorite-button"
                  onClick={() => {
                    const isFav = favoriteEvents.includes(event._id);
                    if (isFav) {
                      handleUnlike(event._id);
                    } else {
                      handleLike(event._id, event.title);
                    }
                  }}
                  aria-label={
                    favoriteEvents.includes(event._id)
                      ? "Unfavorite"
                      : "Favorite"
                  }
                >
                  {favoriteEvents.includes(event._id) ? (
                    <MdFavorite size={30} color="red" />
                  ) : (
                    <MdFavoriteBorder size={30} />
                  )}
                </button>
              </div>
              <div className="event-info">
                <p>
                  <span className="category-label">Category:</span>
                  {(event.genre ? Object.values(event.genre) : [])
                    .flat()
                    .map((subcategory, index) => (
                      <span key={index} className="genre-border">
                        {subcategory}
                      </span>
                    ))}{" "}
                </p>
              </div>
              <p className="event-description">
                <TbFileDescription />{" "}
                <span className="category-label">
                  Description:{event.description}
                </span>
              </p>
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
                  onClick={() => handleDelete(event._id)}
                  className="delete-button"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
          <div className="btn-delete-all">
            <button
              onClick={handleDeleteAll}
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
      <div
        className={`eventlist-modal-overlay ${isModalOpen ? "active" : ""}`}
        onClick={() => setIsModalOpen(false)}
      >
        <div
          className={`eventlist-modal-sheet ${isModalOpen ? "active" : ""}`}
          onClick={(e) => e.stopPropagation()}
        >
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
