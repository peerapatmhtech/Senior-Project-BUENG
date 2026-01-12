import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MdSend, MdLightbulbOutline } from 'react-icons/md';
import { RiRobot2Fill } from 'react-icons/ri';
import api from '../../../server/api';
import { sendMessageToAI } from '../../../server/aiService'; // Import the AI service
import { fetchAllEvents, fetchInfoMatch } from '../../../lib/queries';
import '../css/ChatAI.css';
import PropTypes from 'prop-types';

// Helper function to fetch AI chat history
const fetchAiChatHistory = async (roomId) => {
  if (!roomId) return [];
  try {
    const { data } = await api.get(`/api/aichat/${roomId}`);
    return data.data || [];
  } catch (error) {
    console.error('Error fetching AI chat history:', error);
    return [];
  }
};

// Helper function to send a message to the AI
const saveAiConversation = async ({ roomId, userMessageContent, aiMessageContent }) => {
  const { data } = await api.post(`/api/aichat/${roomId}/save`, {
    userMessageContent,
    aiMessageContent,
  });
  return data;
};

const ChatContainerAI = ({ isAiChatOpen, defaultProfileImage, roomId, disabled }) => {
  const [input, setInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const endOfMessagesRef = useRef(null);
  const inputRef = useRef(null);
  const queryClient = useQueryClient();
  const aiProfileImage = 'https://cdn-icons-png.flaticon.com/512/10829/10829273.png';

  // Fetch chat history using React Query
  const { data: messages = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ['aiChat', roomId],
    queryFn: () => fetchAiChatHistory(roomId),
    enabled: !!roomId, // Only run query if roomId exists
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch all events to provide context for the AI
  const { data: allEvents = [] } = useQuery({
    queryKey: ['allEvents'],
    queryFn: fetchAllEvents,
  });

  // Fetch infoMatch to find the eventId associated with the current roomId
  const { data: infoMatches = [] } = useQuery({
    queryKey: ['infoMatch'],
    queryFn: fetchInfoMatch,
  });

  // Focus input field when component mounts
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Format date to display in chat
  const formatMessageDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short',
    });
  };

  const mutation = useMutation({
    mutationFn: saveAiConversation,
    onSuccess: () => {
      // Invalidate and refetch the chat history to get the latest messages
      queryClient.invalidateQueries({ queryKey: ['aiChat', roomId] });
    },
    onError: (error) => {
      console.error('Error sending message to AI:', error);
      // Optionally show a toast notification
    },
  });

  const handleSend = async () => {
    if (!input.trim()) return;

    const userInput = input;
    setInput(''); // Clear input immediately

    // Optimistically add user's message
    const userMessage = {
      _id: `temp-${Date.now()}`,
      roomId,
      sender: 'user',
      content: userInput,
      timestamp: new Date().toISOString(),
    };

    queryClient.setQueryData(['aiChat', roomId], (oldData = []) => [...oldData, userMessage]);

    setIsAiThinking(true);

    try {
      // Generate chat history for the AI context
      const history = messages.map((msg) => ({
        role: msg.sender === 'ai' ? 'assistant' : 'user',
        content: msg.content,
      }));

      const currentMatch = infoMatches.find((match) => match._id === roomId);
      const targetEventId = currentMatch?.eventId;

      const eventsContext = allEvents
        .filter((event) => event._id === targetEventId)
        .map((event) => ({
          title: event.title,
          description: event.description,
          date: event.date,
          location: event.location,
          genre: event.genre,
          link: event.link,
        }));

      // Send message to AI service

      const aiResponseContent = await sendMessageToAI(userInput, history, eventsContext);
      setIsAiThinking(false);
      mutation.mutate({
        roomId,
        userMessageContent: userInput,
        aiMessageContent: aiResponseContent,
      });
    } catch (error) {
      setIsAiThinking(false);
      console.error('Failed to get AI response:', error);
      // Optionally, remove the optimistic update or show an error message in the chat
    }
  };

  const handlePromptClick = (promptText) => {
    setInput(promptText);
    // Focus the input field after setting the text
    inputRef.current?.focus();
  };

  // Prompt ตัวอย่าง
  const examplePrompts = [
    'แนะนำกิจกรรมน่าสนใจหน่อย',
    'วิธีหาเพื่อนใหม่ทำยังไง?',
    'แอพนี้ใช้งานยังไง?',
  ];

  return (
    <div className={`chat-container-ai ${isAiChatOpen ? 'mobile-active' : ''}`}>
      {!isAiChatOpen && (
        <div className="header-chat-ai">
          <div className="chat-header">
            <h1>
              <RiRobot2Fill /> AI Assistant
              <span className="ai-status">Online</span>
            </h1>
          </div>
        </div>
      )}
      <div className="chat-box-ai">
        {isLoadingHistory && messages.length === 0 && (
          <div className="empty-list">
            <RiRobot2Fill size={36} />
            <span>เริ่มต้นสนทนากับ AI Assistant</span>
            <p>ถามเกี่ยวกับแอพ กิจกรรม หรือการค้นหาเพื่อนที่มีความสนใจเดียวกันได้เลย</p>
          </div>
        )}
        {messages.map((msg) => {
          const isAI = msg.sender === 'ai';
          return (
            <div key={msg._id} className={`chat-message ${isAI ? 'other-message' : 'my-message'}`}>
              {isAI ? (
                <img src={aiProfileImage} alt="AI" className="message-avatar" />
              ) : (
                <img src={defaultProfileImage} alt="User" className="message-avatar" />
              )}
              <div className={`message-content ${isAI ? 'other' : 'current'}`}>
                <div className="colum-message">
                  {isAI && <div className="message-sender">AI Assistant</div>}
                  <div className={`message-bubble ${isAI ? 'other' : 'current'}`}>
                    {msg.content}
                  </div>
                  {msg.timestamp && (
                    <div className="message-time">{formatMessageDate(msg.timestamp)}</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {(isAiThinking || mutation.isPending) && (
          <div className="chat-message other-message">
            <img src={aiProfileImage} alt="AI" className="message-avatar" />
            <div className="message-content other">
              <div className="colum-message">
                <div className="message-bubble other">
                  <div className="thinking">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={endOfMessagesRef} />
      </div>
      {messages.length === 0 && !isLoadingHistory && (
        <div className="prompt-suggestions">
          {examplePrompts.map((prompt, i) => (
            <button key={i} className="prompt-chip" onClick={() => handlePromptClick(prompt)}>
              <MdLightbulbOutline size={16} />
              {prompt}
            </button>
          ))}
        </div>
      )}
      <div className="chat-input-container-ai">
        <div className="chat-border">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={
              disabled
                ? 'กรุณาเลือกห้องแชท'
                : isAiThinking || mutation.isPending
                  ? 'กำลังรอคำตอบ...'
                  : 'พิมพ์คำถามของคุณ...'
            }
            disabled={isAiThinking || mutation.isPending || !roomId || disabled}
            className="chat-input-ai"
            style={{
              cursor:
                isAiThinking || mutation.isPending || !roomId || disabled ? 'not-allowed' : 'text',
            }}
            // disabled={mutation.isPending || !roomId}
          />
          <button
            onClick={handleSend}
            className="chat-send-button"
            disabled={isAiThinking || mutation.isPending || !input.trim() || !roomId || disabled}
          >
            <MdSend /> ส่ง
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatContainerAI;

ChatContainerAI.propTypes = {
  openchat: PropTypes.bool,
  isAiChatOpen: PropTypes.bool,
  userEmail: PropTypes.string,
  defaultProfileImage: PropTypes.string,
  roomId: PropTypes.string,
  disabled: PropTypes.bool,
};
