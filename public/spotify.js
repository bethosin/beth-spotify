// =====================
// Frontend Spotify JS
// =====================

const clientId = "9013c8d754e743599e5cee871de9fd83";
const redirectUri = "https://beth-spotify.vercel.app/"; // deployed URL
const scopes = "user-top-read user-read-email user-read-private";

let accessToken = "";

// Generate random string for PKCE verifier
function generateRandomString(length) {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const values = crypto.getRandomValues(new Uint8Array(length));
  values.forEach((v) => (result += charset[v % charset.length]));
  return result;
}

// Base64 URL encode
function base64urlencode(a) {
  return btoa(String.fromCharCode.apply(null, new Uint8Array(a)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// SHA256 for PKCE challenge
async function sha256(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  return await crypto.subtle.digest("SHA-256", data);
}

// Redirect user to Spotify login
async function loginWithSpotify() {
  const verifier = generateRandomString(128);
  const challenge = base64urlencode(await sha256(verifier));
  localStorage.setItem("code_verifier", verifier);

  const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${clientId}&scope=${encodeURIComponent(
    scopes
  )}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&code_challenge_method=S256&code_challenge=${challenge}`;

  window.location.href = authUrl;
}

// Exchange authorization code for access token via serverless API
async function getAccessToken(code) {
  const verifier = localStorage.getItem("code_verifier");

  const response = await fetch("../api/callback.js", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, verifier, redirectUri }),
  });

  if (!response.ok) {
    const errData = await response.json();
    console.error(errData);
    throw new Error("Token exchange failed");
  }

  const data = await response.json();
  localStorage.setItem("spotify_token", data.access_token);
  return data.access_token;
}

// Logout
function logoutFromSpotify() {
  accessToken = "";
  localStorage.removeItem("spotify_token");
  location.reload();
}

// Fetch wrapper
const fetchWebApi = async (endpoint, method = "GET", body = null) => {
  try {
    const res = await fetch(`https://api.spotify.com/${endpoint}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      method,
      body: body ? JSON.stringify(body) : null,
    });
    if (!res.ok) throw new Error(`Error: ${res.status} ${res.statusText}`);
    return await res.json();
  } catch (err) {
    console.error(err);
    alert("Something went wrong. Please try again later.");
  }
};

// Get user profile
const getUserProfile = async () => await fetchWebApi("v1/me");

// Get top tracks
const getTopTracks = async () => {
  const result = await fetchWebApi(
    "v1/me/top/tracks?time_range=long_term&limit=6"
  );
  return result.items;
};

// Display tracks
const displayTracks = (tracks) => {
  const container = document.getElementById("tracks");
  container.innerHTML = "";

  if (!tracks || tracks.length === 0) {
    container.innerHTML = `<p class="text-center text-muted">No top tracks found.</p>`;
    return;
  }

  tracks.forEach((track) => {
    const artists = track.artists.map((a) => a.name).join(", ");
    const preview = track.preview_url
      ? `<button class="btn btn-spotify mt-2" onclick="playPreview('${track.preview_url}')">▶ Play Preview</button>`
      : `<p class="text-danger mt-2">No preview available</p>`;

    container.innerHTML += `
      <div class="col-md-4 col-sm-6">
        <div class="track-card p-3 h-100 text-center">
          <img src="${track.album.images[0].url}" alt="${track.name}" class="track-img mb-3">
          <h5>${track.name}</h5>
          <p class="text-muted">${artists}</p>
          ${preview}
        </div>
      </div>
    `;
  });
};

// Play preview audio
let audio = null;
function playPreview(url) {
  if (audio) audio.pause();
  audio = new Audio(url);
  audio.play();
}

// Show user info in navbar
function showUser(user) {
  const userSection = document.getElementById("userSection");
  const profilePic =
    user.images && user.images.length > 0
      ? user.images[0].url
      : "https://via.placeholder.com/40";

  userSection.innerHTML = `
    <img src="${profilePic}" alt="Profile" class="profile-pic">
    <span class="me-3">${user.display_name || "Spotify User"}</span>
    <button class="btn btn-danger btn-sm" onclick="logoutFromSpotify()">Logout</button>
  `;
}

// Initialize app
const initApp = async () => {
  document.getElementById("loading").style.display = "block";
  document.getElementById("tracks").style.display = "none";

  accessToken = localStorage.getItem("spotify_token");

  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");

  if (code && !accessToken) {
    try {
      accessToken = await getAccessToken(code);
      window.history.replaceState({}, document.title, "/"); // clean URL
    } catch (err) {
      console.error(err);
      alert("Login failed. Please try again.");
    }
  }

  const userSection = document.getElementById("userSection");

  if (accessToken) {
    try {
      const user = await getUserProfile();
      showUser(user);

      const tracks = await getTopTracks();
      displayTracks(tracks);

      document.getElementById("loading").style.display = "none";
      document.getElementById("tracks").style.display = "flex";
    } catch (err) {
      console.error(err);
      logoutFromSpotify();
    }
  } else {
    userSection.innerHTML = `<button class="btn btn-spotify px-4 py-2" onclick="loginWithSpotify()">Login with Spotify</button>`;
    document.getElementById("loading").style.display = "none";
  }
};

// Run on load
window.onload = initApp;
