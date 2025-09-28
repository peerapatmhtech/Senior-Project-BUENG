import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAllEvents } from "../../../lib/queries";
import "../css/showtitle.css";
import { useNavigate } from "react-router-dom";

const ShowTitle = ({ userimage, openchat }) => {
  const navigate = useNavigate();

  const { data: allEvents = [], isLoading } = useQuery({
    queryKey: ["allEvents"],
    queryFn: fetchAllEvents,
  });

  const matchedEvent = useMemo(() => {
    if (!userimage || !allEvents) return null;
    return allEvents.find((event) => event.title === userimage.title);
  }, [allEvents, userimage]);

  const handleBackToMatching = () => {
    navigate("/home");
  };

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
            <h2 className="usertitle">{matchedEvent.title}</h2>
            <div className="event-details">
              {matchedEvent.genre && (
                <div className="event-genre">
                  หมวดหมู่: {matchedEvent.genre}
                </div>
              )}
              {matchedEvent.location && (
                <div className="event-location">
                  สถานที่: {matchedEvent.location}
                </div>
              )}
              {matchedEvent.date && (
                <div className="event-date">วันที่: {matchedEvent.date}</div>
              )}
              {matchedEvent.description && (
                <div className="event-description">
                  <p>{matchedEvent.description}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-no-title">
            <button className="back-button" onClick={handleBackToMatching}>
              Back to Matching
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShowTitle;
