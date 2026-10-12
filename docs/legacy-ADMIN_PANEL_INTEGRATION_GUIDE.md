# Admin Panel Integration Guide - New Regional Pages API

## Quick Start

The regional pages system has been split into **City Pages** and **State Pages** with separate APIs. Update your admin panel to use these new endpoints.

## API Changes Summary

### Old Way (Single endpoint with pageType)
```javascript
// ❌ OLD - Don't use anymore
GET /api/regional-pages/admin/all?pageType=city
POST /api/regional-pages/admin { pageType: 'city', ... }
```

### New Way (Separate endpoints)
```javascript
// ✅ NEW - Use these instead
GET /api/city-pages/admin/all
POST /api/city-pages/admin { city: '...', ... } // No pageType needed!

GET /api/state-pages/admin/all
POST /api/state-pages/admin { state: '...', ... } // No pageType needed!
```

## City Pages API

### Base URL
```
https://api.banjaramatch.com/api/city-pages
```

### Authentication
All admin endpoints require `adminAuth` middleware:
```javascript
headers: {
  'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
  'Content-Type': 'application/json'
}
```

### Endpoints

#### 1. Get Prefill Data for City
```javascript
// GET /api/city-pages/admin/prefill/:cityId
const response = await fetch(`https://api.banjaramatch.com/api/city-pages/admin/prefill/${cityId}`, {
  headers: { 'Authorization': `Bearer ${adminToken}` }
});
const { data } = await response.json();

// Returns prefilled content for creating a new city page:
{
  city: '...',
  state: '...',
  stats: { totalMembers, activeBrides, activeGrooms, ... },
  heroSection: { title, subtitle, ctaText },
  introSection: { heading, subheading, content },
  // ... all other sections prefilled
}
```

#### 2. Create City Page
```javascript
// POST /api/city-pages/admin
const response = await fetch('https://api.banjaramatch.com/api/city-pages/admin', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    city: cityId,              // MongoDB ObjectId
    state: stateId,            // MongoDB ObjectId
    slug: 'banjara-matrimony-delhi',
    heroSection: { ... },
    introSection: { ... },
    // ... other sections
    isPublished: true
  })
});
```

#### 3. Get All City Pages
```javascript
// GET /api/city-pages/admin/all
const params = new URLSearchParams({
  page: 1,
  limit: 20,
  search: 'delhi',           // Optional: search city names
  state: stateId,            // Optional: filter by state
  isPublished: 'true',       // Optional: filter by publish status
  sortBy: 'createdAt',       // Optional: createdAt, stats.totalMembers, etc.
  sortOrder: 'desc'          // Optional: asc or desc
});

const response = await fetch(`https://api.banjaramatch.com/api/city-pages/admin/all?${params}`, {
  headers: { 'Authorization': `Bearer ${adminToken}` }
});
const { data, pagination } = await response.json();

// Returns:
{
  status: true,
  data: [ /* array of city pages */ ],
  pagination: {
    currentPage: 1,
    totalPages: 5,
    total: 95,
    hasMore: true
  }
}
```

#### 4. Get City Page by ID
```javascript
// GET /api/city-pages/admin/:id
const response = await fetch(`https://api.banjaramatch.com/api/city-pages/admin/${pageId}`, {
  headers: { 'Authorization': `Bearer ${adminToken}` }
});
const { data } = await response.json();
```

#### 5. Update City Page
```javascript
// PUT /api/city-pages/admin/:id
const response = await fetch(`https://api.banjaramatch.com/api/city-pages/admin/${pageId}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    heroSection: { title: 'Updated Title', ... },
    isPublished: true
    // ... any fields to update
  })
});
```

#### 6. Delete City Page
```javascript
// DELETE /api/city-pages/admin/:id
const response = await fetch(`https://api.banjaramatch.com/api/city-pages/admin/${pageId}`, {
  method: 'DELETE',
  headers: { 'Authorization': `Bearer ${adminToken}` }
});
```

#### 7. Refresh Stats
```javascript
// POST /api/city-pages/admin/:id/refresh-stats
const response = await fetch(`https://api.banjaramatch.com/api/city-pages/admin/${pageId}/refresh-stats`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${adminToken}` }
});
const { data } = await response.json();
// Returns updated stats: { totalMembers, activeBrides, activeGrooms, ... }
```

## State Pages API

### Base URL
```
https://api.banjaramatch.com/api/state-pages
```

### Endpoints

#### 1. Get Prefill Data for State
```javascript
// GET /api/state-pages/admin/prefill/:stateId
const response = await fetch(`https://api.banjaramatch.com/api/state-pages/admin/prefill/${stateId}`, {
  headers: { 'Authorization': `Bearer ${adminToken}` }
});
```

#### 2. Create State Page
```javascript
// POST /api/state-pages/admin
const response = await fetch('https://api.banjaramatch.com/api/state-pages/admin', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    state: stateId,            // MongoDB ObjectId (NOT stateId anymore)
    slug: 'banjara-matrimony-karnataka',
    heroSection: { ... },
    // ... other sections
    isPublished: true
  })
});
```

#### 3. Get All State Pages
```javascript
// GET /api/state-pages/admin/all
const params = new URLSearchParams({
  page: 1,
  limit: 20,
  search: 'karnataka',       // Optional: search state names
  isPublished: 'true',       // Optional
  sortBy: 'createdAt',
  sortOrder: 'desc'
});

const response = await fetch(`https://api.banjaramatch.com/api/state-pages/admin/all?${params}`, {
  headers: { 'Authorization': `Bearer ${adminToken}` }
});
```

#### 4. Get States Hierarchy
**New endpoint for admin dashboard**
```javascript
// GET /api/state-pages/admin/hierarchy
const response = await fetch('https://api.banjaramatch.com/api/state-pages/admin/hierarchy', {
  headers: { 'Authorization': `Bearer ${adminToken}` }
});
const { data } = await response.json();

// Returns:
[
  {
    _id: '...',
    state: { name: 'Karnataka' },
    slug: 'banjara-matrimony-karnataka',
    isPublished: true,
    stats: { totalMembers: 5432, totalCities: 23 },
    cityPagesCount: 23,          // Total city pages in this state
    publishedCityPages: 18       // Published city pages
  },
  // ... more states
]
```

#### 5-8. Update, Delete, Get by ID, Refresh Stats
Same patterns as City Pages, just use `/api/state-pages/admin/*`

## Admin Panel UI Changes

### 1. Add Tabs for City/State
```html
<!-- regional-pages.html -->
<div class="tabs">
  <button class="tab active" data-type="city">City Pages</button>
  <button class="tab" data-type="state">State Pages</button>
</div>

<div id="city-pages-panel" class="tab-content active">
  <!-- City pages table -->
</div>

<div id="state-pages-panel" class="tab-content hidden">
  <!-- State pages table -->
</div>
```

### 2. Update Create/Edit Forms
```javascript
// City Page Form
document.getElementById('createCityPageBtn').addEventListener('click', async () => {
  const cityId = document.getElementById('citySelect').value;
  
  // Step 1: Get prefill data
  const prefill = await fetch(`/api/city-pages/admin/prefill/${cityId}`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  }).then(r => r.json());
  
  // Step 2: Show form with prefilled data
  populateForm(prefill.data);
  
  // Step 3: On submit, create page
  document.getElementById('cityPageForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = getFormData();
    
    await fetch('/api/city-pages/admin', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });
  });
});
```

### 3. Update List/Table View
```javascript
async function loadCityPages(page = 1) {
  const response = await fetch(`/api/city-pages/admin/all?page=${page}&limit=20`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const { data, pagination } = await response.json();
  
  // Render table
  const tbody = document.getElementById('cityPagesTable');
  tbody.innerHTML = data.map(page => `
    <tr>
      <td>${page.city?.name || 'N/A'}</td>
      <td>${page.state?.name || 'N/A'}</td>
      <td>${page.slug}</td>
      <td>${page.stats?.totalMembers || 0}</td>
      <td>
        <span class="badge ${page.isPublished ? 'success' : 'warning'}">
          ${page.isPublished ? 'Published' : 'Draft'}
        </span>
      </td>
      <td>
        <button onclick="editCityPage('${page._id}')">Edit</button>
        <button onclick="deleteCityPage('${page._id}')">Delete</button>
      </td>
    </tr>
  `).join('');
  
  // Render pagination
  renderPagination(pagination);
}
```

### 4. Dashboard Stats Widget
```javascript
async function loadDashboardStats() {
  // Get hierarchy for overview
  const hierarchy = await fetch('/api/state-pages/admin/hierarchy', {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  }).then(r => r.json());
  
  const totalStates = hierarchy.data.length;
  const totalCityPages = hierarchy.data.reduce((sum, s) => sum + s.cityPagesCount, 0);
  const publishedCityPages = hierarchy.data.reduce((sum, s) => sum + s.publishedCityPages, 0);
  
  document.getElementById('statsWidget').innerHTML = `
    <div class="stat-card">
      <h3>${totalStates}</h3>
      <p>State Pages</p>
    </div>
    <div class="stat-card">
      <h3>${totalCityPages}</h3>
      <p>Total City Pages</p>
    </div>
    <div class="stat-card">
      <h3>${publishedCityPages}</h3>
      <p>Published City Pages</p>
    </div>
  `;
}
```

## Key Differences from Old System

| Aspect | Old System | New System |
|--------|-----------|-----------|
| **Field** | `pageType: 'city' or 'state'` | No pageType field needed |
| **Create Endpoint** | `/api/regional-pages/admin` | `/api/city-pages/admin` OR `/api/state-pages/admin` |
| **Request Body** | `{ pageType: 'city', cityId: '...' }` | `{ city: '...' }` (no pageType) |
| **List Endpoint** | `/api/regional-pages/admin/all?pageType=city` | `/api/city-pages/admin/all` |
| **Filter** | Query param `?pageType=city` | Separate endpoints |
| **Prefill** | `/api/regional-pages/admin/prefill/:cityId?type=city` | `/api/city-pages/admin/prefill/:cityId` |

## Migration Status

✅ **Backend Ready:** All new endpoints are live and tested  
⏳ **Admin Panel:** Needs UI update to use new endpoints  
⏳ **Data Migration:** Run `node scripts/migrateRegionalPages.js` to copy data  
✅ **Backward Compatibility:** Old `/api/regional-pages` endpoints still work  

## Testing the New APIs

### Browser Console Test
```javascript
// Test city pages list
fetch('https://api.banjaramatch.com/api/city-pages', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
})
  .then(r => r.json())
  .then(console.log);

// Test state pages list
fetch('https://api.banjaramatch.com/api/state-pages', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
})
  .then(r => r.json())
  .then(console.log);
```

### cURL Test
```bash
# Test admin endpoint (replace YOUR_TOKEN)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.banjaramatch.com/api/city-pages/admin/all

# Test public endpoint
curl https://api.banjaramatch.com/api/city-pages
curl https://api.banjaramatch.com/api/state-pages
```

## Support

If you encounter issues:
1. Check API logs: `pm2 logs matrimony-api --lines 50`
2. Verify authentication token is valid
3. Ensure endpoints use `/api/city-pages` or `/api/state-pages` (not `/api/regional-pages`)
4. Check request body doesn't include `pageType` field

---

**Last Updated:** December 29, 2025  
**Backend Version:** 2.0.0 (Regional Pages Split)  
**Status:** Ready for Admin Panel Integration
