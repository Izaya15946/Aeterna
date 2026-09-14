// ==========================================
// 1. GLOBAL CONFIGURATION & API URL
// ==========================================
// Stores the Google Apps Script Web App URL for database & Drive communication
const googleScriptUrl = "https://script.google.com/macros/s/AKfycbxjtGQamikC5QGn9yw-fhvHzf4ubNSorCjDF3Q-6KRfmAHws2IHmC4Z4o8ylc03gy9w/exec";


// ==========================================
// 2. HELPER FUNCTIONS (DOM UPDATERS)
// ==========================================

// Updates all elements sharing class="profile-pic" across the page simultaneously
function updateProfileImages(imageUrl) {
  if (!imageUrl) return;
  const images = document.querySelectorAll(".profile-pic");
  images.forEach(img => {
    img.src = imageUrl;
  });
}

// Updates all elements sharing class="prof-name" across the page simultaneously
function updateProfileNames(fullname) {
  if (!fullname) return;
  const nameElements = document.querySelectorAll(".prof-name");
  nameElements.forEach(el => {
    el.textContent = fullname;
  });
}

// Formats ISO date strings into clean YYYY-MM-DD text
function formatDate(dateString) {
  if (!dateString) return "N/A";
  return dateString.includes("T") ? dateString.split("T")[0] : dateString;
}


// ==========================================
// 3. PAGE INITIALIZATION & SESSION GUARD
// ==========================================
document.addEventListener("DOMContentLoaded", function() {
  const userEmail = localStorage.getItem("userEmail");
  const storedUser = localStorage.getItem("userProfile");

  // Auth Guard: Redirects guests to index.html if no session email is found
  if (!userEmail) {
    alert("Please log in first!");
    window.location.href = "index.html";
    return;
  }

  // Populate UI elements if user session data is available in LocalStorage
  if (storedUser) {
    const user = JSON.parse(storedUser);
    
    // Render names & profile pictures globally
    updateProfileNames(user.fullname);
    if (user.imageUrl) {
      updateProfileImages(user.imageUrl);
    }

    // Render single detail fields safely by ID
    if (document.getElementById("prof-birthday")) document.getElementById("prof-birthday").textContent = formatDate(user.birthday);
    if (document.getElementById("prof-country")) document.getElementById("prof-country").textContent = user.country || "N/A";
    if (document.getElementById("prof-email")) document.getElementById("prof-email").textContent = user.email || userEmail;
  }

  // --- AUTO FILE MANAGER & UPLOAD EVENT LISTENERS ---
  const uploadBtn = document.getElementById("uploadBtn");
  const fileInput = document.getElementById("fileInput");

  if (uploadBtn && fileInput) {
    // Step 1: Clicking Upload Photo triggers the file picker directly
    uploadBtn.addEventListener("click", function() {
      fileInput.click();
    });

    // Step 2: Selecting an image prompts confirmation before processing upload
    fileInput.addEventListener("change", function(e) {
      const file = e.target.files[0];
      if (!file) return;

      const isConfirmed = confirm(`Do you want to upload "${file.name}" as your profile picture?`);
      
      if (isConfirmed) {
        handleImageUpload(file);
      } else {
        fileInput.value = ""; // Reset if canceled
      }
    });
  }

  // Safely attach event listener to the logout navigation link
  const logoutBtn = document.getElementById("navLogout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function(e) {
      e.preventDefault();
      localStorage.clear();
      window.location.href = "index.html";
    });
  }
});


// ==========================================
// This is For Upload and Combine to GDrive 
// ==========================================
function handleImageUpload(file) {
  const userEmail = localStorage.getItem("userEmail");
  const fileInput = document.getElementById("fileInput");

  if (!file) {
    alert("No file provided.");
    return;
  }

  // Restrict file uploads larger than 2MB to prevent Apps Script payload limits
  if (file.size > 2 * 1024 * 1024) {
    alert("File is too large! Please choose an image smaller than 2 MB.");
    if (fileInput) fileInput.value = "";
    return;
  }

  // Show visual feedback during processing
  const uploadBtn = document.getElementById("uploadBtn");
  if (uploadBtn) uploadBtn.textContent = "Uploading...";

  const reader = new FileReader();

  // Process the image file once read by the browser
  reader.onload = function(e) {
    // Strip 'data:image/...;base64,' header to leave raw Base64 string
    const base64Data = e.target.result.split(",")[1];

    const payload = {
      action: "uploadImage",
      email: userEmail,
      mimeType: file.type,
      filename: file.name,
      fileData: base64Data
    };

    // Send payload to Google Apps Script backend
    fetch(googleScriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
      if (data.result === "success") {
        alert("Profile picture updated!");
        
        // Update all avatar images across the current page
        updateProfileImages(data.imageUrl);
        
        // Sync new image URL back into LocalStorage
        const user = JSON.parse(localStorage.getItem("userProfile") || "{}");
        user.imageUrl = data.imageUrl;
        localStorage.setItem("userProfile", JSON.stringify(user));
      } else {
        alert("Upload failed: " + data.message);
      }
    })
    .catch(err => {
      console.error("Upload error:", err);
      alert("Error processing upload request.");
    })
    .finally(() => {
      if (uploadBtn) uploadBtn.textContent = "Upload Photo";
      if (fileInput) fileInput.value = ""; // Clear file input buffer
    });
  };

  reader.readAsDataURL(file);
}