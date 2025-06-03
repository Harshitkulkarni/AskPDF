"use client";
import * as React from "react";
import { Upload, FileText, Check, X, FileIcon } from "lucide-react";

interface UploadState {
  isDragging: boolean;
  isUploading: boolean;
  uploadSuccess: boolean;
  uploadError: boolean;
  fileName: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const FileUploadComponent: React.FC = () => {
  const [uploadState, setUploadState] = React.useState<UploadState>({
    isDragging: false,
    isUploading: false,
    uploadSuccess: false,
    uploadError: false,
    fileName: "",
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setUploadState((prev) => ({ ...prev, isDragging: true }));
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setUploadState((prev) => ({ ...prev, isDragging: false }));
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await handleFileUpload(files[0]);
    }
    setUploadState((prev) => ({ ...prev, isDragging: false }));
  };

  const handleFileUpload = async (file: File) => {
    if (!file.type.includes("pdf")) {
      setUploadState((prev) => ({
        ...prev,
        uploadError: true,
        fileName: file.name,
      }));
      return;
    }

    setUploadState((prev) => ({
      ...prev,
      isUploading: true,
      fileName: file.name,
      uploadError: false,
      uploadSuccess: false,
    }));

    try {
      const formData = new FormData();
      formData.append("pdf", file);

      const response = await fetch(`${API_URL}/upload/pdf`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      setUploadState((prev) => ({
        ...prev,
        isUploading: false,
        uploadSuccess: true,
      }));

      setTimeout(() => {
        setUploadState((prev) => ({
          ...prev,
          uploadSuccess: false,
          fileName: "",
        }));
      }, 3000);
    } catch (error) {
      console.error("Upload error:", error);
      setUploadState((prev) => ({
        ...prev,
        isUploading: false,
        uploadError: true,
      }));
    }
  };

  const handleButtonClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/pdf";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        await handleFileUpload(file);
      }
    };
    input.click();
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">PDF Chat</h1>
        <p className="mt-2 text-sm text-gray-600">
          Upload your PDF documents and chat with them instantly
        </p>
      </div>

      {/* Upload Area */}
      <div className="flex-1 p-6">
        <div className="space-y-6">
          {/* Upload Box */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              relative rounded-xl border-2 border-dashed p-8
              ${
                uploadState.isDragging
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 hover:border-gray-400"
              }
              ${uploadState.isUploading ? "bg-gray-50" : ""}
              transition-all duration-200 ease-in-out group
              cursor-pointer
            `}
            onClick={handleButtonClick}
          >
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <Upload
                  className={`
                  h-8 w-8
                  ${uploadState.isDragging ? "text-blue-600" : "text-blue-500"}
                `}
                />
              </div>

              {uploadState.isUploading ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center space-x-2">
                    <FileIcon className="h-5 w-5 text-blue-500" />
                    <span className="text-sm font-medium text-gray-900">
                      {uploadState.fileName}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full animate-progress"></div>
                  </div>
                </div>
              ) : uploadState.uploadSuccess ? (
                <div className="flex items-center justify-center space-x-2 text-green-600">
                  <Check className="h-5 w-5" />
                  <span className="font-medium">Upload Successful!</span>
                </div>
              ) : uploadState.uploadError ? (
                <div className="flex items-center justify-center space-x-2 text-red-600">
                  <X className="h-5 w-5" />
                  <span className="font-medium">Please upload a PDF file</span>
                </div>
              ) : (
                <div>
                  <p className="text-base font-medium text-gray-900">
                    Drop your PDF here
                  </p>
                  <p className="mt-2 text-sm text-gray-600">
                    or click to browse from your computer
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Maximum file size: 10MB
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-gray-50 rounded-xl p-6 space-y-4">
            <h3 className="font-medium text-gray-900">How it works</h3>
            <ul className="space-y-3">
              <li className="flex items-start space-x-3 text-sm text-gray-600">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                  1
                </span>
                <span>
                  Upload your PDF document using the upload area above
                </span>
              </li>
              <li className="flex items-start space-x-3 text-sm text-gray-600">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                  2
                </span>
                <span>Wait for the document to be processed</span>
              </li>
              <li className="flex items-start space-x-3 text-sm text-gray-600">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                  3
                </span>
                <span>
                  Start asking questions about your document in the chat
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUploadComponent;
