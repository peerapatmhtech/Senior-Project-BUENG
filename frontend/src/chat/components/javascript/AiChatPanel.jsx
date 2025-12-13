import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import PropTypes from "prop-types";
import api from "../../../server/api";
import { RiRobot2Fill } from "react-icons/ri";

const fetchAiChatHistory = async (roomId) => {
  if (!roomId) return [];
  const { data } = await api.get(`/api/infomatch/aichat/${roomId}`);
  return data.data || [];
};

const sendAiMessage = async ({ roomId, content, userEmail }) => {
  const { data } = await api.post(`/api/infomatch/aichat/${roomId}`, {
    content,
    userEmail,
  });
  return data.data;
};

const AiChatPanel = ({ userEmail, formatChatDate }) => {
  const { roomId } = useParams();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const endOfMessagesRef = useRef(null);
  const aiProfileImage =
    "https://cdn-icons-png.flaticon.com/512/10829/10829273.png";

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["aiChat", roomId],
    queryFn: () => fetchAiChatHistory(roomId),
    enabled: !!roomId,
  });

  const mutation = useMutation({
    mutationFn: sendAiMessage,
    onSuccess: (newAiMessage) => {
      // Manually update the query cache with the user's message and AI's response
      queryClient.setQueryData(["aiChat", roomId], (oldData) => {
        const userMessage = {
          roomId,
          sender: "user",
          content: input, // Use the input state at the time of mutation
          timestamp: new Date().toISOString(),
        };
        return [...(oldData || []), userMessage, newAiMessage];
      });
      setInput("");
    },
  });

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (input.trim() === "") return;
    mutation.mutate({ roomId, content: input, userEmail });
  };

  return (
    <div className="chat-panel-container">
      <div className="messages-container">
        {isLoading && (
          <div className="loading-messages">Loading AI chat...</div>
        )}
        {!isLoading && messages.length === 0 && (
          <div className="empty-chat-container">
            <RiRobot2Fill size={50} className="empty-chat-icon" />
            <p className="empty-chat-text">
              This is your personal AI assistant for this match.
              <br />
              Ask anything about your match! For example: What are their
              interests?
            </p>
          </div>
        )}
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`chat-message ${
              msg.sender === "ai" ? "other-message" : "current-user-message"
            }`}
          >
            {msg.sender === "ai" && (
              <img src={aiProfileImage} alt="AI" className="message-avatar" />
            )}
            <div className="colum-message">
              <div
                className={`message-bubble ${
                  msg.sender === "ai" ? "other" : "current"
                }`}
              >
                {msg.content}
              </div>
              <div className="message-time">
                {formatChatDate(new Date(msg.timestamp))}
              </div>
            </div>
          </div>
        ))}
        {mutation.isPending && (
          <div className="typing-indicator">AI is typing...</div>
        )}
        <div ref={endOfMessagesRef} />
      </div>
      <div className="input-container">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSend()}
          placeholder="Chat with your AI Assistant..."
          disabled={mutation.isPending}
        />
        <button onClick={handleSend} disabled={mutation.isPending}>
          Send
        </button>
      </div>
    </div>
  );
};

export default AiChatPanel;

AiChatPanel.propTypes = {
  userEmail: PropTypes.string.isRequired,
  formatChatDate: PropTypes.func.isRequired,
};
