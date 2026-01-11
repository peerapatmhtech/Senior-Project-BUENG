import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../server/api';

// Fetch functions for React Query
export const fetchUserPhotos = async (userEmail) => {
  if (!userEmail) return [];
  const encodedEmail = encodeURIComponent(userEmail);
  const { data } = await api.get(`/api/user-photos/${encodedEmail}`);
  return data.data; // Note: response is nested under .data
};
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

/**
 * Fetches a paginated list of events for a specific user.
 * @param {string} userEmail - The user's email.
 * @param {number} page - The page number to fetch.
 * @param {number} limit - The number of items per page.
 * @returns {Promise<object>} An object containing events and pagination info.
 */
export const fetchEvents = async (userEmail, page = 1, limit = 10) => {
  if (!userEmail) return { events: [], totalPages: 0, currentPage: 1, totalEvents: 0 };
  const encodedEmail = encodeURIComponent(userEmail);
  const { data } = await api.get(`/api/events/${encodedEmail}`, {
    params: { page, limit },
  });
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
export const fetchUserInfo = async (userEmail) => {
  if (!userEmail) return null;
  const encodedEmail = encodeURIComponent(userEmail);
  const { data } = await api.get(`/api/infos/${encodedEmail}`);
  return data;
};
export const fetchInfos = async () => {
  const { data } = await api.get(`/api/infos`);
  return data;
};
export const fetchPhoto = async () => {
  const { data } = await api.get(`/api/user-photo`);
  return data.data; // Note: response is nested under .data
};

// Mutation Hooks

export const useFollowUser = () => {
  const queryClient = useQueryClient();
  const userEmail = localStorage.getItem('userEmail');

  return useMutation({
    mutationFn: async (targetEmail) => {
      const currentUser = queryClient.getQueryData(['currentUser', userEmail]);
      const isFollowing = currentUser?.following?.includes(targetEmail);
      const url = `/api/users/${userEmail}/${isFollowing ? 'unfollow' : 'follow'}/${targetEmail}`;
      const method = isFollowing ? 'DELETE' : 'POST';
      return api({ method, url });
    },
    onSuccess: () => {
      // Invalidate and refetch the currentUser query to update the following list
      return queryClient.invalidateQueries({
        queryKey: ['currentUser', userEmail],
      });
    },
    // Optional: Add onError for error handling
  });
};

export const useDeleteFriend = () => {
  const queryClient = useQueryClient();
  const userEmail = localStorage.getItem('userEmail');

  return useMutation({
    mutationFn: async ({ type, userToDelete, roomName, infoMatchId }) => {
      console.log('Deleting:', { type, userToDelete, roomName, infoMatchId });
      switch (type) {
        case 'match':
          try {
            // Delete from infomatch (for matches)
            if (infoMatchId && infoMatchId !== undefined) {
              const response = await api.delete(`/api/infomatch/${infoMatchId}`);
              if (response.status === 200) {
                return response;
              }
            }
          } catch (err) {
            throw new Error('');
          }
          break;
        case 'friend':
          try {
            // Delete from infomatch (for matches)
            // if (infoMatchId && infoMatchId !== undefined) {
            //   const responseMatch = await api.delete(`/api/infomatch/${infoMatchId}`);
            //   // Delete from user's friends list
            //   if (responseMatch.status === 200) {
            //     return responseMatch;
            //   }
            // }
            // Delete from user's friends list
            if (userToDelete && userToDelete !== undefined) {
              const responseUser = await api.delete(
                `/api/users/${userEmail}/friends/${userToDelete}`
              );
              if (responseUser.status === 200) {
                return responseUser;
              }
            }
          } catch (err) {
            throw new Error('');
          }
          break;

        case 'room':
          // Delete from user's joined rooms (for communities)
          if (roomName && roomName !== undefined) {
            return api.delete(`/api/delete-joined-rooms/${roomName}/${userEmail}`);
          }
          break;

        default:
          throw new Error(`Invalid deletion type: ${type}`);
      }
    },
    onSuccess: () => {
      // Invalidate all relevant queries to trigger a global refetch
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ['currentUser', userEmail] }),
        queryClient.invalidateQueries({ queryKey: ['userRooms', userEmail] }),
        queryClient.invalidateQueries({ queryKey: ['infoMatch'] }),
      ]);
    },
  });
};
