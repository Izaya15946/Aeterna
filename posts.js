document.addEventListener("DOMContentLoaded", function() {
  const apiUrl = window.googleScriptUrl || googleScriptUrl;
  const userEmail = localStorage.getItem("userEmail");
  const storedUser = JSON.parse(localStorage.getItem("userProfile") || "{}");
  const isProfilePage = window.location.pathname.toLowerCase().includes("accountprofile.html");

  fetchPosts(isProfilePage ? userEmail : null);

  // Modal & Preview Controls
  const modal = document.getElementById("postModal");
  const openBtn = document.getElementById("openModalBtn");
  const closeBtn = document.getElementById("closeModalBtn");
  const submitBtn = document.getElementById("submitModalPostBtn");
  const fileInput = document.getElementById("modalImageInput");
  const previewContainer = document.getElementById("imagePreviewContainer");
  const previewImg = document.getElementById("imagePreview");

  if (openBtn) openBtn.onclick = () => modal.style.display = "block";
  if (closeBtn) closeBtn.onclick = () => {
    modal.style.display = "none";
    resetModalFields();
  };

  // Image Live Preview Event
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
        alert("Add text or select an image.");
        return;
      }

      submitBtn.innerText = "Posting...";
      submitBtn.disabled = true;

      const payload = {
        action: "createPost",
        email: userEmail,
        fullname: storedUser.fullname || "User",
        userImageUrl: storedUser.imageUrl || "",
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
    });
  }

  function resetModalFields() {
    document.getElementById("modalContent").value = "";
    if (fileInput) fileInput.value = "";
    if (previewContainer) previewContainer.style.display = "none";
    if (previewImg) previewImg.src = "";
  }
});

function fetchPosts(filterEmail) {
  const apiUrl = window.googleScriptUrl || googleScriptUrl;
  let url = apiUrl + "?action=fetchPosts";
  if (filterEmail) url += "&email=" + encodeURIComponent(filterEmail);

  fetch(url)
    .then(res => res.json())
    .then(data => {
      if (data.result === "success") renderFeed(data.posts);
    });
}

function renderFeed(posts) {
  const feedContainer = document.getElementById("feedContainer");
  if (!feedContainer) return;
  feedContainer.innerHTML = "";

  if (!posts || posts.length === 0) {
    feedContainer.innerHTML = "<p style='color: gray; text-align: center;'>No posts yet.</p>";
    return;
  }

  posts.forEach(post => {
    const postDiv = document.createElement("div");
    postDiv.className = "container-post";

    const avatarSrc = post.userImageUrl ? post.userImageUrl : "Profile-Placeholder.png";
    const postImgTag = post.postImageUrl ? `<img src="${post.postImageUrl}" style="max-width:100%; border-radius:8px; margin-top:10px;">` : "";

    // Build comment list with commenter profile pictures
    let commentsHtml = "";
    if (post.comments && post.comments.length > 0) {
      post.comments.forEach(c => {
        const commenterAvatar = c.imageUrl ? c.imageUrl : "Profile-Placeholder.png";
        commentsHtml += `
          <div class="comment-item">
            <img src="${commenterAvatar}" class="comment-avatar">
            <div class="comment-content">
              <span class="comment-author">${c.fullname}</span>
              <span>${c.comment}</span>
            </div>
          </div>
        `;
      });
    }

    postDiv.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px;">
        <img src="${avatarSrc}" class="profile-pic" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">
        <div>
          <h4 style="margin:0;">${post.fullname}</h4>
          <div style="display:flex; gap:6px; margin-top:4px;">
            <span style="font-size:10px; background:#26262e; color:#00ffc8; padding:2px 8px; border-radius:12px;">${post.category}</span>
            <span style="font-size:10px; background:#00ffc8; color:#0f0f11; font-weight:bold; padding:2px 8px; border-radius:12px;">${post.postType}</span>
          </div>
        </div>
      </div>
      <p style="margin-top:12px; font-size:15px; color:#e1e1e6; line-height:1.4;">${post.content}</p>
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

  if (!commentText) return;

  const payload = {
    action: "addComment",
    postId: postId,
    fullname: storedUser.fullname || "User",
    imageUrl: storedUser.imageUrl || "",
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
      const commenterAvatar = payload.imageUrl ? payload.imageUrl : "Profile-Placeholder.png";
      
      commentsList.innerHTML += `
        <div class="comment-item">
          <img src="${commenterAvatar}" class="comment-avatar">
          <div class="comment-content">
            <span class="comment-author">${payload.fullname}</span>
            <span>${commentText}</span>
          </div>
        </div>
      `;
    }
  });
}