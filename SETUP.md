# Facial Recognition Attendance System Setup

This is a simple attendance system that uses Microsoft Face API for facial verification.

## Prerequisites

1. **Microsoft Azure Account**: You need an Azure account to access the Face API
2. **Node.js**: Version 16 or higher
3. **Camera Access**: A webcam for facial recognition

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Microsoft Face API

1. Go to [Azure Portal](https://portal.azure.com/)
2. Create a new Face API resource or use an existing one
3. Get your API key from the resource's "Keys and Endpoint" section
4. Note your endpoint URL (e.g., `https://eastus.api.cognitive.microsoft.com/face/v1.0`)

### 3. Environment Configuration

Create a `.env.local` file in the root directory:

```env
# Microsoft Face API Configuration
MICROSOFT_FACE_API_KEY=your_actual_api_key_here

# Optional: Customize the Face API endpoint region
# FACE_API_ENDPOINT=https://your-region.api.cognitive.microsoft.com/face/v1.0
```

### 4. Run the Application

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## How to Use

1. **Enter Your Name**: Type your full name in the input field
2. **Open Camera**: Click "Open Camera" to activate your webcam
3. **Position Your Face**: Make sure your face is clearly visible within the frame
4. **Mark Attendance**: Click "Mark Attendance" to verify your face and record attendance

## Features

- ✅ Real-time facial detection
- ✅ Attendance tracking with timestamps
- ✅ Duplicate attendance prevention
- ✅ Modern, responsive UI
- ✅ Real-time attendance display
- ✅ Camera integration with react-webcam

## API Endpoints

- `POST /api/face/verify` - Verifies face using Microsoft Face API
- `GET /api/attendance` - Retrieves all attendance records
- `POST /api/attendance` - Marks new attendance

## Data Storage

Attendance records are stored locally in `data/attendance.json`. In a production environment, you should use a proper database.

## Security Notes

- The Face API key should be kept secure and never exposed in client-side code
- Consider implementing user authentication for production use
- The current implementation is for demonstration purposes

## Troubleshooting

### Camera Not Working

- Ensure your browser has camera permissions
- Try refreshing the page
- Check if another application is using the camera

### Face API Errors

- Verify your API key is correct
- Check your Azure subscription status
- Ensure you have sufficient Face API quota

### Build Errors

- Make sure all dependencies are installed
- Check Node.js version compatibility
- Clear node_modules and reinstall if needed

## Production Deployment

For production deployment:

1. Use a proper database (PostgreSQL, MongoDB, etc.)
2. Implement user authentication
3. Add rate limiting
4. Use environment variables for all sensitive data
5. Set up proper logging and monitoring
6. Consider using a CDN for static assets

## License

This project is for educational purposes. Please ensure compliance with Microsoft's Face API terms of service.
