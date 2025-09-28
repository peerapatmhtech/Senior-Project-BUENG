import React, { createContext, useContext, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import io from "socket.io-client";
import api from "../api";
import { toast } from "react-toastify";

// --- Helper Functions for API calls ---
const fetchNotificationsAPI = async (userEmail) => {
  if (!userEmail) return [];
  try {
    const response = await api.get(`/api/friend-requests/${userEmail}`);
    if (!response.data || !response.data.requests) return [];
    // Map to consistent format
    return response.data.requests.map((req) => ({
      id: req.requestId || `${req.from?.email}-${Date.now()}`,
      type: "friend-request",
      from: req.from,
      to: req.to,
      timestamp: req.timestamp,
      read: req.read || false,
    }));
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return []; // No notifications is not an error
    }
    throw error; // Let React Query handle other errors
  }
};

const socket = io(import.meta.env.VITE_APP_API_BASE_URL);
const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const userEmail = localStorage.getItem("userEmail");
  const displayName = localStorage.getItem("userName");
  const photoURL = localStorage.getItem("userPhoto");

  // 1. Replaced fetchNotifications with useQuery
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', userEmail],
    queryFn: () => fetchNotificationsAPI(userEmail),
    enabled: !!userEmail, // Only run if userEmail is available
    staleTime: 1000 * 60 * 1, // 1 minute
  });

  // --- Mutations for all notification actions ---

  const useNotificationMutation = (mutationFn, { successMsg, errorMsg, onMutate, onSuccess } = {}) => {
    return useMutation({
      mutationFn,
      onMutate,
      onSuccess: (data, variables) => {
        if (successMsg) toast.success(successMsg(data, variables));
        // Invalidate to refetch and keep data consistent
        queryClient.invalidateQueries({ queryKey: ['notifications', userEmail] });
        if (onSuccess) onSuccess(data, variables);
      },
      onError: (error) => {
        if (errorMsg) toast.error(errorMsg(error));
        console.error("Mutation Error:", error);
      },
    });
  };

  // 2. Mutation for marking as read
  const markAsReadMutation = useNotificationMutation(
    (notificationId) => api.put(`/api/mark-friend-requests-read/${notificationId}`, { read: true }),
    { errorMsg: () => "ไม่สามารถทำเครื่องหมายว่าอ่านแล้วได้" }
  );

  // 3. Mutation for accepting a friend request
  const acceptRequestMutation = useNotificationMutation(
    async ({ requestId, fromUser }) => {
      const finalRoomId = crypto.randomUUID();
      const response = await api.post(`/api/friend-request-response`, {
        requestId,
        userEmail,
        friendEmail: fromUser.email,
        response: "accept",
        roomId: finalRoomId,
        from: { email: userEmail, displayName, photoURL },
        to: fromUser.email,
        timestamp: new Date().toISOString(),
      });
      await api.post(`/api/add-friend`, { userEmail: fromUser.email, friendEmail: userEmail, roomId: requestId });
      return { responseData: response.data, fromUser };
    },
    {
      successMsg: (_, { fromUser }) => `คุณเป็นเพื่อนกับ ${fromUser.displayName} แล้ว`,
      errorMsg: () => "ไม่สามารถตอบรับคำขอเพื่อนได้",
      onSuccess: (_, { fromUser }) => {
        if (socket.connected) {
          socket.emit("notify-friend-accept", { to: fromUser.email, from: userEmail });
        }
      },
    }
  );

  // 4. Mutation for declining/deleting a friend request
  const deleteRequestMutation = useNotificationMutation(
    (requestId) => api.delete(`/api/friend-request/${requestId}`),
    {
      successMsg: () => "ปฏิเสธคำขอเป็นเพื่อนแล้ว",
      errorMsg: () => "ไม่สามารถลบคำขอเพื่อนได้",
    }
  );

  // --- Socket.IO Effect ---
  useEffect(() => {
    if (!socket || !userEmail) return;

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['notifications', userEmail] });

    socket.on("connect", () => socket.emit("user-online", { displayName, photoURL, email: userEmail }));
    socket.on("notify-friend-request", invalidate);
    socket.on("notify-friend-accept", invalidate);

    const pingInterval = setInterval(() => { if (socket.connected) socket.emit("user-ping", { email: userEmail }); }, 30000);
    const beforeUnload = () => socket.emit("user-offline", { email: userEmail });
    window.addEventListener("beforeunload", beforeUnload);

    return () => {
      socket.off("connect");
      socket.off("notify-friend-request", invalidate);
      socket.off("notify-friend-accept", invalidate);
      clearInterval(pingInterval);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [userEmail, displayName, photoURL, queryClient]);

  // --- Exposed Functions ---
  const handleFriendRequestResponse = (requestId, response) => {
    const notif = notifications.find(n => n.id === requestId);
    if (!notif) return;

    markAsReadMutation.mutate(requestId);
    if (response === "accept") {
      acceptRequestMutation.mutate({ requestId, fromUser: notif.from });
    } else {
      deleteRequestMutation.mutate(requestId);
    }
  };

  const handleDeleteFriendRequest = (requestId) => {
    deleteRequestMutation.mutate(requestId);
  };

  const clearReadNotifications = () => {
    // This is a client-side only action, no API call needed
    const readIds = notifications.filter(n => n.read).map(n => n.id);
    if (readIds.length > 0) {
        queryClient.setQueryData(['notifications', userEmail], (oldData) => 
            oldData.filter(n => !n.read)
        );
        toast.info("ล้างการแจ้งเตือนที่อ่านแล้ว");
    }
  };

  const value = useMemo(() => ({
    notifications,
    isLoading,
    socket,
    // Actions
    markNotificationAsRead: markAsReadMutation.mutate,
    handleFriendRequestResponse,
    handleDeleteFriendRequest,
    clearReadNotifications,
    // For UI
    unreadCount: notifications.filter(n => !n.read).length,
  }), [notifications, isLoading, socket]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};