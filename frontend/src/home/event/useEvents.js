// c:/Users/User/Project-React/frontend/src/home/event/useEvents.js
import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const API_BASE_URL = import.meta.env.VITE_APP_API_BASE_URL;

export function useEvents({ email, socket }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [favoriteEvents, setFavoriteEvents] = useState([]);
  const [pendingFavorites, setPendingFavorites] = useState([]);
  const debounceRef = useRef(null);

  const fetchEvents = useCallback(async () => {
    if (!email) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/api/events/${email}`);
      setEvents(res.data);
    } catch (err) {
      console.error("❌ Error fetching events:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [email]);

  const fetchFavoriteEvents = useCallback(async () => {
    if (!email) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/api/likes/${email}`);
      setFavoriteEvents(
        Array.isArray(res.data) ? res.data.map((like) => like.eventId) : []
      );
    } catch (err) {
      console.error("❌ Error fetching favorite events:", err);
    }
  }, [email]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchEvents(), fetchFavoriteEvents()]).finally(() =>
      setLoading(false)
    );
  }, [fetchEvents, fetchFavoriteEvents]);

  useEffect(() => {
    if (!socket) return;
    const handleEventsUpdate = () => {
      fetchEvents();
    };
    socket.on("events_updated", handleEventsUpdate);
    return () => {
      socket.off("events_updated", handleEventsUpdate);
    };
  }, [socket, fetchEvents]);

  const handleDelete = async (id) => {
    if (!window.confirm("คุณแน่ใจว่าต้องการลบกิจกรรมนี้หรือไม่?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/detele-events/${id}`);
      // No need to call fetchEvents, socket should handle the update
    } catch (err) {
      console.error("❌ Error deleting event:", err);
      toast.error("เกิดข้อผิดพลาดในการลบกิจกรรม");
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm("คุณแน่ใจว่าต้องการลบกิจกรรมทั้งหมดหรือไม่?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/delete-all-events/${email}`);
      await axios.delete(`${API_BASE_URL}/api/like/${email}`);
      setFavoriteEvents([]);
      // No need to call fetchEvents, socket should handle the update
    } catch (err) {
      toast.error("เกิดข้อผิดพลาดในการลบกิจกรรมทั้งหมด: " + err.message);
      console.error("❌ Error deleting all events and likes:", err);
    }
  };

  const handleLike = async (eventId, title) => {
    try {
      await axios.post(`${API_BASE_URL}/api/like`, {
        userEmail: email,
        eventId: eventId,
        eventTitle: title,
      });
      setFavoriteEvents((prev) => [...prev, eventId]);
      setPendingFavorites((prev) => [...prev, { event: title }]);
    } catch (err) {
      console.error("❌ Error liking event:", err);
    }
  };

  const handleUnlike = async (eventId) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/like/${email}/${eventId}`);
      setFavoriteEvents((prev) => prev.filter((id) => id !== eventId));
    } catch (err) {
      console.error("❌ Error unliking event:", err);
    }
  };

  const sendPendingFavoritesToWebhook = async (pendingArr) => {
    if (!Array.isArray(pendingArr) || pendingArr.length === 0) return;
    try {
      await axios.post(import.meta.env.VITE_APP_MAKE_WEBHOOK_MATCH_URL, {
        email: email,
        actions: pendingArr.map(({ event }) => ({ event })),
      });
    } catch (error) {
      console.error("Error sending to webhook", error);
    }
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (pendingFavorites.length > 0) {
      debounceRef.current = setTimeout(() => {
        sendPendingFavoritesToWebhook(pendingFavorites);
        setPendingFavorites([]);
      }, 5000);
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingFavorites]);

  return {
    events,
    loading,
    error,
    favoriteEvents,
    handleDelete,
    handleDeleteAll,
    handleLike,
    handleUnlike,
  };
}
