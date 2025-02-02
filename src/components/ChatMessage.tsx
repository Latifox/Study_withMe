import ReactMarkdown from 'react-markdown';

interface ChatMessageProps {
  message: {
    role: 'user' | 'assistant';
    content: string;
  };
}

const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-lg p-3 ${
          isUser
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 text-gray-800'
        }`}
      >
        <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none">
          {message.content}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default ChatMessage;