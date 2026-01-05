import React, {createContext, useState, ReactNode} from 'react';

interface ChatContextType {
  chats: any[];
  setChats: (chats: any[]) => void;
  activeChat: string | null;
  setActiveChat: (chatId: string | null) => void;
}

export const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{children: ReactNode}> = ({children}) => {
  const [chats, setChats] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);

  return (
    <ChatContext.Provider value={{chats, setChats, activeChat, setActiveChat}}>
      {children}
    </ChatContext.Provider>
  );
};

