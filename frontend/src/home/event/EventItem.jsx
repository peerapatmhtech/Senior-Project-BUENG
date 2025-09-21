// c:/Users/User/Project-React/frontend/src/home/event/EventItem.jsx
import React from 'react';
import { MdFavorite, MdFavoriteBorder } from "react-icons/md";
import { TbFileDescription } from "react-icons/tb";

const EventItem = ({ event, isFavorite, onLike, onUnlike, onDelete }) => {
  if (!event) return null;

  const { _id, title, genre, description, link, image } = event;

  const handleLikeClick = () => {
    if (isFavorite) {
      onUnlike(_id);
    } else {
      onLike(_id, title);
    }
  };

  const handleDeleteClick = () => {
    onDelete(_id);
    onUnlike(_id); // Also unlike when deleting
  }

  return (
    <div className="event-card">
      <img
        className="event-image"
        src={image}
        alt={title}
        width="200"
      />
      <div className="row-favorite">
        <h3 className="event-name">{title}</h3>
        <button
          className="favorite-button"
          onClick={handleLikeClick}
          aria-label={isFavorite ? "Unfavorite" : "Favorite"}
        >
          {isFavorite ? (
            <MdFavorite size={30} color="red" />
          ) : (
            <MdFavoriteBorder size={30} />
          )}
        </button>
      </div>
      <div className="event-info">
        <p>
          🎵 <span className="category-label">Category:</span>
          <span className="genre-border">{genre}</span>
        </p>
      </div>
      <p className="event-description">
        <TbFileDescription />{" "}
        <span className="category-label">
          Description:{description}
        </span>
      </p>
      <div className="bottom-event">
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="event-link"
        >
          Info more
        </a>
        <button
          onClick={handleDeleteClick}
          className="delete-button"
        >
          🗑️ Delete
        </button>
      </div>
    </div>
  );
};

export default EventItem;
