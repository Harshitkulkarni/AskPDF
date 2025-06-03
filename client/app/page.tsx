import ChatComponent from "./components/chat";
import FileUploadComponent from "./components/FileUpload";

export default function Home() {
  return (
    <main className="flex h-screen bg-gray-100">
      {/* Left Sidebar - File Upload */}
      <div className="w-[30%] border-r border-gray-200 bg-white">
        <FileUploadComponent />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 bg-gray-50">
        <ChatComponent />
      </div>
    </main>
  );
}
