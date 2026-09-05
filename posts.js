document.addEventListener("DOMContentLoaded", function() {
  // Uses the URL defined in profile.js safely
  const apiUrl = window.googleScriptUrl || googleScriptUrl;

  const userEmail = localStorage.getItem("userEmail");
  const storedUser = JSON.parse(localStorage.getItem("userProfile") || "{}");
  
  const isProfilePage = window.location.pathname.toLowerCase().includes("accountprofile.html");

  // 1. Fetch Posts on Page Load
  fetchPosts(isProfilePage ? userEmail : null);

  // 2. Attach Event Listener to Post Button
  const postBtn = document.getElementById("postBtn");
  const contentInput = document.getElementById("postContent");

  if (postBtn) {
    postBtn.addEventListener("click", function(e) {
      e.preventDefault();
      
      const content = contentInput ? contentInput.value.trim() : "";

      if (!content) {
        alert("Please write something before posting!");
        return;
      }

      if (!userEmail) {
        alert("No logged in user found. Please re-login.");
        return;
      }

      const payload = {
        action: "createPost",
        email: userEmail,
        fullname: storedUser.fullname || "User",
        imageUrl: storedUser.imageUrl || "",
        content: content
      };

      fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload)
      })
      .then(res => res.json())
      .then(data => {
        if (data.result === "success") {
          contentInput.value = ""; // Clear input field
          fetchPosts(isProfilePage ? userEmail : null); // Refresh feed
        } else {
          alert("Failed to post: " + data.message);
        }
      })
      .catch(err => {
        console.error("Fetch error while posting:", err);
        alert("Error submitting post. Check browser console.");
      });
    });
  }
});

// Helper: Fetch posts from Google Sheets
function fetchPosts(filterEmail) {
  const apiUrl = window.googleScriptUrl || googleScriptUrl;
  let url = apiUrl + "?action=fetchPosts";
  
  if (filterEmail) {
    url += "&email=" + encodeURIComponent(filterEmail);
  }

  fetch(url)
    .then(res => res.json())
    .then(data => {
      if (data.result === "success") {
        renderFeed(data.posts);
      }
    })
    .catch(err => console.error("Error fetching posts:", err));
}

// Helper: Dynamically generate post elements in feedContainer
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
    postDiv.style.marginBottom = "10px";

    const avatarSrc = post.imageUrl ? post.imageUrl : "Profile-Placeholder.png";

    postDiv.innerHTML = `
      <div class="post-header" style="display: flex; align-items: center; gap: 10px;">
        <img src="${avatarSrc}" class="profile-pic" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
        <div>
          <h4 style="margin: 0;">${post.fullname}</h4>
          <small style="color: gray;">${post.timestamp ? new Date(post.timestamp).toLocaleString() : ""}</small>
        </div>
      </div>
      <div class="post-body" style="margin-top: 10px;">
        <h1>${post.content}</h1>
      </div>
    `;

    feedContainer.appendChild(postDiv);
  });
}