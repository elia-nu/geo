# Geofence Validation for Attendance System

## Overview

The attendance system now includes geofence validation to ensure users can only mark attendance when they are within their designated area.

## Features Implemented

### 1. Server-Side Validation

- **Location**: `app/api/attendance/route.js`
- **Function**: Validates user location against their assigned geofence before allowing attendance
- **Algorithm**: Uses Haversine formula to calculate distance between user location and geofence center
- **Response**: Returns 403 error with detailed message if user is outside geofence

### 2. Client-Side Indicators

- **Real-time Status**: Shows whether user is inside or outside their geofence
- **Distance Display**: Shows current distance from geofence center vs allowed radius
- **Visual Indicators**: Green dot for inside geofence, red dot for outside
- **Button State**: Attendance button is disabled when outside geofence

### 3. Attendance Records Enhancement

- **Validation Info**: Each attendance record now includes geofence validation details
- **Distance Tracking**: Records the actual distance from geofence center
- **Visual History**: Shows validation status in attendance history

## Technical Implementation

### Distance Calculation

```javascript
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000; // Distance in meters
}
```

### Validation Flow

1. User attempts to mark attendance
2. System captures current GPS location
3. Server calculates distance to user's assigned geofence
4. If distance > geofence radius, attendance is rejected
5. If distance ≤ geofence radius, attendance is allowed with validation data

### Error Messages

- **Outside Geofence**: "You are outside your allowed area. Distance: Xm, Allowed radius: Ym"
- **Location Error**: "Failed to get your location: [error message]"
- **Validation Error**: "Failed to validate location"

## User Experience

### Visual Feedback

- **Green Status**: User is inside geofence, can mark attendance
- **Red Status**: User is outside geofence, attendance button disabled
- **Distance Info**: Shows "Xm / Ym" where X is current distance, Y is allowed radius

### Error Handling

- Clear error messages when outside geofence
- Graceful handling of location permission issues
- Fallback behavior when geofence data is unavailable

## Configuration

### Geofence Data Structure

```json
{
  "username": {
    "lat": 9.008955967701231,
    "lng": 38.70144500176916,
    "radius": 1200
  }
}
```

### Adding New Geofences

1. Use the Geofence Manager interface at `/geofence-management`
2. Enter username, coordinates, and radius
3. Save to database
4. User will automatically be validated against their geofence

## Security Considerations

- **Server-side validation**: All geofence checks happen on the server
- **No client bypass**: Client-side indicators are for UX only
- **Audit trail**: All attendance records include validation data
- **Error logging**: Failed validations are logged for monitoring

## Future Enhancements

- **Multiple geofences**: Support for users with multiple allowed locations
- **Time-based rules**: Different geofences for different times of day
- **Mobile optimization**: Better GPS accuracy and battery optimization
- **Offline support**: Cache geofence data for offline validation
