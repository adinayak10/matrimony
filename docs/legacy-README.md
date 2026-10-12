# Banjara Match Admin Panel

A comprehensive admin panel for managing the Banjara Match matrimonial application.

## Features

### 🔐 Authentication
- Secure admin login with JWT tokens
- Session management
- Password protection

### 👥 User Management
- View all users with advanced filtering
- Search by name, email, or phone
- Filter by gender, status (active/blocked/verified)
- View detailed user profiles
- Edit user information
- Verify/Unverify users
- Block/Unblock users
- Delete users
- Export user data to CSV

### 🖼️ Banner Management
- Create, edit, and delete banners
- Upload banner images
- Set banner links
- Preview banners

### ⚙️ Constants Management
- Manage Castes
- Manage Gotras
- Manage Professions
- Manage Qualifications
- Manage Income Ranges
- Manage Interests

### 📊 Dashboard & Analytics
- Total users count
- Active users count
- Verified users count
- Blocked users count
- Gender distribution
- Login type distribution
- Recent users list

### 🔧 System Settings
- Bulk operations (verify all, unblock all)
- Delete inactive users
- Delete blocked users
- Export all data
- Clear cache
- Change admin password

## Installation

### 1. Install Dependencies

```bash
cd /var/www/admin.banjaramatch.com
npm install
```

### 2. Configure Environment

Edit `.env` file:

```env
PORT=3001
API_BASE_URL=https://api.banjaramatch.com
JWT_SECRET=your_secure_jwt_secret_here
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<bcrypt_hashed_password>
```

To generate a new password hash:

```bash
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('your_password', 10));"
```

### 3. Setup Nginx

Copy the nginx configuration:

```bash
sudo cp /var/www/admin.banjaramatch.com/nginx.conf /etc/nginx/sites-available/admin.banjaramatch.com
sudo ln -s /etc/nginx/sites-available/admin.banjaramatch.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. Setup SSL Certificate

```bash
sudo certbot --nginx -d admin.banjaramatch.com
```

### 5. Start the Application

Using PM2:

```bash
pm2 start server.js --name admin-panel
pm2 save
pm2 startup
```

Or using npm:

```bash
npm start
```

## Deployment

### Using PM2 (Recommended)

```bash
# Start
pm2 start server.js --name admin-panel

# Restart
pm2 restart admin-panel

# Stop
pm2 stop admin-panel

# View logs
pm2 logs admin-panel

# Monitor
pm2 monit
```

### Manual Deployment

```bash
cd /var/www/admin.banjaramatch.com
git pull origin main  # if using git
npm install
pm2 restart admin-panel
```

## API Endpoints

The admin panel connects to these backend API endpoints:

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get single user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Banners
- `GET /api/banners` - Get all banners
- `GET /api/banners/:id` - Get single banner
- `POST /api/banners` - Create banner
- `PUT /api/banners/:id` - Update banner
- `DELETE /api/banners/:id` - Delete banner

### Constants
- `GET /api/castes` - Get all castes
- `POST /api/castes` - Create caste
- `DELETE /api/castes/:id` - Delete caste
- (Similar endpoints for gotras, professions, qualifications, income-ranges, interests)

## Security

### Default Credentials
- **Username:** admin
- **Password:** admin123

**⚠️ IMPORTANT: Change the default password immediately after first login!**

### Password Change

1. Log in to the admin panel
2. Go to Settings
3. Click "Change Password"
4. Generate new password hash:
   ```bash
   node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('new_password', 10));"
   ```
5. Update `ADMIN_PASSWORD` in `.env` file
6. Restart the application

### Security Best Practices

1. Use strong passwords
2. Enable HTTPS only (configured in nginx)
3. Regularly update dependencies
4. Monitor access logs
5. Restrict admin panel access by IP (optional, in nginx)

## File Structure

```
admin.banjaramatch.com/
├── public/
│   ├── css/
│   │   └── style.css          # All styles
│   ├── js/
│   │   ├── api.js             # API utilities
│   │   └── auth.js            # Authentication
│   ├── dashboard.html         # Dashboard page
│   ├── users.html             # User management
│   ├── user-detail.html       # User details/edit
│   ├── banners.html           # Banner management
│   ├── constants.html         # Constants management
│   ├── settings.html          # System settings
│   └── login.html             # Login page
├── routes/
│   └── adminAuth.js           # Admin authentication routes
├── server.js                  # Express server
├── package.json               # Dependencies
├── .env                       # Environment config
├── nginx.conf                 # Nginx configuration
└── README.md                  # This file
```

## Troubleshooting

### Port already in use

```bash
# Find process using port 3001
sudo lsof -i :3001

# Kill the process
sudo kill -9 <PID>
```

### Cannot connect to API

1. Check if API server is running
2. Verify API_BASE_URL in `.env`
3. Check CORS settings in API server
4. Verify nginx proxy configuration

### Login not working

1. Verify JWT_SECRET matches in both .env and code
2. Check admin credentials in .env
3. Clear browser cookies
4. Check browser console for errors

### Changes not reflecting

```bash
# Clear PM2 cache and restart
pm2 delete admin-panel
pm2 start server.js --name admin-panel
pm2 save
```

## Maintenance

### Backup

```bash
# Backup admin panel files
tar -czf admin-panel-backup-$(date +%Y%m%d).tar.gz /var/www/admin.banjaramatch.com

# Backup .env separately (contains sensitive data)
cp /var/www/admin.banjaramatch.com/.env ~/admin-env-backup-$(date +%Y%m%d).env
```

### Update

```bash
cd /var/www/admin.banjaramatch.com
npm update
pm2 restart admin-panel
```

### Logs

```bash
# PM2 logs
pm2 logs admin-panel

# Nginx logs
sudo tail -f /var/log/nginx/admin.banjaramatch.com.access.log
sudo tail -f /var/log/nginx/admin.banjaramatch.com.error.log

# Application logs
tail -f ~/.pm2/logs/admin-panel-out.log
tail -f ~/.pm2/logs/admin-panel-error.log
```

## Support

For issues or questions:
- Check the troubleshooting section
- Review nginx and PM2 logs
- Verify API connectivity
- Check browser console for errors

## Version

Current Version: 1.0.0

## License

Proprietary - Banjara Match
