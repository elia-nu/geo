"use client";

export default function FaceDetectionBox({ isDetecting }) {
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      {/* Face detection overlay */}
      <div className="relative flex items-center justify-center w-full h-full">
        <div
          className={`w-48 sm:w-64 h-48 sm:h-64 border-2 rounded-full transition-all duration-300 backdrop-blur-md bg-white/10 shadow-xl flex items-center justify-center
            ${
              isDetecting
                ? "border-green-400 animate-pulse shadow-green-200/60"
                : "border-blue-400 shadow-blue-200/40"
            }
            ${isDetecting ? "ring-4 ring-green-200/40" : ""}
          `}
          style={{
            boxShadow: isDetecting
              ? "0 0 32px 4px rgba(34,197,94,0.15)"
              : "0 0 16px 2px rgba(59,130,246,0.10)",
          }}
        >
          {/* Corner indicators */}
          <div className="absolute -top-1 -left-1 w-4 h-4 border-l-2 border-t-2 border-current rounded-tl-lg"></div>
          <div className="absolute -top-1 -right-1 w-4 h-4 border-r-2 border-t-2 border-current rounded-tr-lg"></div>
          <div className="absolute -bottom-1 -left-1 w-4 h-4 border-l-2 border-b-2 border-current rounded-bl-lg"></div>
          <div className="absolute -bottom-1 -right-1 w-4 h-4 border-r-2 border-b-2 border-current rounded-br-lg"></div>
        </div>
      </div>

      {/* Status indicator */}
      <div className="absolute top-6 right-6 flex items-center gap-2">
        <div
          className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold shadow-md transition-colors duration-300
            ${
              isDetecting
                ? "bg-green-100 text-green-800"
                : "bg-blue-100 text-blue-800"
            }
          `}
        >
          <span className="inline-block">
            {isDetecting ? (
              <svg
                className="w-4 h-4 text-green-500"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg
                className="w-4 h-4 text-blue-500"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 12h4l2 2"
                />
              </svg>
            )}
          </span>
          {isDetecting ? "Face Detected" : "Position Face"}
        </div>
      </div>
    </div>
  );
}
