# 🚀 Employee Authentication Setup Guide

This guide will help you set up employee passwords and work locations, then test the location-based attendance system.

## 📋 Prerequisites

1. **Employees in Database**: Make sure you have employees added to the system
2. **Development Server Running**: `npm run dev` should be running on `http://localhost:3000`

## 🛠️ Setup Methods

### Method 1: Using the Admin Interface (Recommended)

1. **Access Employee Setup Portal**:

   - Go to: `http://localhost:3000/employee-setup`
   - Or navigate via sidebar: **Attendance** → **Employee Setup**

2. **Set Up an Employee**:

   - Select an employee from the dropdown
   - Set a password (minimum 6 characters)
   - Set a work location with coordinates and radius
   - Both forms can be submitted independently

3. **Test the Setup**:
   - Go to: `http://localhost:3000/employee-login`
   - Use the employee's ID and password to log in

### Method 2: Using the Test Script

1. **Run the Test Script**:

   ```bash
   # In your browser console (F12 → Console tab)
   # Copy and paste the contents of test-employee-setup.js
   # Then run: testEmployeeSetup()
   ```

2. **Or run as Node.js script**:
   ```bash
   node test-employee-setup.js
   ```

### Method 3: Manual API Calls

#### Set Employee Password

```bash
curl -X POST http://localhost:3000/api/employee/setup-password \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "EMPLOYEE_ID_HERE",
    "password": "your_password"
  }'
```

#### Set Work Location

```bash
curl -X PUT http://localhost:3000/api/employee/EMPLOYEE_ID_HERE/work-location \
  -H "Content-Type: application/json" \
  -d '{
    "workLocation": {
      "name": "Main Office",
      "address": "123 Business St, City",
      "latitude": 40.7128,
      "longitude": -74.0060,
      "radius": 100
    }
  }'
```

## 🧪 Testing the System

### 1. Employee Login Test

- **URL**: `http://localhost:3000/employee-login`
- **Credentials**: Use the employee ID and password you set up
- **Expected**: Should redirect to `/employee-attendance` after successful login

### 2. Location Validation Test

- **Login**: Use employee credentials
- **Location**: The system will check if you're at the designated work location
- **Test Scenarios**:
  - ✅ **At work location**: Should allow check-in/check-out
  - ❌ **Away from work location**: Should block attendance recording

### 3. Attendance Recording Test

- **Check-in**: Click "Check In" button (requires valid location)
- **Check-out**: Click "Check Out" button (requires valid location)
- **Photo Verification**: Optional webcam capture for additional security

## 📍 Sample Work Locations

### New York Office

```json
{
  "name": "New York Office",
  "address": "123 Business Ave, New York, NY",
  "latitude": 40.7128,
  "longitude": -74.006,
  "radius": 100
}
```

### London Office

```json
{
  "name": "London Office",
  "address": "456 Business St, London, UK",
  "latitude": 51.5074,
  "longitude": -0.1278,
  "radius": 150
}
```

### Tokyo Office

```json
{
  "name": "Tokyo Office",
  "address": "789 Business Rd, Tokyo, Japan",
  "latitude": 35.6762,
  "longitude": 139.6503,
  "radius": 200
}
```

## 🔧 Troubleshooting

### Common Issues

1. **"Employee not found"**

   - Make sure the employee exists in the database
   - Check the employee ID format

2. **"No password set"**

   - Use the setup-password API to set a password
   - Ensure the password is at least 6 characters

3. **"No work location assigned"**

   - Use the work-location API to assign a location
   - Make sure coordinates are valid numbers

4. **"Location validation failed"**
   - Check if you're within the designated radius
   - Verify the coordinates are correct
   - Try refreshing location or moving closer to the work location

### Debug Steps

1. **Check Employee Data**:

   ```bash
   curl http://localhost:3000/api/employee
   ```

2. **Check Work Location**:

   ```bash
   curl http://localhost:3000/api/employee/EMPLOYEE_ID/work-location
   ```

3. **Test Login**:
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"employeeId": "ID", "password": "password"}'
   ```

## 🎯 Success Criteria

✅ **Setup Complete When**:

- Employee can log in at `/employee-login`
- Employee sees their work location details
- Location validation works (green checkmark when at work location)
- Check-in/check-out buttons are enabled when location is valid
- Attendance records are created with location data

## 📱 Mobile Testing

For realistic testing:

1. **Use mobile device** or browser dev tools mobile view
2. **Enable location services** in browser
3. **Test from different locations**:
   - At work location (should work)
   - Away from work location (should be blocked)
   - Edge of radius (test boundary conditions)

## 🔐 Security Notes

- Passwords are hashed using bcryptjs
- JWT tokens expire after 24 hours
- Location validation happens on both client and server
- All actions are logged in the audit trail
- Employees can only access their own attendance data

---

**Need Help?** Check the browser console for detailed error messages and API responses.
