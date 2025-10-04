import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api";

// Fetch functions for React Query

export const fetchUsers = async () => {
  const { data } = await api.get(`/api/users`);
  return data;
};

export const fetchCurrentUser = async (userEmail) => {
  if (!userEmail) return null;
  const encodedEmail = encodeURIComponent(userEmail);
  const { data } = await api.get(`/api/friends/${encodedEmail}`);
  return data;
};

export const fetchUserRooms = async (userEmail) => {
  if (!userEmail) return [];
  const encodedEmail = encodeURIComponent(userEmail);
  const { data } = await api.get(`/api/user-rooms/${encodedEmail}`);
  return data;
};

export const fetchInfoMatch = async () => {
  const { data } = await api.get(`/api/infomatch/all`);
  return data.data; // Note: response is nested under .data
};

export const fetchAllRooms = async () => {
  const { data } = await api.get(`/api/allrooms`);
  return data;
};

export const fetchEvents = async (userEmail) => {
  if (!userEmail) return [];
  const encodedEmail = encodeURIComponent(userEmail);
  const { data } = await api.get(`/api/events/${encodedEmail}`);
  return data;
};

export const fetchInfos = async () => {
  const { data } = await api.get(`/api/infos`);
  return data;
};

export const fetchFollowInfo = async (userEmail) => {
  if (!userEmail) return { followers: [], following: [] };
  const { data } = await api.get(`/api/user/${userEmail}/follow-info`);
  return data;
};

export const fetchAllEvents = async () => {
  const { data } = await api.get(`/api/events`);
  return data;
};

// Mutation Hooks

export const useFollowUser = () => {
  const queryClient = useQueryClient();
  const userEmail = localStorage.getItem("userEmail");

  return useMutation({
    mutationFn: async (targetEmail) => {
      const currentUser = queryClient.getQueryData(["currentUser", userEmail]);
      const isFollowing = currentUser?.following?.includes(targetEmail);
      const url = `/api/users/${userEmail}/${isFollowing ? "unfollow" : "follow"}/${targetEmail}`;
      const method = isFollowing ? "DELETE" : "POST";
      return api({ method, url });
    },
    onSuccess: () => {
      // Invalidate and refetch the currentUser query to update the following list
      return queryClient.invalidateQueries({ queryKey: ["currentUser", userEmail] });
    },
    // Optional: Add onError for error handling
  });
};

export const useDeleteFriend = () => {
  const queryClient = useQueryClient();
  const userEmail = localStorage.getItem("userEmail");

  return useMutation({
    mutationFn: async ({ userToDelete, roomName, infoMatchId }) => {
      const promises = [];

      // Delete from infomatch (for matches)
      if (infoMatchId) {
        promises.push(api.delete(`/api/infomatch/${infoMatchId}`));
      }

      // Delete from user's friends list
      if (userToDelete) {
        promises.push(api.delete(`/api/users/${userEmail}/friends/${userToDelete}`));
      }

      // Delete from user's joined rooms (for communities)
      if (infoMatchId && roomName) {
        promises.push(api.delete(`/api/delete-joined-rooms/${infoMatchId}/${userEmail}`));
      }

      return Promise.all(promises);
    },
    onSuccess: () => {
      // Invalidate all relevant queries to trigger a global refetch
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ["currentUser", userEmail] }),
        queryClient.invalidateQueries({ queryKey: ["userRooms", userEmail] }),
        queryClient.invalidateQueries({ queryKey: ["infoMatch"] }),
      ]);
    },
  });
};
