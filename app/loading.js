export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="flex flex-col items-center space-y-4 p-8">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
        <p className="text-xl text-gray-600 font-medium">Loading...</p>
        <p className="text-sm text-gray-500">Please wait a moment</p>
      </div>
    </div>
  );
}
