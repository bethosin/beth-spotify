// Replace with your Spotify app credentials
const clientId = "9013c8d754e743599e5cee871de9fd83";
const redirectUri = "http://127.0.0.1:5500/index.html"; // Change when deployed
const scopes = "user-top-read user-read-email user-read-private";

let accessToken = "";

// Redirect user to Spotify login
const loginWithSpotify = () => {
  const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=${encodeURIComponent(scopes)}`;
  window.location.href = authUrl;
};

// Logout: clear token & reload page
const logoutFromSpotify = () => {
  accessToken = "";
  localStorage.removeItem("spotify_token");
  location.reload();
};

// Extract token from URL after redirect
const getTokenFromUrl = () => {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  return params.get("access_token");
};

// Fetch wrapper
const fetchWebApi = async (endpoint, method, body) => {
  try {
    const res = await fetch(`https://api.spotify.com/${endpoint}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      method,
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`Error: ${res.status} ${res.statusText}`);

    return await res.json();
  } catch (error) {
    console.log(error);
    alert("Something went wrong. Please try again later.");
  }
};

// Get user profile
const getUserProfile = async () => {
  return await fetchWebApi("v1/me", "GET");
};

// Get user’s top tracks
const getTopTracks = async () => {
  const result = await fetchWebApi(
    "v1/me/top/tracks?time_range=long_term&limit=6",
    "GET"
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
const playPreview = (url) => {
  if (audio) {
    audio.pause();
    audio = null;
  }
  audio = new Audio(url);
  audio.play();
};

// Show user info in navbar
const showUser = (user) => {
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
};

// Initialize app
const initApp = async () => {
  // Show spinner at start
  document.getElementById("loading").style.display = "block";
  document.getElementById("tracks").style.display = "none";

  // Check local storage first
  accessToken = localStorage.getItem("spotify_token");

  // If redirected back with token, save it
  const tokenFromUrl = getTokenFromUrl();
  if (tokenFromUrl) {
    accessToken = tokenFromUrl;
    localStorage.setItem("spotify_token", accessToken);
    window.location.hash = ""; // clean URL
  }

  const userSection = document.getElementById("userSection");

  if (accessToken) {
    try {
      const user = await getUserProfile();
      showUser(user);

      const tracks = await getTopTracks();
      displayTracks(tracks);

      // Hide spinner after loading
      document.getElementById("loading").style.display = "none";
      document.getElementById("tracks").style.display = "flex";
    } catch (error) {
      console.log("Error loading user data", error);
      logoutFromSpotify();
    }
  } else {
    // Show login button if not logged in
    userSection.innerHTML = `<button class="btn btn-spotify px-4 py-2" onclick="loginWithSpotify()">Login with Spotify</button>`;
    document.getElementById("loading").style.display = "none";
  }
};
