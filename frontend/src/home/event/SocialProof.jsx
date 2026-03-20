import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../server/api';
import UserAvatar from '../../components/UserAvatar';
import './SocialProof.css';

const SocialProof = ({ eventId, email }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['social-proof', eventId, email],
    queryFn: async () => {
      const res = await api.get(`/api/events/${eventId}/social-proof/${email}`);
      return res.data;
    },
    enabled: !!eventId && !!email,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  if (isLoading || !data || data.totalCount === 0) {
    return null;
  }

  const { friends, totalCount } = data;

  return (
    <div className="social-proof-container">
      <div className="avatar-group">
        {friends.map((friend, index) => (
          <UserAvatar
            key={friend.email}
            src={friend.photoURL}
            alt={friend.displayName}
            className="social-avatar"
            style={{ zIndex: 10 - index, marginLeft: index === 0 ? 0 : -12 }}
          />
        ))}
        {totalCount > friends.length && (
          <div className="avatar-more" style={{ zIndex: 0, marginLeft: -12 }}>
            +{totalCount - friends.length}
          </div>
        )}
      </div>
      <span className="social-proof-text">
        {totalCount === 1 
          ? 'มีเพื่อนคุณสนใจกิจกรรมนี้' 
          : `มีเพื่อนคุณ ${totalCount} คนสนใจกิจกรรมนี้`}
      </span>
    </div>
  );
};

export default SocialProof;
