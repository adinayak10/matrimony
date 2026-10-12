# User Deletion Script - Instructions

## ⚠️ IMPORTANT WARNING
This script **PERMANENTLY DELETES** users and all their associated data from the database. This action is **IRREVERSIBLE**. Use with extreme caution!

## What Gets Deleted

When you delete a user, the script removes:

1. **User Profile & Photos**
   - User account
   - Profile pictures
   - User photos

2. **Relationships & Connections**
   - Friendship/Interest requests (sent and received)
   - Shortlists (given and received)
   - Blocks (given and received)

3. **Communication**
   - All messages (sent and received)
   - Chat rooms (where user is participant)
   - Room memberships
   - Chat intent logs

4. **Activity & Logs**
   - Activity logs
   - Search logs
   - Recent visitor logs (as visitor and visited)
   - Profile image view logs

5. **Notifications & Reports**
   - Notifications (sent and received)
   - Saved notifications
   - User reports (created and received)
   - Profile picture requests

6. **Queue Entries**
   - Second chance queue entries

## How to Use

### Step 1: Add User IDs

Edit the `deleteUsers.js` file and add the user IDs you want to delete:

```javascript
const USER_IDS_TO_DELETE = [
  '507f1f77bcf86cd799439011',  // User 1
  '507f191e810c19729de860ea',  // User 2
  '6745a1b2c3d4e5f6g7h8i9j0',  // User 3
];
```

### Step 2: Find User IDs

To find user IDs, you can:

**Option A: Query MongoDB directly**
```bash
mongosh
use aasd
db.users.find({ email: "user@example.com" }, { _id: 1, full_name: 1, email: 1 })
```

**Option B: Check from your application logs or database admin tools**

### Step 3: Run the Script

```bash
cd /var/www/api.banjaramatch.com
node deleteUsers.js
```

### Step 4: Review Output

The script will show:
- Which user is being processed
- What data is being deleted
- A summary of deleted records for each user
- A final summary of all deletions

## Example Output

```
╔═══════════════════════════════════════════════╗
║     USER DELETION SCRIPT - BANJARA MATCH      ║
╚═══════════════════════════════════════════════╝

📋 Users to delete: 2
⚠️  This action is IRREVERSIBLE!

🔌 Connecting to database...
✅ Connected to database

[1/2] Processing user: 507f1f77bcf86cd799439011
──────────────────────────────────────────────────

🗑️  Starting deletion process for user: 507f1f77bcf86cd799439011
📋 Found user: John Doe
📸 Deleting user photos...
🤝 Deleting friendship requests...
💬 Deleting messages...
🏠 Deleting chat rooms...
⭐ Deleting shortlists...
🚫 Deleting blocks...
🔔 Deleting notifications...
📊 Deleting activity logs...
🚩 Deleting reports...
👀 Deleting visitor logs...
🔍 Deleting search logs...
🖼️  Deleting profile view logs...
🖼️  Deleting profile pic requests...
💭 Deleting chat intent logs...
🔄 Deleting second chance queue entries...
👤 Deleting user account...

✅ Deletion Summary:
═══════════════════════════════════════
   userPhotos               : 5
   friendshipRequests       : 12
   messages                 : 245
   chatRooms                : 8
   roomUsers                : 8
   rooms                    : 8
   shortlists               : 23
   blocks                   : 2
   notifications            : 156
   savedNotifications       : 34
   activityLogs             : 89
   reports                  : 1
   visitors                 : 45
   searchLogs               : 67
   profileViews             : 34
   profilePicRequests       : 3
   chatIntentLogs           : 12
   secondChanceQueue        : 5
   user                     : 1
═══════════════════════════════════════

🎯 Total records deleted: 758
```

## Safety Checks

The script includes several safety features:

1. **User Existence Check**: Verifies user exists before deletion
2. **Detailed Logging**: Shows exactly what's being deleted
3. **Summary Report**: Provides complete deletion statistics
4. **No Default IDs**: Empty array prevents accidental mass deletion
5. **Sequential Processing**: Deletes one user at a time with delays

## Troubleshooting

### Error: "User not found"
- The user ID doesn't exist in the database
- Check if the ID is correct (24-character hex string)

### Error: "Cannot read property '_id' of null"
- MongoDB connection issue
- Check if MongoDB is running: `sudo systemctl status mongod`

### Error: "Model not found"
- Missing model import in the script
- Check if all model files exist in `/models` directory

## Rollback

⚠️ **There is NO rollback option**. Once deleted, data cannot be recovered unless you have a database backup.

### To restore from backup:
```bash
# If you have a MongoDB backup
mongorestore --db aasd /path/to/backup/aasd
```

## Best Practices

1. **Always backup first**: Create a database backup before running this script
   ```bash
   mongodump --db aasd --out /backup/$(date +%Y%m%d_%H%M%S)
   ```

2. **Test with one user**: Start by deleting one test user to verify everything works

3. **Double-check IDs**: Verify user IDs are correct before running

4. **Run during low traffic**: Execute during maintenance windows

5. **Monitor logs**: Watch the output carefully for any errors

6. **Keep records**: Save the deletion summary output for your records

## Support

If you encounter issues:
1. Check MongoDB logs: `sudo tail -f /var/log/mongodb/mongod.log`
2. Check application logs
3. Verify database connection in `db.js`
4. Ensure all dependencies are installed: `npm install`

## Database Backup Command

Before running the deletion script, always create a backup:

```bash
# Create backup with timestamp
mongodump --db aasd --out /backup/banjaramatch_$(date +%Y%m%d_%H%M%S)

# Verify backup was created
ls -lh /backup/
```

## License

Use at your own risk. This script is provided as-is without warranty.
