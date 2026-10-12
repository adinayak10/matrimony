# App Update Feature Documentation

## Overview
The app now includes a comprehensive update checking and installation system that allows users to download and install APK updates directly from the app.

## Features

### 1. **Automatic Update Check**
- Updates are checked automatically when the app starts (after splash screen)
- Compares current app version with server version from settings API

### 2. **Two Update Types**

#### Optional Update
- User can choose to "Download & Install" or "Maybe Later"
- User can continue using the app without updating
- Back button works normally

#### Mandatory Update (Force Update)
- User must update to continue using the app
- Cannot dismiss the update screen
- Back button shows "Exit App" confirmation dialog
- App cannot be used until updated

### 3. **Update Screen Features**
- Shows current version → new version
- Displays release notes (what's new)
- Shows file size before downloading
- Real-time download progress with percentage
- Automatic APK installation after download
- Beautiful UI with appropriate colors for optional/mandatory updates

### 4. **Manual Update Check**
- Added "Check for Updates" button in Settings screen
- Shows "Up to Date" message if no update is available
- User can manually check for updates anytime

## Implementation Details

### Files Created/Modified

#### New Files:
1. **`lib/utilities/update_checker.dart`**
   - Core update checking logic
   - Compares version codes
   - Shows update screen when needed

2. **`lib/screens/update_screen/update_screen.dart`**
   - UI for the update screen
   - Different layouts for optional vs mandatory updates
   - Shows release notes and download progress

3. **`lib/screens/update_screen/update_screen_controller.dart`**
   - Download logic with progress tracking
   - APK installation handling
   - Error handling

4. **`android/app/src/main/res/xml/file_paths.xml`**
   - FileProvider configuration for Android 7.0+
   - Allows secure file sharing for APK installation

#### Modified Files:
1. **`lib/models/setting_model.dart`**
   - Added `ApkInfo` class with update details

2. **`lib/screens/splash_screen/splash_controller.dart`**
   - Added automatic update check after settings load

3. **`lib/screens/setting_screen/setting_screen.dart`**
   - Added "Check for Updates" button

4. **`android/app/src/main/AndroidManifest.xml`**
   - Added `REQUEST_INSTALL_PACKAGES` permission
   - Added FileProvider for APK installation

## Server-Side Configuration

The settings API should return the following structure:

```json
{
  "settings": {
    "apk": {
      "versionName": "1.0.1",
      "versionCode": 2,
      "fileName": "banjaramatch-v1.0.1.apk",
      "filePath": "https://yourdomain.com/downloads/banjaramatch-v1.0.1.apk",
      "fileSize": 52428800,
      "releaseNotes": "• Bug fixes\n• Performance improvements\n• New features added",
      "isMandatoryUpdate": false,
      "downloadCount": 0,
      "lastUpdated": "2025-12-30T14:01:33.394Z"
    },
    "termsUrl": "https://www.banjaramatch.com/terms-conditions",
    ...
  }
}
```

### APK Info Fields:

- **`versionName`**: Human-readable version (e.g., "1.0.1")
- **`versionCode`**: Integer version for comparison (must be > current app's versionCode)
- **`fileName`**: APK filename for saving
- **`filePath`**: Direct download URL for the APK file
- **`fileSize`**: File size in bytes (for display purposes)
- **`releaseNotes`**: What's new in this version (supports multi-line text)
- **`isMandatoryUpdate`**: `true` for force update, `false` for optional
- **`downloadCount`**: (Optional) Track number of downloads
- **`lastUpdated`**: ISO timestamp of the update

## Version Comparison Logic

The app compares `versionCode` (integer) values:
- **Current app**: From `pubspec.yaml` (e.g., `version: 1.0.0+1` → versionCode = 1)
- **Server version**: From `settings.apk.versionCode`
- If `serverVersionCode > currentVersionCode` → Update available

## Update Flow

```
App Start
    ↓
Splash Screen
    ↓
Load Settings from API
    ↓
Check Update
    ↓
┌─────────────────────┐
│ Update Available?   │
└─────────────────────┘
    ↓                ↓
   Yes              No
    ↓                ↓
┌─────────────┐    Continue
│ Show Update │    to App
│   Screen    │
└─────────────┘
    ↓
User Action
    ↓
Download APK
    ↓
Install APK
```

## User Experience

### Optional Update Flow:
1. User sees update screen
2. Can tap "Download & Install" or "Maybe Later"
3. If "Download & Install": Progress bar shows → Auto-installs
4. If "Maybe Later": Continue to app normally

### Mandatory Update Flow:
1. User sees update screen with warning banner
2. Only options: "Download & Install" or "Exit App"
3. Cannot use app until updated
4. Back button shows exit confirmation

## Testing

### Test Scenarios:

1. **No Update Available**
   - Set server versionCode = current versionCode
   - Should continue to app normally
   - Manual check shows "Up to Date"

2. **Optional Update**
   - Set server versionCode > current, isMandatoryUpdate = false
   - Should show update screen
   - "Maybe Later" should work

3. **Mandatory Update**
   - Set server versionCode > current, isMandatoryUpdate = true
   - Should block app usage
   - Back button should show exit dialog

4. **Download & Install**
   - Test with real APK file
   - Check progress bar updates
   - Verify installation prompt appears

## Security Considerations

1. **HTTPS Only**: APK downloads should use HTTPS
2. **File Verification**: Consider adding checksum verification
3. **Permissions**: App requests `REQUEST_INSTALL_PACKAGES` permission
4. **FileProvider**: Uses secure content:// URIs for Android 7.0+

## Troubleshooting

### Installation Doesn't Start
- Check if "Install from Unknown Sources" is enabled in device settings
- Verify FileProvider is correctly configured in AndroidManifest.xml
- Check file permissions

### Download Fails
- Verify APK URL is accessible and correct
- Check internet connection
- Verify storage permissions

### Version Not Detecting
- Ensure versionCode in pubspec.yaml matches the current build
- Verify server returns correct versionCode (integer, not string)
- Check logs for version comparison output

## Future Enhancements

1. **Delta Updates**: Download only changed portions
2. **Background Downloads**: Download while user continues using app
3. **Auto-Install**: Install without user interaction (requires root or system app)
4. **Rollback**: Ability to revert to previous version
5. **A/B Testing**: Gradual rollout to percentage of users
6. **Update History**: Show previous release notes
7. **APK Signature Verification**: Verify APK authenticity before installing

## Maintenance

### To Deploy a New Update:

1. Build new APK with incremented versionCode in `pubspec.yaml`
2. Upload APK to server
3. Update settings API with new APK info
4. Set `isMandatoryUpdate` based on importance
5. Test update flow before full deployment

### Version Naming Convention:
- **Major.Minor.Patch+BuildNumber**
- Example: `1.2.3+15`
  - Major: 1 (Breaking changes)
  - Minor: 2 (New features)
  - Patch: 3 (Bug fixes)
  - BuildNumber: 15 (versionCode)

## Support

For issues or questions:
- Check logs for error messages
- Verify server API response format
- Test on multiple Android versions
- Ensure all permissions are granted
