import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAllEvents, fetchUsers } from '../../../lib/queries';
import PropTypes from 'prop-types'; // Import PropTypes
import api from '../../../server/api';
import { MdAutoAwesome, MdPeople } from 'react-icons/md';
import '../css/showtitle.css';
import { getFullImageUrl } from '../../../common/utils/image';

const ShowTitle = ({ userimage, openchat }) => {
  const { data: allEvents = [], isLoading } = useQuery({
    queryKey: ['allEvents'],
    queryFn: fetchAllEvents,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });

  const matchedEvent = useMemo(() => {
    if (!userimage || !allEvents) return null;

    // 1. Try matching by ID directly (Community/Event object)
    let event = allEvents.find((event) => event._id === userimage._id);
    if (event) return event;

    // 2. Try matching by eventId (Match object from InfoMatch)
    if (userimage.eventId) {
      event = allEvents.find((event) => event._id === userimage.eventId);
      if (event) return event;
    }

    return null;
  }, [allEvents, userimage]);

  // Logic to detect community room (when not an event match)
  const isCommunity =
    !matchedEvent && userimage && (userimage.name || userimage.roomName) && !userimage.eventId;

  // Fetch room details (members, photos) if it is a community
  const { data: roomDetails } = useQuery({
    queryKey: ['roomDetails', userimage?._id],
    queryFn: async () => {
      if (!userimage?._id) return null;
      const { data } = await api.get(`/api/room/${userimage._id}`);
      return data;
    },
    enabled: !!isCommunity && !!userimage?._id,
  });

  const communityMembers = useMemo(() => {
    if (!isCommunity || !users.length) return [];

    const memberEmails = roomDetails?.members || userimage?.members || [];

    return users
      .filter((u) => memberEmails.includes(u.email))
      .map((u) => {
        const detail = roomDetails?.memberDetails?.find((d) => d.email === u.email);
        return detail
          ? {
              ...u,
              photoURL: detail.photoURL || u.photoURL,
              nickname: detail.nickname,
            }
          : u;
      });
  }, [isCommunity, userimage, users, roomDetails]);

  // Fetch AI Insight only if it's a Match (has usermatch)
  const isMatch = !!userimage?.usermatch;
  const { data: aiInsight } = useQuery({
    queryKey: ['aiInsight', userimage?._id],
    queryFn: async () => {
      if (!isMatch || !userimage?._id) return null;
      const { data } = await api.get(`/api/aichat/${userimage._id}/insight`);
      return data.data;
    },
    enabled: isMatch && !!userimage?._id,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  if (isLoading) {
    return (
      <div className={`bg-title ${openchat ? 'mobile-layout-mode' : ''}`}>
        <div className="user-image">
          <h2 className="usertitle">Loading...</h2>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className={`bg-title ${openchat ? 'mobile-layout-mode' : ''}`}>
        {matchedEvent ? (
          <div className="user-image">
            <div className="title-header">
              {(matchedEvent.image || matchedEvent.thumbnail) && (
                <img
                  src={matchedEvent.image || matchedEvent.thumbnail}
                  alt={matchedEvent.title}
                  className="event-title-image"
                />
              )}
              <div className="title-wrapper">
                <h2 className="usertitle">{matchedEvent.title}</h2>
                {aiInsight && (
                  <div className="ai-insight-badge">
                    <MdAutoAwesome /> {aiInsight}
                  </div>
                )}
              </div>
            </div>
            <div className="event-details">
              {matchedEvent.genre && (
                <div className="event-genre">
                  หมวดหมู่:{' '}
                  {Array.isArray(matchedEvent.genre)
                    ? matchedEvent.genre.join(', ')
                    : typeof matchedEvent.genre === 'object'
                      ? Object.values(matchedEvent.genre).flat().join(', ')
                      : matchedEvent.genre}
                </div>
              )}
              {matchedEvent.location && (
                <div className="event-location">สถานที่: {matchedEvent.location}</div>
              )}
              {matchedEvent.date && (
                <div className="event-date">
                  วันที่:{' '}
                  {typeof matchedEvent.date === 'object' && matchedEvent.date.when
                    ? matchedEvent.date.when
                    : matchedEvent.date}
                </div>
              )}
              {matchedEvent.description && (
                <div className="event-description">
                  <p>{matchedEvent.description}</p>
                </div>
              )}
              {matchedEvent.link && (
                <div className="event-link-wrapper">
                  <a
                    href={matchedEvent.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="event-link"
                  >
                    Info more
                  </a>
                </div>
              )}
            </div>
          </div>
        ) : isCommunity ? (
          <div className="community-info-container">
            <style>{`
              .community-info-container {
                display: flex;
                flex-direction: column;
                height: 100%;
                color: var(--text-primary, #fff);
              }
              .community-header {
                padding: 20px;
                text-align: center;
                border-bottom: 1px solid rgba(255,255,255,0.1);
              }
              .community-image {
                width: 80px;
                height: 80px;
                border-radius: 20px;
                object-fit: cover;
                margin-bottom: 10px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
              }
              .community-title {
                font-size: 1.2rem;
                font-weight: 600;
                margin-bottom: 5px;
              }
              .community-stats {
                font-size: 0.9rem;
                color: var(--text-secondary, #aaa);
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 5px;
              }
              .members-section {
                padding: 15px;
                flex: 1;
                overflow-y: auto;
                max-height: 400px;
              }
              .members-header {
                font-size: 0.8rem;
                color: var(--text-secondary, #aaa);
                margin-bottom: 10px;
                text-transform: uppercase;
                letter-spacing: 1px;
              }
              .member-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 8px 0;
                border-bottom: 1px solid rgba(255,255,255,0.05);
              }
              .member-avatar {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                object-fit: cover;
              }
              .member-name {
                font-size: 0.9rem;
                font-weight: 500;
               color: var(--text-secondary, #aaa);
              }
            `}</style>
            <div className="community-header">
              <img
                src={
                  userimage.image ||
                  'https://images.squarespace-cdn.com/content/v1/557adc8ae4b05fe7bf13f9f0/1440602294667-276CNPQ99Q205NXV17BH/image-asset.jpeg'
                }
                alt={userimage.name}
                className="community-image"
              />
              <h2 className="community-title">{userimage.name}</h2>
              <div className="community-stats">
                <MdPeople /> {communityMembers.length} Members
              </div>
            </div>
            <div className="members-section">
              <h3 className="members-header">Members ({communityMembers.length})</h3>
              <div className="member-list">
                {communityMembers.map((member) => (
                  <div key={member._id || member.email} className="member-item">
                    <img
                      src={
                        getFullImageUrl(member.photoURL) ||
                        'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'
                      }
                      alt={member.displayName}
                      className="member-avatar"
                    />
                    <span className="member-name">
                      {member.nickname
                        ? `${member.nickname} (${member.displayName || member.email})`
                        : member.displayName || member.email}
                    </span>
                  </div>
                ))}
                {communityMembers.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#888', padding: '10px' }}>
                    No members found
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-no-title">{/* No event context for this chat */}</div>
        )}
      </div>
    </div>
  );
};

export default ShowTitle;

ShowTitle.propTypes = {
  userimage: PropTypes.object,
  openchat: PropTypes.bool,
};
