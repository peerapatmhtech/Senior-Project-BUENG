import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../server/api";
import "./Eventlist.css";
import { useTheme } from "../../context/themecontext";
import { useSocket } from "../../context/make.com";
import { MdFavorite, MdFavoriteBorder } from "react-icons/md";
import { FiCalendar, FiX } from "react-icons/fi";
import { TbFileDescription } from "react-icons/tb";
import { toast } from "react-toastify";
import PropTypes from "prop-types";

// Helper function to fetch events
const fetchEvents = async (email) => {
  try {
    const res = await api.get(`/api/events/${email}`);
    return res.data.events || []; // Assuming res.data is { events: [], ... }
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

// Moved EventListContent outside of EventList to prevent re-mounting on re-renders.
const EventListContent = ({
  isDarkMode,
  events,
  favoriteEvents,
  handleUnlike,
  handleLike,
  handleDelete,
  handleDeleteAll,
}) => (
  <div className={`event-container ${isDarkMode ? "dark-mode" : ""}`}>
    {events.length === 0 ? ( // Fixed bug: was events.length < 0
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
                    handleLike(event._id);
                  }
                }}
                aria-label={
                  favoriteEvents.includes(event._id) ? "Unfavorite" : "Favorite"
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

const EventList = ({ setWaiting, waiting }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const email = localStorage.getItem("userEmail");
  const { isDarkMode } = useTheme();
  const socket = useSocket();
  const queryClient = useQueryClient();

  const {
    data: events = [],
    isLoading: isLoadingEvents,
    isError: isErrorEvents,
  } = useQuery({
    queryKey: ["events", email],
    queryFn: () => fetchEvents(email),
    enabled: !!email,
    staleTime: 1000 * 60 * 2,
  });

  const { data: favoriteEvents = [] } = useQuery({
    queryKey: ["favorites", email],
    queryFn: () => fetchFavoriteEvents(email),
    enabled: !!email,
    staleTime: 1000 * 60 * 2,
  });

  const pendingFavoritesRef = React.useRef([]);
  const debounceTimeoutRef = React.useRef(null);

  const sendPendingFavoritesToWebhook = async () => {
    const pendingArr = pendingFavoritesRef.current;
    if (!Array.isArray(pendingArr) || pendingArr.length === 0) return;
    try {
      await api.post(`/api/events/match`, {
        email: email,
        action: { eventsId: pendingArr }, // ส่ง eventId ไปตรงๆ
      });
      // await axios.post(import.meta.env.VITE_APP_MAKE_WEBHOOK_MATCH_URL, {
      //   email: email,
      //   actions: pendingArr.map((event) => ({ event: event.eventId })),
      // });
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

  // The original socket logic is correct for handling external updates,
  // now that the component structure is fixed.
  useEffect(() => {
    if (!socket) return;

    const handleEventsUpdated = () => {
      setWaiting(false);
      queryClient.invalidateQueries({ queryKey: ["events", email] });
    };

    socket.on("events_updated", handleEventsUpdated);

    return () => {
      socket.off("events_updated", handleEventsUpdated);
    };
  }, [socket, queryClient, email, setWaiting]);

  const likeMutation = useMutation({
    mutationFn: (variables) => api.post(`/api/like`, variables),
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ["favorites", email] });
      const previousFavorites = queryClient.getQueryData(["favorites", email]);
      queryClient.setQueryData(["favorites", email], (old = []) => [
        ...old,
        newData.eventId,
      ]);
      return { previousFavorites };
    },
    onSuccess: () => {
      toast.success("เพิ่มในรายการโปรดสำเร็จ");
    },
    onError: (err, newData, context) => {
      queryClient.setQueryData(["favorites", email], context.previousFavorites);
      console.error("❌ Error: เกิดข้อผิดพลาดในการกดไลค์", err);
      toast.error("เกิดข้อผิดพลาดในการกดไลค์");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites", email] });
    },
  });

  const unlikeMutation = useMutation({
    mutationFn: ({ eventId }) => api.delete(`/api/like/${email}/${eventId}`),
    onMutate: async ({ eventId }) => {
      await queryClient.cancelQueries({ queryKey: ["favorites", email] });
      const previousFavorites = queryClient.getQueryData(["favorites", email]);
      queryClient.setQueryData(["favorites", email], (old = []) =>
        old.filter((id) => id !== eventId)
      );
      return { previousFavorites };
    },
    onSuccess: () => {
      // Optional: Can show a success toast if desired, but UI is already updated.
    },
    onError: (err, newData, context) => {
      queryClient.setQueryData(["favorites", email], context.previousFavorites);
      console.error("❌ Error: เกิดข้อผิดพลาดในการยกเลิกไลค์", err);
      toast.error("เกิดข้อผิดพลาดในการยกเลิกไลค์");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites", email] });
    },
  });

  const createListRefetchingMutation = (
    mutationFn,
    successMessage,
    errorMessage
  ) => {
    return useMutation({
      // This is the line that needs to be moved
      mutationFn,
      onSuccess: () => {
        toast.success(successMessage);
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
    (eventId) =>
      api.delete(`/api/events/${eventId}`, { data: { email: email } }), // Pass email in request body
    "ลบกิจกรรมสำเร็จ",
    "เกิดข้อผิดพลาดในการลบกิจกรรม"
  );

  const deleteAllMutation = createListRefetchingMutation(
    () => api.delete(`/api/events/user/${email}`),
    "ลบกิจกรรมทั้งหมดสำเร็จ",
    "เกิดข้อผิดพลาดในการลบกิจกรรมทั้งหมด"
  );

  const handleLike = (eventId) => { // Ensure events is an array before using it
    likeMutation.mutate({ userEmail: email, eventId });
    pendingFavoritesRef.current.push(eventId); // เก็บ eventId เป็น string ตรงๆ
    debouncedSendWebhook();
  };

  const handleUnlike = (eventId) => {
    unlikeMutation.mutate({ eventId });
  };

  const handleDelete = (id) => {
    deleteMutation.mutate(id);
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

  return (
    <>
      <button
        className={`eventlist-modal-toggle-btn ${isDarkMode ? "dark-mode" : ""}`}
        onClick={() => setIsModalOpen(true)}
        aria-label="Open Events"
      >
        <FiCalendar />
      </button>
      <div className="eventlist-desktop-view">
        {/* Ensure events is an array before passing to content */}
        <EventListContent
          isDarkMode={isDarkMode}
          events={Array.isArray(events) ? events : []}
          favoriteEvents={favoriteEvents}
          handleUnlike={handleUnlike}
          handleLike={handleLike}
          handleDelete={handleDelete}
          handleDeleteAll={handleDeleteAll}
        />
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
            <EventListContent
              // Ensure events is an array before passing to content
              isDarkMode={isDarkMode}
              events={Array.isArray(events) ? events : []}
              favoriteEvents={favoriteEvents}
              handleUnlike={handleUnlike}
              handleLike={handleLike}
              handleDelete={handleDelete}
              handleDeleteAll={handleDeleteAll}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default EventList;

EventListContent.propTypes = {
  isDarkMode: PropTypes.bool.isRequired,
  events: PropTypes.array.isRequired,
  favoriteEvents: PropTypes.array.isRequired,
  handleUnlike: PropTypes.func.isRequired,
  handleLike: PropTypes.func.isRequired,
  handleDelete: PropTypes.func.isRequired,
  handleDeleteAll: PropTypes.func.isRequired,
};

EventList.propTypes = {
  setWaiting: PropTypes.func.isRequired,
  waiting: PropTypes.bool.isRequired,
};
