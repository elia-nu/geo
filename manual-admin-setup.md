# Manual Admin User Setup Guide

## Step 1: Check Server Status

1. **Make sure your Next.js server is running**:

   ```bash
   npm run dev
   ```

   You should see: `Ready - started server on 0.0.0.0:3000`

2. **Open browser** and go to: `http://localhost:3000`
   - Should redirect to `/login`

## Step 2: Debug the Issue

1. **Open browser console** (F12)
2. **Copy and paste** the contents of `debug-admin-creation.js`
3. **Run**: `debugAdminCreation()`
4. **Check the output** for any errors

## Step 3: Create Admin User (Fixed Version)

1. **Copy and paste** the contents of `create-admin-fixed.js`
2. **Run**: `createAdminUserFixed()`
3. **Check the console output** for success/error messages

## Step 4: Manual API Testing

If the scripts don't work, try these manual API calls:

### Test 1: Check Employee API

```javascript
fetch("/api/employee")
  .then((response) => response.json())
  .then((data) => console.log("Employee API:", data))
  .catch((error) => console.error("Error:", error));
```

### Test 2: Create Employee

```javascript
fetch("/api/employee", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    personalDetails: {
      name: "Admin User",
      employeeId: "ADMIN001",
      password: "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi",
    },
    department: "IT",
    workLocation: "Office",
    status: "active",
  }),
})
  .then((response) => response.json())
  .then((data) => console.log("Create response:", data))
  .catch((error) => console.error("Error:", error));
```

### Test 3: Check Roles API

```javascript
fetch("/api/auth/roles")
  .then((response) => response.json())
  .then((data) => console.log("Roles API:", data))
  .catch((error) => console.error("Error:", error));
```

## Step 5: Common Issues & Solutions

### Issue 1: "Cannot connect to server"

- **Solution**: Make sure `npm run dev` is running
- **Check**: Terminal shows "Ready - started server on 0.0.0.0:3000"

### Issue 2: "Employee API error"

- **Solution**: Check if `/app/api/employee/route.js` exists
- **Check**: File should have POST and GET methods

### Issue 3: "Roles API error"

- **Solution**: Check if `/app/api/auth/roles/route.js` exists
- **Check**: File should have POST, GET, PUT, DELETE methods

### Issue 4: "Database connection error"

- **Solution**: Check MongoDB connection
- **Check**: `.env.local` file has `MONGODB_URI`

### Issue 5: "Invalid data format"

- **Solution**: Check the employee data structure
- **Check**: All required fields are present

## Step 6: Alternative - Direct Database Insert

If API calls fail, you can manually insert into MongoDB:

1. **Connect to MongoDB** (MongoDB Compass or mongo shell)
2. **Insert employee**:

   ```javascript
   db.employees.insertOne({
     personalDetails: {
       name: "Admin User",
       employeeId: "ADMIN001",
       password: "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi",
     },
     department: "IT",
     workLocation: "Office",
     status: "active",
     createdAt: new Date(),
     updatedAt: new Date(),
   });
   ```

3. **Insert role**:
   ```javascript
   db.user_roles.insertOne({
     userId: "EMPLOYEE_ID_FROM_STEP_2",
     email: "admin@company.com",
     role: "ADMIN",
     permissions: [
       "employee.create",
       "employee.read",
       "employee.update",
       "employee.delete",
     ],
     assignedBy: "system",
     assignedAt: new Date(),
     isActive: true,
   });
   ```

## Step 7: Verify Setup

1. **Go to**: `http://localhost:3000/login`
2. **Login with**:
   - Employee ID: `ADMIN001`
   - Password: `password`
3. **Should redirect** to HRM dashboard

## Troubleshooting Commands

### Check if server is running:

```bash
curl http://localhost:3000/api/employee
```

### Check MongoDB connection:

```bash
# If you have mongo shell installed
mongo "your-mongodb-uri" --eval "db.runCommand('ping')"
```

### Check Next.js logs:

```bash
# In the terminal where npm run dev is running
# Look for any error messages
```
