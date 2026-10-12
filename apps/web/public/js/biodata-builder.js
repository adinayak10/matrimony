// ========================================
// BIODATA BUILDER JAVASCRIPT
// ========================================

// Global Variables
let selectedTemplate = 'classic';
let uploadedPhoto = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  // Set default template as active
  selectTemplate('classic');
  
  // Add event listeners to form fields for live preview
  const formInputs = document.querySelectorAll('#biodataForm input, #biodataForm select, #biodataForm textarea');
  formInputs.forEach(input => {
    input.addEventListener('input', debounce(updatePreview, 300));
    input.addEventListener('change', debounce(updatePreview, 300));
  });
  
  // Photo upload handler
  const photoUpload = document.getElementById('photoUpload');
  if (photoUpload) {
    photoUpload.addEventListener('change', handlePhotoUpload);
  }
});

// Debounce function to limit rapid updates
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Template Selection
function selectTemplate(templateName) {
  selectedTemplate = templateName;
  
  // Update active state on template cards
  const templateCards = document.querySelectorAll('.template-card');
  templateCards.forEach(card => {
    card.classList.remove('active');
    if (card.getAttribute('data-template') === templateName) {
      card.classList.add('active');
    }
  });
  
  // Update preview if form has data
  updatePreview();
}

// Handle Photo Upload
function handlePhotoUpload(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      uploadedPhoto = e.target.result;
      
      // Show preview below upload
      const previewContainer = document.getElementById('photoPreview');
      const previewImage = document.getElementById('previewImage');
      previewImage.src = e.target.result;
      previewContainer.style.display = 'block';
      
      // Update main preview
      updatePreview();
    };
    reader.readAsDataURL(file);
  }
}

// Get Form Data
function getFormData() {
  return {
    fullName: document.getElementById('fullName').value,
    dob: document.getElementById('dob').value,
    gender: document.getElementById('gender').value,
    height: document.getElementById('height').value,
    maritalStatus: document.getElementById('maritalStatus').value,
    religion: document.getElementById('religion').value,
    complexion: document.getElementById('complexion').value,
    address: document.getElementById('address').value,
    city: document.getElementById('city').value,
    state: document.getElementById('state').value,
    mobile: document.getElementById('mobile').value,
    email: document.getElementById('email').value,
    education: document.getElementById('education').value,
    occupation: document.getElementById('occupation').value,
    income: document.getElementById('income').value,
    workLocation: document.getElementById('workLocation').value,
    fatherName: document.getElementById('fatherName').value,
    fatherOccupation: document.getElementById('fatherOccupation').value,
    motherName: document.getElementById('motherName').value,
    motherOccupation: document.getElementById('motherOccupation').value,
    brothers: document.getElementById('brothers').value,
    sisters: document.getElementById('sisters').value,
    familyType: document.getElementById('familyType').value,
    partnerAge: document.getElementById('partnerAge').value,
    partnerHeight: document.getElementById('partnerHeight').value,
    partnerEducation: document.getElementById('partnerEducation').value,
    partnerLocation: document.getElementById('partnerLocation').value,
    additionalPreferences: document.getElementById('additionalPreferences').value,
    photo: uploadedPhoto
  };
}

// Calculate Age from DOB
function calculateAge(dob) {
  if (!dob) return '';
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age + ' years';
}

// Update Preview
function updatePreview() {
  const data = getFormData();
  
  // Check if at least basic required fields are filled
  if (!data.fullName || !data.dob || !data.gender || !data.maritalStatus || !data.mobile) {
    return; // Don't update preview if required fields are empty
  }
  
  // Enable download button
  document.getElementById('downloadBtn').disabled = false;
  
  // Generate biodata HTML based on selected template
  const biodataHTML = generateBiodataHTML(data, selectedTemplate);
  document.getElementById('biodataPreview').innerHTML = biodataHTML;
}

// Preview Biodata (called by button click)
function previewBiodata() {
  const form = document.getElementById('biodataForm');
  
  // Validate required fields
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  updatePreview();
  
  // Scroll to preview on mobile
  if (window.innerWidth < 992) {
    document.querySelector('.biodata-preview-container').scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    });
  }
  
  // Show success message
  showSuccessMessage('Biodata preview generated successfully!');
}

// Generate Biodata HTML
function generateBiodataHTML(data, template) {
  const age = calculateAge(data.dob);
  const templateClass = `template-${template}`;
  
  let html = `
    <div class="biodata-template ${templateClass}" id="biodataContent">
      <div class="biodata-header">
        <h1 class="biodata-title">Marriage Biodata</h1>
        <p class="biodata-subtitle">Personal Information for Matrimonial Alliance</p>
      </div>
  `;
  
  // Photo Section
  if (data.photo) {
    html += `
      <div class="biodata-photo-section">
        <img src="${data.photo}" alt="${data.fullName}" class="biodata-photo">
      </div>
    `;
  }
  
  // Personal Information
  html += `
    <div class="biodata-section">
      <h3 class="biodata-section-title">
        <i class="fa fa-user"></i> Personal Information
      </h3>
      <div class="biodata-details">
  `;
  
  if (data.fullName) html += `<div class="biodata-detail-item"><span class="biodata-detail-label">Full Name:</span><span class="biodata-detail-value">${data.fullName}</span></div>`;
  if (data.dob) html += `<div class="biodata-detail-item"><span class="biodata-detail-label">Date of Birth:</span><span class="biodata-detail-value">${formatDate(data.dob)}</span></div>`;
  if (age) html += `<div class="biodata-detail-item"><span class="biodata-detail-label">Age:</span><span class="biodata-detail-value">${age}</span></div>`;
  if (data.gender) html += `<div class="biodata-detail-item"><span class="biodata-detail-label">Gender:</span><span class="biodata-detail-value">${data.gender}</span></div>`;
  if (data.height) html += `<div class="biodata-detail-item"><span class="biodata-detail-label">Height:</span><span class="biodata-detail-value">${data.height}</span></div>`;
  if (data.maritalStatus) html += `<div class="biodata-detail-item"><span class="biodata-detail-label">Marital Status:</span><span class="biodata-detail-value">${data.maritalStatus}</span></div>`;
  if (data.religion) html += `<div class="biodata-detail-item"><span class="biodata-detail-label">Religion & Caste:</span><span class="biodata-detail-value">${data.religion}</span></div>`;
  if (data.complexion) html += `<div class="biodata-detail-item"><span class="biodata-detail-label">Complexion:</span><span class="biodata-detail-value">${data.complexion}</span></div>`;
  
  html += `</div></div>`;
  
  // Contact Information
  if (data.address || data.city || data.state || data.mobile || data.email) {
    html += `
      <div class="biodata-section">
        <h3 class="biodata-section-title">
          <i class="fa fa-map-marker"></i> Contact Information
        </h3>
        <div class="biodata-details">
    `;
    
    if (data.address) html += `<div class="biodata-detail-item"><span class="biodata-detail-label">Address:</span><span class="biodata-detail-value">${data.address}</span></div>`;
    if (data.city) html += `<div class="biodata-detail-item"><span class="biodata-detail-label">City:</span><span class="biodata-detail-value">${data.city}</span></div>`;
    if (data.state) html += `<div class="biodata-detail-item"><span class="biodata-detail-label">State:</span><span class="biodata-detail-value">${data.state}</span></div>`;
    if (data.mobile) html += `<div class="biodata-detail-item"><span class="biodata-detail-label">Mobile:</span><span class="biodata-detail-value">${data.mobile}</span></div>`;
    if (data.email) html += `<div class="biodata-detail-item"><span class="biodata-detail-label">Email:</span><span class="biodata-detail-value">${data.email}</span></div>`;
    
    html += `</div></div>`;
  }
  
  // Education & Career
  if (data.education || data.occupation || data.income || data.workLocation) {
    html += `
      <div class="biodata-section">
        <h3 class="biodata-section-title">
          <i class="fa fa-graduation-cap"></i> Education & Career
        </h3>
        <div class="biodata-details">
    `;
    
    if (data.education) html += `<div class="biodata-detail-item"><span class="biodata-detail-label">Education:</span><span class="biodata-detail-value">${data.education}</span></div>`;
    if (data.occupation) html += `<div class="biodata-detail-item"><span class="biodata-detail-label">Occupation:</span><span class="biodata-detail-value">${data.occupation}</span></div>`;
    if (data.income) html += `<div class="biodata-detail-item"><span class="biodata-detail-label">Annual Income:</span><span class="biodata-detail-value">${data.income}</span></div>`;
    if (data.workLocation) html += `<div class="biodata-detail-item"><span class="biodata-detail-label">Work Location:</span><span class="biodata-detail-value">${data.workLocation}</span></div>`;
    
    html += `</div></div>`;
  }
  
  // Family Information
  if (data.fatherName || data.fatherOccupation || data.motherName || data.motherOccupation || data.brothers || data.sisters || data.familyType) {
    html += `
      <div class="biodata-section">
        <h3 class="biodata-section-title">
          <i class="fa fa-users"></i> Family Information
        </h3>
        <div class="biodata-details">
    `;
    
    if (data.fatherName) html += `<div class="biodata-detail-item"><span class="biodata-detail-label">Father's Name:</span><span class="biodata-detail-value">${data.fatherName}</span></div>`;
    if (data.fatherOccupation) html += `<div class="biodata-detail-item"><span class="biodata-detail-label">Father's Occupation:</span><span class="biodata-detail-value">${data.fatherOccupation}</span></div>`;
    if (data.motherName) html += `<div class="biodata-detail-item"><span class="biodata-detail-label">Mother's Name:</span><span class="biodata-detail-value">${data.motherName}</span></div>`;
    if (data.motherOccupation) html += `<div class="biodata-detail-item"><span class="biodata-detail-label">Mother's Occupation:</span><span class="biodata-detail-value">${data.motherOccupation}</span></div>`;
    if (data.brothers) html += `<div class="biodata-detail-item"><span class="biodata-detail-label">Brothers:</span><span class="biodata-detail-value">${data.brothers}</span></div>`;
    if (data.sisters) html += `<div class="biodata-detail-item"><span class="biodata-detail-label">Sisters:</span><span class="biodata-detail-value">${data.sisters}</span></div>`;
    if (data.familyType) html += `<div class="biodata-detail-item"><span class="biodata-detail-label">Family Type:</span><span class="biodata-detail-value">${data.familyType}</span></div>`;
    
    html += `</div></div>`;
  }
  
  // Partner Preferences
  if (data.partnerAge || data.partnerHeight || data.partnerEducation || data.partnerLocation || data.additionalPreferences) {
    html += `
      <div class="biodata-section">
        <h3 class="biodata-section-title">
          <i class="fa fa-heart"></i> Partner Preferences
        </h3>
        <div class="biodata-details">
    `;
    
    if (data.partnerAge) html += `<div class="biodata-detail-item"><span class="biodata-detail-label">Age Range:</span><span class="biodata-detail-value">${data.partnerAge}</span></div>`;
    if (data.partnerHeight) html += `<div class="biodata-detail-item"><span class="biodata-detail-label">Height Range:</span><span class="biodata-detail-value">${data.partnerHeight}</span></div>`;
    if (data.partnerEducation) html += `<div class="biodata-detail-item"><span class="biodata-detail-label">Education:</span><span class="biodata-detail-value">${data.partnerEducation}</span></div>`;
    if (data.partnerLocation) html += `<div class="biodata-detail-item"><span class="biodata-detail-label">Location:</span><span class="biodata-detail-value">${data.partnerLocation}</span></div>`;
    
    html += `</div>`;
    
    if (data.additionalPreferences) {
      html += `<div class="biodata-text-content" style="margin-top: 15px;">${data.additionalPreferences}</div>`;
    }
    
    html += `</div>`;
  }
  
  html += `</div>`;
  
  return html;
}

// Format Date
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-IN', options);
}

// Download PDF
function downloadPDF() {
  const button = document.getElementById('downloadBtn');
  const originalText = button.innerHTML;
  
  // Show loading state
  button.innerHTML = '<span class="loading-spinner"></span> Generating PDF...';
  button.disabled = true;
  
  const element = document.getElementById('biodataContent');
  const data = getFormData();
  const filename = `${data.fullName.replace(/\s+/g, '_')}_Biodata.pdf`;
  
  // PDF options
  const opt = {
    margin: [10, 10, 10, 10],
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { 
      scale: 2,
      useCORS: true,
      logging: false,
      letterRendering: true
    },
    jsPDF: { 
      unit: 'mm', 
      format: 'a4', 
      orientation: 'portrait' 
    }
  };
  
  // Generate PDF
  html2pdf().set(opt).from(element).save().then(() => {
    // Reset button
    button.innerHTML = originalText;
    button.disabled = false;
    
    // Show success message
    showSuccessMessage('Biodata downloaded successfully!');
  }).catch((error) => {
    console.error('PDF generation error:', error);
    button.innerHTML = originalText;
    button.disabled = false;
    alert('Error generating PDF. Please try again.');
  });
}

// Reset Form
function resetForm() {
  if (confirm('Are you sure you want to reset the form? All data will be lost.')) {
    document.getElementById('biodataForm').reset();
    uploadedPhoto = null;
    document.getElementById('photoPreview').style.display = 'none';
    document.getElementById('biodataPreview').innerHTML = `
      <div class="preview-placeholder">
        <i class="fa fa-file-text-o fa-5x"></i>
        <p>Fill in the form to see your biodata preview</p>
      </div>
    `;
    document.getElementById('downloadBtn').disabled = true;
    
    // Reset to default template
    selectTemplate('classic');
  }
}

// Show Success Message
function showSuccessMessage(message) {
  // Create success message element if it doesn't exist
  let successMsg = document.querySelector('.success-message');
  if (!successMsg) {
    successMsg = document.createElement('div');
    successMsg.className = 'success-message';
    const container = document.querySelector('.biodata-preview-container');
    container.insertBefore(successMsg, container.firstChild);
  }
  
  successMsg.innerHTML = `<i class="fa fa-check-circle"></i> ${message}`;
  successMsg.classList.add('show');
  
  // Hide after 3 seconds
  setTimeout(() => {
    successMsg.classList.remove('show');
  }, 3000);
}

// Auto-fill demo data (for testing - can be removed in production)
function fillDemoData() {
  document.getElementById('fullName').value = 'Rajesh Kumar';
  document.getElementById('dob').value = '1995-05-15';
  document.getElementById('gender').value = 'Male';
  document.getElementById('height').value = '5\'10"';
  document.getElementById('maritalStatus').value = 'Never Married';
  document.getElementById('religion').value = 'Hindu - Banjara';
  document.getElementById('complexion').value = 'Fair';
  document.getElementById('address').value = 'Plot No. 123, Jubilee Hills';
  document.getElementById('city').value = 'Hyderabad';
  document.getElementById('state').value = 'Telangana';
  document.getElementById('mobile').value = '+91 9876543210';
  document.getElementById('email').value = 'rajesh.kumar@email.com';
  document.getElementById('education').value = 'B.Tech Computer Science';
  document.getElementById('occupation').value = 'Software Engineer';
  document.getElementById('income').value = '₹12-15 Lakhs';
  document.getElementById('workLocation').value = 'Bangalore';
  document.getElementById('fatherName').value = 'Mr. Suresh Kumar';
  document.getElementById('fatherOccupation').value = 'Business';
  document.getElementById('motherName').value = 'Mrs. Lakshmi Devi';
  document.getElementById('motherOccupation').value = 'Homemaker';
  document.getElementById('brothers').value = '1 (Married)';
  document.getElementById('sisters').value = '1 (Unmarried)';
  document.getElementById('familyType').value = 'Joint Family';
  document.getElementById('partnerAge').value = '23-28 years';
  document.getElementById('partnerHeight').value = '5\'2" to 5\'6"';
  document.getElementById('partnerEducation').value = 'Graduate or above';
  document.getElementById('partnerLocation').value = 'Anywhere in India';
  document.getElementById('additionalPreferences').value = 'Looking for a well-educated girl from a respectable Banjara family with good values.';
  
  updatePreview();
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
  // Ctrl/Cmd + P to preview
  if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
    e.preventDefault();
    previewBiodata();
  }
  
  // Ctrl/Cmd + D to download (if preview is ready)
  if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
    e.preventDefault();
    const downloadBtn = document.getElementById('downloadBtn');
    if (!downloadBtn.disabled) {
      downloadPDF();
    }
  }
  
  // Ctrl/Cmd + R to reset (with confirmation)
  if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
    e.preventDefault();
    resetForm();
  }
});

// Export for console debugging
window.biodataBuilder = {
  fillDemoData: fillDemoData,
  selectTemplate: selectTemplate,
  previewBiodata: previewBiodata,
  downloadPDF: downloadPDF,
  resetForm: resetForm
};
