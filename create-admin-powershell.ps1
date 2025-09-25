# PowerShell script to create admin user
# Run with: .\create-admin-powershell.ps1

Write-Host "🔧 Creating Admin User via PowerShell..." -ForegroundColor Green

try {
    # Step 1: Create employee
    Write-Host "`n1️⃣ Creating employee..." -ForegroundColor Yellow
    
    $employeeData = @{
        personalDetails = @{
            name = "Admin User"
            dateOfBirth = "1990-01-01"
            address = "Admin Address"
            contactNumber = "+1234567890"
            email = "admin@company.com"
            employeeId = "ADMIN001"
            password = "$2a`$10`$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi"
        }
        department = "IT"
        designation = "System Administrator"
        workLocation = "Office"
        createdAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        updatedAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        status = "active"
    } | ConvertTo-Json -Depth 10

    $employeeResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/employee" -Method POST -Body $employeeData -ContentType "application/json"
    
    if ($employeeResponse.success) {
        $employeeId = $employeeResponse.employee._id
        Write-Host "✅ Employee created with ID: $employeeId" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to create employee: $($employeeResponse.error)" -ForegroundColor Red
        exit 1
    }

    # Step 2: Assign admin role
    Write-Host "`n2️⃣ Assigning admin role..." -ForegroundColor Yellow
    
    $roleData = @{
        userId = $employeeId
        email = "admin@company.com"
        role = "ADMIN"
        assignedBy = "system"
    } | ConvertTo-Json

    $roleResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/roles" -Method POST -Body $roleData -ContentType "application/json"
    
    if ($roleResponse.message) {
        Write-Host "✅ Admin role assigned successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to assign admin role: $($roleResponse.error)" -ForegroundColor Red
        exit 1
    }

    # Step 3: Test login
    Write-Host "`n3️⃣ Testing admin login..." -ForegroundColor Yellow
    
    $loginData = @{
        employeeId = "ADMIN001"
        password = "password"
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    
    if ($loginResponse.success) {
        Write-Host "✅ Admin login successful!" -ForegroundColor Green
        Write-Host "   Employee ID: $($loginResponse.data.employee.employeeId)" -ForegroundColor Cyan
        Write-Host "   Name: $($loginResponse.data.employee.name)" -ForegroundColor Cyan
        Write-Host "   Role: $($loginResponse.data.employee.role)" -ForegroundColor Cyan
        
        Write-Host "`n🎉 Admin user setup completed!" -ForegroundColor Green
        Write-Host "`n📋 Login Credentials:" -ForegroundColor Yellow
        Write-Host "   Employee ID: ADMIN001" -ForegroundColor White
        Write-Host "   Password: password" -ForegroundColor White
        Write-Host "   Role: ADMIN" -ForegroundColor White
        
        Write-Host "`n🔗 Next Steps:" -ForegroundColor Yellow
        Write-Host "1. Go to: http://localhost:3000/login" -ForegroundColor White
        Write-Host "2. Use the credentials above to login" -ForegroundColor White
        Write-Host "3. You should be redirected to the HRM dashboard" -ForegroundColor White
        
    } else {
        Write-Host "❌ Admin login failed: $($loginResponse.error)" -ForegroundColor Red
    }

} catch {
    Write-Host "❌ Setup failed: $($_.Exception.Message)" -ForegroundColor Red
}
