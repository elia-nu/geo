# HR Management System

A comprehensive Human Resources Management System built with Next.js, React, MongoDB, and Tailwind CSS. This system provides complete employee and document management capabilities with advanced search, filtering, and expiry tracking.

## 🚀 Features

### 👥 Employee Management

- **Centralized Employee Database** - Secure profiles with personal details, employment history, certifications, skills, and health records
- **Advanced Search & Filter** - Find employees by name, email, department, designation, skills, or work location
- **Real-time Updates** - Live filtering and search results
- **CRUD Operations** - Create, read, update, and delete employee records
- **Department Management** - Organize employees by departments (IT, HR, Finance, Marketing, Sales)
- **Skills Tracking** - Manage and search by employee skills

### 📄 Document Management

- **File Upload System** - Support for PDF, DOC, DOCX, and image files
- **Expiry Tracking** - Automated alerts for documents expiring within 30 days
- **Document Categories** - Employment contracts, certifications, IDs, medical records, training certificates
- **File Storage** - Secure file storage with unique naming
- **Download & View** - Access uploaded documents
- **Status Tracking** - Active, expiring, and expired document status

### 📊 Dashboard & Analytics

- **Overview Statistics** - Total employees, documents, expiring items
- **Department Distribution** - Visual breakdown by department
- **Location Overview** - Employee distribution by work location
- **Real-time Updates** - Live statistics and counts
- **Quick Actions** - Fast access to common HR tasks

### 🔔 Alerts & Notifications

- **Expiry Alerts** - Color-coded notifications for expiring documents
- **Certification Tracking** - Monitor employee certification expiry dates
- **Visual Indicators** - Status badges and warning colors
- **30-Day Advance Notice** - Proactive expiry management

## 🛠 Technology Stack

### Frontend

- **Next.js 15** - React framework with App Router
- **React 19** - UI library with hooks
- **Tailwind CSS 4** - Utility-first CSS framework
- **Lucide React** - Beautiful icon library
- **Date-fns** - Date manipulation utilities

### Backend

- **Next.js API Routes** - Serverless API endpoints
- **MongoDB** - NoSQL database
- **MongoDB Driver** - Database connectivity
- **File System** - Document storage

### UI Components

- **Custom Component Library** - Shadcn/ui-inspired components
- **Responsive Design** - Mobile-first approach
- **Accessibility** - WCAG compliant components
- **Dark Mode Ready** - CSS variables for theming

## 📁 Project Structure

```
app/
├── api/
│   ├── employee/
│   │   ├── route.js              # Employee CRUD operations
│   │   └── [id]/route.js         # Individual employee operations
│   ├── documents/
│   │   ├── route.js              # Document listing
│   │   ├── upload/route.js       # File upload endpoint
│   │   ├── stats/route.js        # Document statistics
│   │   └── [id]/route.js         # Individual document operations
│   └── mongo.js                  # Database connection
├── components/
│   ├── ui/                       # Reusable UI components
│   │   ├── button.js
│   │   ├── card.js
│   │   ├── input.js
│   │   ├── select.js
│   │   ├── badge.js
│   │   ├── dialog.js
│   │   ├── tabs.js
│   │   ├── calendar.js
│   │   ├── popover.js
│   │   └── textarea.js
│   ├── EmployeeDatabase.js       # Employee management component
│   └── DocumentManager.js        # Document management component
├── hrm/
│   └── page.js                   # Main HRM dashboard
├── globals.css                   # Global styles and CSS variables
└── layout.js                     # Root layout
```

## 🚀 Installation & Setup

### Prerequisites

- Node.js 18+
- MongoDB database (local or cloud)
- npm or yarn package manager

### 1. Clone the Repository

```bash
git clone <repository-url>
cd hrm-system
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env.local` file in the root directory:

```env
MONGODB_URI=your_mongodb_connection_string
```

### 4. Database Setup

The system will automatically create the necessary collections:

- `employees` - Employee records
- `documents` - Document metadata and file references

### 5. Start Development Server

```bash
npm run dev
```

### 6. Access the Application

Open [http://localhost:3000/hrm](http://localhost:3000/hrm) in your browser.

## 📖 Usage Guide

### Employee Management

1. **Add Employee** - Click "Add Employee" button in the Employee Database tab
2. **Search & Filter** - Use the search bar and filters to find specific employees
3. **Edit Employee** - Click the edit icon on any employee card
4. **Delete Employee** - Click the delete icon (with confirmation)
5. **View Details** - Click on employee cards to see full information

### Document Management

1. **Upload Document** - Click "Upload Document" button in the Document Management tab
2. **Select Employee** - Choose the employee the document belongs to
3. **Set Expiry Date** - Optionally set an expiry date for tracking
4. **View Documents** - Browse all uploaded documents with status indicators
5. **Download/Delete** - Use action buttons on document cards

### Dashboard Features

1. **Statistics Overview** - View key metrics at the top of the dashboard
2. **Department Distribution** - See employee distribution across departments
3. **Location Overview** - Monitor employee distribution by work location
4. **Quick Actions** - Fast access to common HR tasks

## 🔧 API Endpoints

### Employee Endpoints

- `GET /api/employee` - Get all employees
- `POST /api/employee` - Create new employee
- `PUT /api/employee/[id]` - Update employee
- `DELETE /api/employee/[id]` - Delete employee

### Document Endpoints

- `GET /api/documents` - Get all documents
- `POST /api/documents/upload` - Upload new document
- `PUT /api/documents/[id]` - Update document
- `DELETE /api/documents/[id]` - Delete document
- `GET /api/documents/stats` - Get document statistics

## 🎨 Customization

### Styling

The system uses Tailwind CSS with custom CSS variables. Modify `app/globals.css` to customize:

- Color scheme
- Typography
- Spacing
- Component styles

### Adding New Features

1. **New UI Components** - Add to `app/components/ui/`
2. **New API Routes** - Create in `app/api/`
3. **New Pages** - Add to `app/` directory
4. **Database Schema** - Modify in `app/api/mongo.js`

### Configuration

- **File Upload Limits** - Modify in upload route
- **Database Connection** - Update in `app/api/mongo.js`
- **Supported File Types** - Configure in DocumentManager component

## 🔒 Security Features

- **Input Validation** - All user inputs are validated
- **File Type Restrictions** - Only allowed file types can be uploaded
- **File Size Limits** - 10MB maximum file size
- **Secure File Storage** - Unique file naming prevents conflicts
- **Database Security** - MongoDB connection with proper authentication

## 📱 Responsive Design

The system is fully responsive and works on:

- Desktop computers
- Tablets
- Mobile phones
- All modern browsers

## 🚀 Deployment

### Vercel Deployment

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms

The system can be deployed to any platform that supports Next.js:

- Netlify
- AWS Amplify
- DigitalOcean App Platform
- Railway

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:

- Create an issue in the repository
- Check the documentation
- Review the code comments

## 🔄 Version History

- **v1.0.0** - Initial release with core HRM features
- Employee management
- Document management
- Dashboard analytics
- Responsive design

---

**Built with ❤️ using Next.js, React, and MongoDB**
