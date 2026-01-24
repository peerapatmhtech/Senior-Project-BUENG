import { useParams } from "react-router-dom";
import PropTypes from "prop-types";
import ChatContainerAI from "./ChatContainerAI";
import "../css/ChatAI.css"; // Ensure styles are loaded

const AiChatPanel = ({ userEmail }) => {
  const { roomId } = useParams();
  const defaultProfileImage = "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";

  return (
    <div className="chat-panel-container" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Reuse the robust ChatContainerAI component */}
      <ChatContainerAI 
        roomId={roomId} 
        userEmail={userEmail} 
        defaultProfileImage={defaultProfileImage}
        isAiChatOpen={true} // Force open style for panel view
      />
    </div>
  );
};

export default AiChatPanel;

AiChatPanel.propTypes = {
  userEmail: PropTypes.string.isRequired,
};
