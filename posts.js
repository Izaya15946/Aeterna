document.addEventListener("DOMContentLoaded", function() {
  const apiUrl = window.googleScriptUrl || googleScriptUrl;
  const userEmail = localStorage.getItem("userEmail");
  const storedUser = JSON.parse(localStorage.getItem("userProfile") || "{}");
  const isProfilePage = window.location.pathname.toLowerCase().includes("accountprofile.html");

  // Dynamically pull avatar from DOM or localStorage keys
  const currentUserAvatar = storedUser.imageUrl || storedUser.profilePic || storedUser.picture || document.querySelector(".prof-img")?.src || document.querySelector(".profile-pic")?.src || "";

  // Update the create-post bar avatar on load if present
  const barAvatar = document.querySelector(".create-post-bar img");
  if (barAvatar && currentUserAvatar) {
    barAvatar.src = currentUserAvatar;
  }

  fetchPosts(isProfilePage ? userEmail : null);

  // Modal & Elements
  const modal = document.getElementById("postModal");
  const openBtn = document.getElementById("openModalBtn");
  const closeBtn = document.getElementById("closeModalBtn");
  const submitBtn = document.getElementById("submitModalPostBtn");
  const fileInput = document.getElementById("modalImageInput");
  const previewContainer = document.getElementById("imagePreviewContainer");
  const previewImg = document.getElementById("imagePreview");

  if (openBtn && modal) {
    openBtn.onclick = () => {
      modal.style.display = "flex";
    };
  }

  if (closeBtn && modal) {
    closeBtn.onclick = () => {
      modal.style.display = "none";
      resetModalFields();
    };
  }

  if (fileInput) {
    fileInput.addEventListener("change", function() {
      const file = this.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
          previewImg.src = e.target.result;
          previewContainer.style.display = "block";
        };
        reader.readAsDataURL(file);
      } else {
        previewContainer.style.display = "none";
        previewImg.src = "";
      }
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener("click", function() {
      const content = document.getElementById("modalContent").value.trim();
      const category = document.getElementById("modalCategory").value;
      const postType = document.getElementById("modalPostType").value;
      const file = fileInput.files[0];

      if (!content && !file) {
        alert("Please add text or select an image.");
        return;
      }

      submitBtn.innerText = "Posting...";
      submitBtn.disabled = true;

      const payload = {
        action: "createPost",
        email: userEmail,
        fullname: storedUser.fullname || document.querySelector(".prof-name")?.innerText || "User",
        userImageUrl: currentUserAvatar,
        content: content,
        category: category,
        postType: postType
      };

      if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
          payload.fileData = e.target.result.split(",")[1];
          payload.filename = file.name;
          payload.mimeType = file.type;
          sendPostPayload(payload);
        };
        reader.readAsDataURL(file);
      } else {
        sendPostPayload(payload);
      }
    });
  }

  function sendPostPayload(payload) {
    fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
      submitBtn.innerText = "Post";
      submitBtn.disabled = false;
      if (data.result === "success") {
        modal.style.display = "none";
        resetModalFields();
        fetchPosts(isProfilePage ? userEmail : null);
      } else {
        alert("Failed to post: " + data.message);
      }
    })
    .catch(err => {
      console.error(err);
      submitBtn.innerText = "Post";
      submitBtn.disabled = false;
      alert("An error occurred while creating the post.");
    });
  }

  function resetModalFields() {
    document.getElementById("modalContent").value = "";
    if (fileInput) fileInput.value = "";
    if (previewContainer) previewContainer.style.display = "none";
    if (previewImg) previewImg.src = "";
  }
});

// Global post management & filtering
let globalPosts = [];
let activeFilters = {
  category: "All",
  postType: "All"
};

function fetchPosts(filterEmail) {
  const apiUrl = window.googleScriptUrl || googleScriptUrl;
  let url = apiUrl + "?action=fetchPosts";
  if (filterEmail) url += "&email=" + encodeURIComponent(filterEmail);

  fetch(url)
    .then(res => res.json())
    .then(data => {
      if (data.result === "success") {
        globalPosts = data.posts;
        applyFiltersAndRender();
      }
    });
}

function filterPosts(type, value) {
  activeFilters[type] = value;
  const sidebarClass = type === 'postType' ? '.leftsidebar' : '.rightsidebar';
  document.querySelectorAll(`${sidebarClass} .filter-btn`).forEach(btn => {
    if (btn.innerText.trim() === value || (value === 'All' && btn.innerText.includes('All'))) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  applyFiltersAndRender();
}

function applyFiltersAndRender() {
  const filtered = globalPosts.filter(post => {
    const matchCategory = activeFilters.category === "All" || post.category === activeFilters.category;
    const matchType = activeFilters.postType === "All" || post.postType === activeFilters.postType;
    return matchCategory && matchType;
  });

  renderFeed(filtered);
}

function renderFeed(posts) {
  const feedContainer = document.getElementById("feedContainer");
  if (!feedContainer) return;
  feedContainer.innerHTML = "";

  if (!posts || posts.length === 0) {
    feedContainer.innerHTML = "<p style='color: gray; text-align: center; margin-top: 20px;'>No posts yet.</p>";
    return;
  }

  // Fallback SVG string if no profile image URL is present
  const defaultAvatar = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23a0a0b0'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm0 14c-2.03 0-3.8-1.04-4.84-2.6.03-.99 2.01-1.53 3.34-1.53 1.33 0 3.31.54 3.34 1.53-1.04 1.56-2.81 2.6-4.84 2.6z'/></svg>";

  posts.forEach(post => {
    const postDiv = document.createElement("div");
    postDiv.className = "container-post";

    // Checks post.userImageUrl, post.imageUrl, and fallback SVG
    const avatarSrc = (post.userImageUrl && post.userImageUrl !== "") 
      ? post.userImageUrl 
      : (post.imageUrl && post.imageUrl !== "") 
        ? post.imageUrl 
        : defaultAvatar;

    const postImgTag = post.postImageUrl 
      ? `<div class="post-image-wrapper">
          <img src="${post.postImageUrl}" class="post-image" alt="Post artwork" style="cursor: pointer;" onclick="openLightbox('${post.postImageUrl}')">
        </div>` 
      : "";

    const isSelling = post.postType === "Selling";
    const postTypeStyle = isSelling
      ? "background: #ff4d4d; color: #ffffff;"
      : "background: #00ffc8; color: #0f0f11;";

    let commentsHtml = "";
    if (post.comments && post.comments.length > 0) {
      post.comments.forEach(c => {
        const commenterAvatar = (c.imageUrl && c.imageUrl !== "") 
          ? c.imageUrl 
          : (c.userImageUrl && c.userImageUrl !== "")
            ? c.userImageUrl
            : defaultAvatar;

        commentsHtml += `
          <div class="comment-item">
            <img src="${commenterAvatar}" class="comment-avatar" alt="${c.fullname}">
            <div class="comment-content">
              <span class="comment-author">${c.fullname}</span>
              <span>${c.comment}</span>
            </div>
          </div>
        `;
      });
    }

    postDiv.innerHTML = `
      <div style="display:flex; align-items:center; gap:12px;">
        <img src="${avatarSrc}" class="profile-pic" style="width:44px; height:44px; border-radius:50%; object-fit:cover;">
        <div>
          <h4 style="margin:0; color:#fff;">${post.fullname}</h4>
          <div style="display:flex; gap:8px; margin-top:6px;">
            <span style="font-size:13px; font-weight:600; background:#26262e; color:#00ffc8; padding:4px 10px; border-radius:12px;">${post.category}</span>
            <span style="font-size:13px; font-weight:bold; ${postTypeStyle} padding:4px 10px; border-radius:12px;">${post.postType}</span>
          </div>
        </div>
      </div>
      <p class="post-text">${post.content}</p>
      ${postImgTag}
      
      <div style="margin-top:15px; border-top:1px solid #2a2a30; padding-top:10px;">
        <div id="comments-list-${post.postId}">${commentsHtml}</div>
        <div class="comment-box-container">
          <input type="text" id="input-${post.postId}" placeholder="Write a comment...">
          <button type="button" onclick="submitComment('${post.postId}')">Comment</button>
        </div>
      </div>
    `;

    feedContainer.appendChild(postDiv);
  });
}

function submitComment(postId) {
  const apiUrl = window.googleScriptUrl || googleScriptUrl;
  const input = document.getElementById(`input-${postId}`);
  const commentText = input.value.trim();
  const storedUser = JSON.parse(localStorage.getItem("userProfile") || "{}");
  const defaultAvatar = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23a0a0b0'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm0 14c-2.03 0-3.8-1.04-4.84-2.6.03-.99 2.01-1.53 3.34-1.53 1.33 0 3.31.54 3.34 1.53-1.04 1.56-2.81 2.6-4.84 2.6z'/></svg>";

  if (!commentText) return;

  const currentAvatar = storedUser.imageUrl || storedUser.profilePic || storedUser.picture || document.querySelector(".prof-img")?.src || "";

  const payload = {
    action: "addComment",
    postId: postId,
    fullname: storedUser.fullname || document.querySelector(".prof-name")?.innerText || "User",
    imageUrl: currentAvatar,
    comment: commentText
  };

  fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify(payload)
  })
  .then(res => res.json())
  .then(data => {
    if (data.result === "success") {
      input.value = "";
      const commentsList = document.getElementById(`comments-list-${postId}`);
      const commenterAvatar = (payload.imageUrl && payload.imageUrl !== "") ? payload.imageUrl : defaultAvatar;
      
      commentsList.innerHTML += `
        <div class="comment-item">
          <img src="${commenterAvatar}" class="comment-avatar" alt="${payload.fullname}">
          <div class="comment-content">
            <span class="comment-author">${payload.fullname}</span>
            <span>${commentText}</span>
          </div>
        </div>
      `;
    }
  });
}

function openLightbox(imageSrc) {
  const lightbox = document.getElementById("imageLightbox");
  const lightboxImg = document.getElementById("lightboxImg");
  if (lightbox && lightboxImg) {
    lightboxImg.src = imageSrc;
    lightbox.style.display = "flex";
  }
}

function closeLightbox() {
  const lightbox = document.getElementById("imageLightbox");
  if (lightbox) {
    lightbox.style.display = "none";
  }
}
