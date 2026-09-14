document.addEventListener("DOMContentLoaded", function() {
  const apiUrl = window.googleScriptUrl || googleScriptUrl;
  const userEmail = localStorage.getItem("userEmail");
  const storedUser = JSON.parse(localStorage.getItem("userProfile") || "{}");
  const isProfilePage = window.location.pathname.toLowerCase().includes("accountprofile.html");

  fetchPosts(isProfilePage ? userEmail : null);

  // Modal Controls
  const modal = document.getElementById("postModal");
  const openBtn = document.getElementById("openModalBtn");
  const closeBtn = document.getElementById("closeModalBtn");
  const submitBtn = document.getElementById("submitModalPostBtn");

  if (openBtn) openBtn.onclick = () => modal.style.display = "block";
  if (closeBtn) closeBtn.onclick = () => modal.style.display = "none";

  if (submitBtn) {
    submitBtn.addEventListener("click", function() {
      const content = document.getElementById("modalContent").value.trim();
      const category = document.getElementById("modalCategory").value;
      const postType = document.getElementById("modalPostType").value;
      const fileInput = document.getElementById("modalImageInput");
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
        document.getElementById("modalContent").value = "";
        document.getElementById("modalImageInput").value = "";
        fetchPosts(isProfilePage ? userEmail : null);
      } else {
        alert("Failed to post: " + data.message);
      }
    });
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
    postDiv.style.cssText = "border:1px solid #333; padding:15px; margin-bottom:15px; border-radius:8px;";

    const avatarSrc = post.userImageUrl ? post.userImageUrl : "Profile-Placeholder.png";
    const postImgTag = post.postImageUrl ? `<img src="${post.postImageUrl}" style="max-width:100%; border-radius:5px; margin-top:10px;">` : "";

    // Comments list HTML
    let commentsHtml = "";
    if (post.comments && post.comments.length > 0) {
      post.comments.forEach(c => {
        commentsHtml += `<div style="font-size:12px; margin-top:4px;"><b>${c.fullname}:</b> ${c.comment}</div>`;
      });
    }

    postDiv.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px;">
        <img src="${avatarSrc}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">
        <div>
          <h4 style="margin:0;">${post.fullname}</h4>
          <span style="font-size:10px; background:#444; padding:2px 6px; border-radius:4px;">${post.category}</span>
          <span style="font-size:10px; background:#007bff; padding:2px 6px; border-radius:4px;">${post.postType}</span>
        </div>
      </div>
      <p style="margin-top:10px;">${post.content}</p>
      ${postImgTag}
      
      <div style="margin-top:15px; border-top:1px solid #333; padding-top:10px;">
        <div id="comments-list-${post.postId}">${commentsHtml}</div>
        <div style="display:flex; gap:5px; margin-top:8px;">
          <input type="text" id="input-${post.postId}" placeholder="Write a comment..." style="flex:1;">
          <button onclick="submitComment('${post.postId}')">Comment</button>
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
      commentsList.innerHTML += `<div style="font-size:12px; margin-top:4px;"><b>${payload.fullname}:</b> ${commentText}</div>`;
    }
  });
}