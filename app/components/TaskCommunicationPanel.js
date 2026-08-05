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
import { showSuccessToast, showErrorToast } from "../utils/sweetAlert";

const TaskCommunicationPanel = ({ taskId, currentUser, task, onUpdate }) => {
  const [activeTab, setActiveTab] = useState("comments");
  const [loading, setLoading] = useState(false);

  const showSuccessAlert = (message) => {
    showSuccessToast("Success", message);
  };

  const showErrorAlert = (message) => {
    showErrorToast("Error", message);
  };

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
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/60 px-2">
        <nav className="flex gap-1" aria-label="Tabs">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative inline-flex items-center gap-2 rounded-t-xl px-4 py-3 text-sm font-medium transition-all ${
                  active
                    ? "bg-white text-blue-900 shadow-[0_-1px_0_0_white]"
                    : "text-slate-500 hover:bg-white/70 hover:text-slate-800"
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
                      active
                        ? "bg-blue-50 text-blue-800"
                        : "bg-slate-200/80 text-slate-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
                {active && (
                  <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-blue-900" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="relative p-5 sm:p-6">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-b-2xl bg-white/70 backdrop-blur-[1px] transition-opacity">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 rounded-full border-2 border-blue-900/20 border-t-blue-900 animate-spin" />
              <p className="text-xs font-medium text-slate-500">Working…</p>
            </div>
          </div>
        )}

        {activeTab === "comments" && (
          <div>
            <div className="mb-4 flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-800">
                <ChatIcon fontSize="small" />
              </span>
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Discussion
                </h3>
                <p className="text-xs text-slate-400">
                  Comments refresh automatically every few seconds
                </p>
              </div>
            </div>
            <TaskComments
              taskId={taskId}
              currentUser={currentUser}
              onUpdate={onUpdate}
              showSuccessAlert={showSuccessAlert}
              showErrorAlert={showErrorAlert}
              setLoading={setLoading}
            />
          </div>
        )}

        {activeTab === "attachments" && (
          <div>
            <div className="mb-4 flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <FolderIcon fontSize="small" />
              </span>
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Attachments
                </h3>
                <p className="text-xs text-slate-400">
                  Upload and manage task files
                </p>
              </div>
            </div>
            <TaskAttachments
              taskId={taskId}
              currentUser={currentUser}
              onUpdate={onUpdate}
              showSuccessAlert={showSuccessAlert}
              showErrorAlert={showErrorAlert}
              setLoading={setLoading}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCommunicationPanel;
