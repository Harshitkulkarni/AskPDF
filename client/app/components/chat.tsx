"use client";
import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Bot, User, Loader2, FileText, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "assistant" | "user";
  content: string;
  context?: {
    relevantSections: Array<{
      content: string;
      relevance: number | string;
    }>;
    totalSections: number;
    query: string;
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const ChatComponent: React.FC = () => {
  const [message, setMessage] = React.useState<string>("");
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const chatContainerRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendChatMessage = async () => {
    if (!message.trim()) return;

    const userMessage: Message = { role: "user", content: message };
    setMessages((prev) => [...prev, userMessage]);
    setMessage("");
    setIsLoading(true);

    try {
      const res = await fetch(
        `${API_URL}/chat?message=${encodeURIComponent(message)}`
      );
      const data = await res.json();

      const assistantMessage: Message = {
        role: "assistant",
        content: data.message,
        context: data.context,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I encountered an error processing your request. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendChatMessage();
    }
  };

  const formatMessage = (content: string) => {
    // Split content by newlines and process each line
    return content.split("\n").map((line, index) => {
      // Handle bullet points
      if (line.trim().startsWith("•") || line.trim().startsWith("-")) {
        return (
          <li key={index} className="ml-4">
            {line.trim().substring(1).trim()}
          </li>
        );
      }
      // Handle numbered lists
      if (/^\d+\./.test(line.trim())) {
        return (
          <li key={index} className="ml-4">
            {line.trim()}
          </li>
        );
      }
      // Handle section headers
      if (line.trim().toUpperCase() === line.trim() && line.trim().length > 0) {
        return (
          <h3 key={index} className="font-semibold text-base mt-2 mb-1">
            {line}
          </h3>
        );
      }
      // Regular text
      return (
        line.trim() && (
          <p key={index} className="mb-2">
            {line}
          </p>
        )
      );
    });
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Bot className="h-8 w-8 text-blue-500" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Chat Assistant
              </h2>
              <p className="text-sm text-gray-500">
                Ask questions about your PDF
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-6">
        <div className="max-w-3xl mx-auto py-6 space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
                <Bot className="h-10 w-10 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Welcome to PDF Chat Assistant
                </h3>
                <p className="text-gray-600 max-w-sm">
                  Upload a PDF document and start asking questions. I'll help
                  you find the information you need.
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-start space-x-3",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {msg.role === "assistant" && (
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-6 w-6 text-blue-600" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%]",
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-2xl rounded-br-none px-5 py-3 shadow-sm"
                      : "flex flex-col space-y-2"
                  )}
                >
                  {msg.role === "assistant" ? (
                    <>
                      <div className="bg-white rounded-2xl rounded-bl-none px-5 py-3 shadow-sm">
                        <div className="prose prose-sm max-w-none text-[15px] leading-relaxed">
                          {formatMessage(msg.content)}
                        </div>
                      </div>
                      {msg.context && (
                        <div className="flex items-start space-x-2 text-xs text-gray-500 hover:text-gray-700 transition-colors pl-1">
                          <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          <span>
                            Answer based on {msg.context.totalSections} relevant
                            sections from the PDF
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-[15px] leading-relaxed">{msg.content}</p>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <User className="h-6 w-6 text-white" />
                  </div>
                )}
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Bot className="h-6 w-6 text-blue-600" />
              </div>
              <div className="bg-white rounded-2xl rounded-bl-none px-5 py-3 shadow-sm">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  <span className="text-gray-500">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t bg-white p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center space-x-3 bg-gray-50 rounded-2xl p-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 py-4 px-4 text-base bg-transparent border-0 focus:ring-0 focus:outline-none"
              disabled={isLoading}
            />
            <Button
              onClick={handleSendChatMessage}
              disabled={!message.trim() || isLoading}
              className={cn(
                "h-12 w-12 rounded-xl flex-shrink-0 transition-colors",
                message.trim()
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-gray-200 text-gray-400"
              )}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatComponent;
