"use client";

import { useState } from "react";
import {
  Comment as CommentIcon,
  AttachFile as AttachFileIcon,
  Chat as ChatIcon,
  Folder as FolderIcon,
} from "@mui/icons-material";
import TaskComments from "./TaskComments";
import TaskAttachments from "./TaskAttachments";

const TaskCommunicationPanel = ({ taskId, currentUser, task, onUpdate }) => {
  const [activeTab, setActiveTab] = useState("comments");

  const tabs = [
    {
      id: "comments",
      label: "Comments",
      icon: <CommentIcon fontSize="small" />,
      count: task?.comments?.length || 0,
    },
    {
      id: "attachments",
      label: "Files",
      icon: <AttachFileIcon fontSize="small" />,
      count: task?.attachments?.length || 0,
    },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === "comments" && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ChatIcon className="text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900">
                Task Discussion
              </h3>
            </div>
            <TaskComments
              taskId={taskId}
              currentUser={currentUser}
              onUpdate={onUpdate}
            />
          </div>
        )}

        {activeTab === "attachments" && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <FolderIcon className="text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900">
                File Attachments
              </h3>
            </div>
            <TaskAttachments
              taskId={taskId}
              currentUser={currentUser}
              onUpdate={onUpdate}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCommunicationPanel;
