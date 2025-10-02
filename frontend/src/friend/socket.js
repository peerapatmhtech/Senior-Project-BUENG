
// Handles 'update-users' event by directly updating the query cache
export const handleUserStatusUpdate = (queryClient, userEmail, data) => {
  // Update cache for the ["users"] query
  queryClient.setQueryData(["users"], (prevUsers) => {
    if (!prevUsers) return [];
    if (Array.isArray(data)) {
      return prevUsers.map((user) => ({
        ...user,
        isOnline: data.some((onlineUser) => onlineUser.email === user.email),
        lastSeen:
          data.find((onlineUser) => onlineUser.email === user.email)
            ?.lastSeen || user.lastSeen,
      }));
    } else if (data && Array.isArray(data.onlineUsers)) {
      return prevUsers.map((user) => ({
        ...user,
        isOnline: data.onlineUsers.includes(user.email),
        lastSeen:
          (data.lastSeenTimes && data.lastSeenTimes[user.email]) ||
          user.lastSeen,
      }));
    }
    return prevUsers;
  });

  // Update cache for the ["current", userEmail] query (which is the friend list)
  if (userEmail) {
    queryClient.setQueryData(["current", userEmail], (prevFriends) => {
      if (!prevFriends) return [];
      if (Array.isArray(data)) {
        return prevFriends.map((friend) => ({
          ...friend,
          isOnline: data.some(
            (onlineUser) => onlineUser.email === friend.email
          ),
          lastSeen:
            data.find((onlineUser) => onlineUser.email === friend.email)
              ?.lastSeen || friend.lastSeen,
        }));
      } else if (data && Array.isArray(data.onlineUsers)) {
        return prevFriends.map((friend) => ({
          ...friend,
          isOnline: data.onlineUsers.includes(friend.email),
          lastSeen:
            (data.lastSeenTimes && data.lastSeenTimes[friend.email]) ||
            friend.lastSeen,
        }));
      }
      return prevFriends;
    });
  }
};

// Handles 'user-online' event by updating a specific user's status
export const handleUserOnline = (queryClient, userEmail, userData) => {
  if (!userData || !userData.email) return;

  const updateUserState = (user) =>
    user.email === userData.email
      ? { ...user, isOnline: true, lastSeen: null }
      : user;

  queryClient.setQueryData(['users'], (prevUsers) =>
    prevUsers?.map(updateUserState) || []
  );

  if (userEmail) {
    queryClient.setQueryData(['current', userEmail], (prevFriends) =>
      prevFriends?.map(updateUserState) || []
    );
  }
};

// Handles 'user-offline' event by updating a specific user's status
export const handleUserOffline = (queryClient, userEmail, userData) => {
  if (!userData || !userData.email) return;

  const updateUserState = (user) =>
    user.email === userData.email
      ? { ...user, isOnline: false, lastSeen: userData.lastSeen }
      : user;

  queryClient.setQueryData(['users'], (prevUsers) =>
    prevUsers?.map(updateUserState) || []
  );

  if (userEmail) {
    queryClient.setQueryData(['current', userEmail], (prevFriends) =>
      prevFriends?.map(updateUserState) || []
    );
  }
};

// Invalidates queries when friend list changes (accept, remove)
export const invalidateFriendQueries = (queryClient, userEmail) => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
    if (userEmail) {
        queryClient.invalidateQueries({ queryKey: ['current', userEmail] });
    }
};
