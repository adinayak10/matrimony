# APK Manager - Admin Guide

## 📱 Overview
The APK Manager allows admins to upload, manage, and distribute Android app updates directly through the admin panel.

## 🌐 Access

### Admin Panel:
**URL:** `https://admin.banjaramatch.com/apk-manager`

### Login:
1. Go to `https://admin.banjaramatch.com`
2. Login with admin credentials
3. Click on "📱 APK Manager" in the sidebar

## 📤 Uploading New APK

### Step 1: Prepare Your APK
- Build your Android APK file
- Ensure it's signed and ready for distribution
- Maximum file size: 100MB

### Step 2: Upload Process
1. Navigate to APK Manager page
2. Click "Click to select APK file" or drag & drop
3. Fill in required details:
   - **Version Name**: e.g., "1.2.0" (user-friendly version)
   - **Version Code**: e.g., 12 (incremental number, must be unique)
   - **Release Notes**: Description of changes (optional)
   - **Mandatory Update**: Check if users must update

4. Click "⬆️ Upload APK"
5. Wait for upload progress to complete
6. Success message will appear

### Version Code Rules:
- Must be a unique number
- Should be incremental (each new version should have higher code)
- Example: v1.0.0 = code 10, v1.1.0 = code 11, v1.2.0 = code 12

## 📊 Current APK Information

The top section shows:
- Current version name and code
- File name and size
- Total downloads
- Whether update is mandatory
- Last upload date
- Release notes

## 🔄 How Mobile App Gets Update Info

### Automatic Check:
When mobile app calls `/api/fetchSetting`, it receives:

```json
{
  "status": true,
  "data": {
    "settings": {...},
    "apkVersion": {
      "versionName": "1.2.0",
      "versionCode": 12,
      "releaseNotes": "Bug fixes and improvements",
      "isMandatoryUpdate": false,
      "downloadUrl": "/api/download-apk",
      "fileSize": 45678900,
      "lastUpdated": "2025-12-30T..."
    }
  }
}
```

### Mobile App Logic:
1. Compare `versionCode` with installed version
2. If server version > installed version → Show update dialog
3. If `isMandatoryUpdate` is true → Force update
4. User clicks update → Download from `downloadUrl`

## 📥 Download Endpoint

**Public Download URL:**
```
GET https://api.banjaramatch.com/api/download-apk
```

- No authentication required
- Automatically tracks download count
- Streams file efficiently
- Returns latest APK file

## 🗑️ Deleting APK

To remove the current APK:
1. Click "🗑️ Delete Current APK" button
2. Confirm deletion
3. File is removed from server
4. Settings reset to default values

⚠️ **Warning:** This action cannot be undone!

## 🔐 API Endpoints (For Admin)

### 1. Upload APK
```
POST /api/admin/apk/upload
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

Fields:
- apkFile: (file) APK file
- versionName: (string) e.g., "1.2.0"
- versionCode: (number) e.g., 12
- releaseNotes: (string) Optional
- isMandatoryUpdate: (boolean) true/false
```

### 2. Get APK Info
```
GET /api/admin/apk/info
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "data": {
    "versionName": "1.2.0",
    "versionCode": 12,
    "fileName": "BanjaraMatch_v1_2_0_1735567890.apk",
    "fileSize": 45678900,
    "releaseNotes": "Bug fixes",
    "isMandatoryUpdate": false,
    "downloadCount": 150,
    "lastUpdated": "2025-12-30T..."
  }
}
```

### 3. Update Metadata
```
PUT /api/admin/apk/update-info
Authorization: Bearer <admin_token>
Content-Type: application/json

Body:
{
  "releaseNotes": "Updated notes",
  "isMandatoryUpdate": true
}
```

### 4. Delete APK
```
DELETE /api/admin/apk/delete
Authorization: Bearer <admin_token>
```

## 📁 File Storage

APK files are stored in:
```
/var/www/api.banjaramatch.com/uploads/apk/
```

File naming format:
```
BanjaraMatch_v{versionName}_{timestamp}.apk
Example: BanjaraMatch_v1_2_0_1735567890123.apk
```

## 🔧 Technical Details

### Database Storage:
- APK info stored in Settings collection
- No separate schema created
- Part of `apk` object in settings

### Fields in Settings:
```javascript
apk: {
  versionName: String,
  versionCode: Number (unique),
  fileName: String,
  filePath: String,
  fileSize: Number (bytes),
  releaseNotes: String,
  isMandatoryUpdate: Boolean,
  downloadCount: Number,
  lastUpdated: Date
}
```

## 🎯 Best Practices

1. **Version Codes**: Always increment (never reuse)
2. **Testing**: Test APK before uploading
3. **Release Notes**: Always provide clear notes
4. **Mandatory Updates**: Use sparingly for critical fixes
5. **File Size**: Keep APK size optimized
6. **Backup**: Keep previous APK files locally

## 🐛 Troubleshooting

### Upload Fails:
- Check file is actually .apk format
- Ensure file size < 100MB
- Verify admin authentication token
- Check server disk space

### Can't Access APK Manager:
- Verify logged in as admin
- Check admin token in localStorage
- Clear browser cache

### Mobile App Not Detecting Update:
- Verify version code is higher than current
- Check `/api/fetchSetting` response
- Ensure `apkVersion` object is present

## 📞 Support

For technical issues, check:
- API logs: `pm2 logs matrimony-api`
- Admin panel logs: `pm2 logs admin-panel`
- Server directory: `/var/www/api.banjaramatch.com/`

---

**Last Updated:** December 30, 2025
**Feature Status:** ✅ Production Ready
