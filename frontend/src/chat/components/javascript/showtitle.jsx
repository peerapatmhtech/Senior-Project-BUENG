import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAllEvents } from "../../../lib/queries";
import PropTypes from "prop-types"; // Import PropTypes
import "../css/showtitle.css";

const ShowTitle = ({ userimage, openchat }) => {
  const { data: allEvents = [], isLoading } = useQuery({
    queryKey: ["allEvents"],
    queryFn: fetchAllEvents,
  });

  const matchedEvent = useMemo(() => {
    if (!userimage || !allEvents) return null;
    return allEvents.find((event) => event._id === userimage._id);
  }, [allEvents, userimage]);

  if (isLoading) {
    return (
      <div className={`bg-title ${openchat ? "mobile-layout-mode" : ""}`}>
        <div className="user-image">
          <h2 className="usertitle">Loading...</h2>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className={`bg-title ${openchat ? "mobile-layout-mode" : ""}`}>
        {matchedEvent ? (
          <div className="user-image">
            {(matchedEvent.image || matchedEvent.thumbnail) && (
              <img
                src={matchedEvent.image || matchedEvent.thumbnail}
                alt={matchedEvent.title}
                className="event-title-image"
              />
            )}
            <h2 className="usertitle">{matchedEvent.title}</h2>
            <div className="event-details">
              {matchedEvent.genre && (
                <div className="event-genre">
                  หมวดหมู่:{" "}
                  {Array.isArray(matchedEvent.genre)
                    ? matchedEvent.genre.join(", ")
                    : typeof matchedEvent.genre === "object"
                    ? Object.values(matchedEvent.genre).flat().join(", ")
                    : matchedEvent.genre}
                </div>
              )}
              {matchedEvent.location && (
                <div className="event-location">
                  สถานที่: {matchedEvent.location}
                </div>
              )}
              {matchedEvent.date && (
                <div className="event-date">
                  วันที่:{" "}
                  {typeof matchedEvent.date === "object" &&
                  matchedEvent.date.when
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
        ) : (
          <div className="bg-no-title">
            {/* No event context for this chat */}
          </div>
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
