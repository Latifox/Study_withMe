
import ReactMarkdown from 'react-markdown';

interface ChatMessageProps {
  message: {
    role: 'user' | 'assistant';
    content: string;
  };
  isStreaming?: boolean;
}

const ChatMessage = ({ message, isStreaming }: ChatMessageProps) => {
  const isUser = message.role === 'user';

  return (
    <div 
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2 transition-opacity duration-200 ${
        isStreaming ? 'animate-in fade-in' : ''
      }`}
    >
      <div
        className={`relative max-w-[80%] rounded-2xl px-4 py-2 ${
          isUser
            ? 'bg-blue-500 text-white rounded-br-none'
            : 'bg-gray-200 text-gray-800 rounded-bl-none'
        }`}
      >
        {/* Message bubble tail for user messages */}
        {isUser && (
          <div className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500" style={{ 
            clipPath: 'polygon(100% 0, 0 0, 100% 100%)' 
          }}></div>
        )}
        
        {/* Message bubble tail for assistant messages */}
        {!isUser && (
          <div className="absolute bottom-0 left-0 w-4 h-4 bg-gray-200" style={{ 
            clipPath: 'polygon(0 0, 100% 0, 0 100%)' 
          }}></div>
        )}
        
        <ReactMarkdown 
          className="prose prose-sm dark:prose-invert max-w-none break-words"
        >
          {message.content}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default ChatMessage;
