// SpotiTube - Glassmorphic Dark Music Discovery Engine
// Client-side Application Logic

let player = null;
let isPlayerReady = false;
let isPlaying = false;
let isSeeking = false;
let currentPlaylist = [];
let currentIndex = 0;

// 3-State Repeat: 'off' | 'all' | 'one'
let repeatMode = 'off';

// DOM Elements - Main Layout
const tracksContainer = document.getElementById('tracks-container');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-submit');

// DOM Elements - Bottom Player Controls
const thumbTrigger = document.getElementById('thumb-click-trigger');
const currentThumb = document.getElementById('current-thumb');
const currentTitle = document.getElementById('current-title');
const currentArtist = document.getElementById('current-artist');
const soundWaveBars = document.getElementById('sound-wave-bars');
const btnPlayPause = document.getElementById('btn-play-pause');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const btnRepeat = document.getElementById('btn-repeat');
const repeatBadge = document.getElementById('repeat-badge');
const seekBar = document.getElementById('seek-bar');
const timeCurrent = document.getElementById('time-current');
const timeDuration = document.getElementById('time-duration');
const volumeBar = document.getElementById('volume-bar');
const btnMute = document.getElementById('btn-mute');

// DOM Elements - Glassmorphism Modal Backdrop & Artwork
const modalBackdrop = document.getElementById('modal-backdrop');
const ambientBg = document.getElementById('ambient-bg');
const modalCoverImg = document.getElementById('modal-cover-img');
const modalTrackTitle = document.getElementById('modal-track-title');
const modalTrackArtist = document.getElementById('modal-track-artist');
const btnCloseModal = document.getElementById('btn-close-modal');
const modalSeekBar = document.getElementById('modal-seek-bar');
const modalTimeCurrent = document.getElementById('modal-time-current');
const modalTimeDuration = document.getElementById('modal-time-duration');
const modalBtnPlayPause = document.getElementById('modal-btn-play-pause');
const modalBtnPrev = document.getElementById('modal-btn-prev');
const modalBtnNext = document.getElementById('modal-btn-next');
const modalBtnRepeat = document.getElementById('modal-btn-repeat');
const modalRepeatBadge = document.getElementById('modal-repeat-badge');

// ========================================================
// YouTube IFrame API Initialization
// ========================================================
window.onYouTubeIframeAPIReady = function() {
  player = new YT.Player('yt-player', {
    height: '100%',
    width: '100%',
    videoId: 'W7qX-sI3d5w', // Default curated track
    playerVars: {
      autoplay: 0,
      controls: 0,
      disablekb: 1,
      fs: 0,
      modestbranding: 1,
      rel: 0,
      origin: window.location.origin
    },
    events: {
      onReady: onPlayerReadyHandler,
      onStateChange: onPlayerStateChangeHandler
    }
  });
};

function onPlayerReadyHandler() {
  isPlayerReady = true;
  const badge = document.getElementById('api-status-badge');
  if (badge) badge.textContent = 'YouTube API: Connected';
  startSeekbarLoop();
}

function onPlayerStateChangeHandler(event) {
  if (event.data === YT.PlayerState.PLAYING) {
    isPlaying = true;
    updatePlayPauseUI(true);
    setSoundWaveAnimation(true);
  } else if (event.data === YT.PlayerState.PAUSED) {
    isPlaying = false;
    updatePlayPauseUI(false);
    setSoundWaveAnimation(false);
  } else if (event.data === YT.PlayerState.ENDED) {
    isPlaying = false;
    updatePlayPauseUI(false);
    setSoundWaveAnimation(false);

    if (repeatMode === 'one') {
      player.seekTo(0, true);
      player.playVideo();
    } else {
      playNext();
    }
  }
}

function updatePlayPauseUI(playing) {
  const icon = playing ? '⏸' : '▶';
  if (btnPlayPause) btnPlayPause.textContent = icon;
  if (modalBtnPlayPause) modalBtnPlayPause.textContent = icon;
}

function setSoundWaveAnimation(active) {
  if (!soundWaveBars) return;
  if (active) {
    soundWaveBars.classList.add('playing');
  } else {
    soundWaveBars.classList.remove('playing');
  }
}

// 3-State Repeat: off -> all -> one -> off
function cycleRepeatMode() {
  if (repeatMode === 'off') {
    repeatMode = 'all';
  } else if (repeatMode === 'all') {
    repeatMode = 'one';
  } else {
    repeatMode = 'off';
  }
  updateRepeatUI();
}

function updateRepeatUI() {
  const isActive = repeatMode !== 'off';
  const isOne = repeatMode === 'one';

  [btnRepeat, modalBtnRepeat].forEach(btn => {
    if (!btn) return;
    if (isActive) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  const badgeText = isOne ? '1' : '';
  if (repeatBadge) repeatBadge.textContent = badgeText;
  if (modalRepeatBadge) modalRepeatBadge.textContent = badgeText;
}

// ========================================================
// Glassmorphism Cover Modal Handler
// ========================================================
function openCoverModal() {
  if (!modalBackdrop) return;
  modalBackdrop.classList.add('active');
}

function closeCoverModal() {
  if (!modalBackdrop) return;
  modalBackdrop.classList.remove('active');
}

function setAmbientBackground(imageUrl) {
  if (!ambientBg) return;
  ambientBg.style.backgroundImage = `url('${imageUrl}')`;
}

// Backdrop click closes modal
if (modalBackdrop) {
  modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) {
      closeCoverModal();
    }
  });
}

if (btnCloseModal) {
  btnCloseModal.addEventListener('click', closeCoverModal);
}

// ESC key closes modal
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeCoverModal();
  }
});

// Trigger modal from bottom player artwork or title
if (thumbTrigger) thumbTrigger.addEventListener('click', openCoverModal);
if (currentThumb) currentThumb.addEventListener('click', openCoverModal);
if (currentTitle) currentTitle.addEventListener('click', openCoverModal);

// ========================================================
// Track Discovery & Playback
// ========================================================
async function signSearchHeaders(query) {
  const ts = String(Math.floor(Date.now() / 1000));
  const subtle = window.crypto && window.crypto.subtle;
  if (!subtle) return { 'X-KW-Timestamp': ts };
  try {
    const enc = new TextEncoder();
    const key = await subtle.importKey(
      'raw',
      enc.encode('kw-v1-a8f4c291e5b07d33'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sigBuf = await subtle.sign('HMAC', key, enc.encode(`${ts}:/api/search:${String(query || '').trim()}`));
    const sigHex = Array.from(new Uint8Array(sigBuf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return { 'X-KW-Timestamp': ts, 'X-KW-Signature': sigHex };
  } catch {
    return { 'X-KW-Timestamp': ts };
  }
}

async function fetchTracks(query = '') {
  try {
    const sigHeaders = await signSearchHeaders(query);
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
      headers: { Accept: 'application/json', ...sigHeaders }
    });
    const data = await res.json();
    const items = Array.isArray(data) ? data : (data.tracks || []);
    currentPlaylist = items.map(item => ({
      id: item.id || item.youtubeId,
      youtubeId: item.id || item.youtubeId,
      title: item.title || 'Unknown Title',
      artist: item.channel || item.artist || 'YouTube Music',
      thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
      genre: 'music'
    }));
    renderTracks(currentPlaylist);
  } catch (err) {
    console.error('Failed to load tracks:', err);
  }
}

function renderTracks(tracks) {
  if (!tracksContainer) return;
  tracksContainer.textContent = '';
  if (!tracks.length) {
    const emptyEl = document.createElement('div');
    emptyEl.style.padding = '20px';
    emptyEl.style.color = '#888';
    emptyEl.textContent = 'No tracks found';
    tracksContainer.appendChild(emptyEl);
    return;
  }

  tracks.forEach((track, index) => {
    const row = document.createElement('div');
    row.className = `track-row ${index === currentIndex ? 'active' : ''}`;

    const idxSpan = document.createElement('span');
    idxSpan.textContent = String(index + 1);

    const infoDiv = document.createElement('div');
    infoDiv.className = 't-info';

    const img = document.createElement('img');
    img.className = 't-thumb';
    img.alt = '';
    const rawThumb = String(track.thumbnail || '');
    if (rawThumb.startsWith('https://')) {
      img.src = rawThumb;
    }

    const metaDiv = document.createElement('div');
    const titleDiv = document.createElement('div');
    titleDiv.className = 't-title';
    titleDiv.textContent = String(track.title || 'Unknown Title');

    const artistDiv = document.createElement('div');
    artistDiv.className = 't-artist';
    artistDiv.textContent = String(track.artist || 'Artist');

    metaDiv.appendChild(titleDiv);
    metaDiv.appendChild(artistDiv);
    infoDiv.appendChild(img);
    infoDiv.appendChild(metaDiv);

    const genreDiv = document.createElement('div');
    genreDiv.className = 't-artist';
    genreDiv.textContent = String(track.genre || 'Music');

    const actionDiv = document.createElement('div');
    const playBtn = document.createElement('button');
    playBtn.className = 'btn-play-track';
    playBtn.type = 'button';
    playBtn.textContent = '▶';
    actionDiv.appendChild(playBtn);

    row.appendChild(idxSpan);
    row.appendChild(infoDiv);
    row.appendChild(genreDiv);
    row.appendChild(actionDiv);

    row.addEventListener('click', () => playTrackAtIndex(index));
    tracksContainer.appendChild(row);
  });
}

function playTrackAtIndex(index) {
  if (index < 0 || index >= currentPlaylist.length) return;
  currentIndex = index;
  const track = currentPlaylist[index];

  // Update Bottom Player Bar
  if (currentThumb) currentThumb.src = track.thumbnail;
  if (currentTitle) currentTitle.textContent = track.title;
  if (currentArtist) currentArtist.textContent = track.artist;

  // Update Glassmorphic Modal
  const highRes = `https://i.ytimg.com/vi/${track.youtubeId}/maxresdefault.jpg`;
  if (modalCoverImg) {
    modalCoverImg.src = highRes;
    modalCoverImg.onerror = () => { modalCoverImg.src = track.thumbnail; };
  }
  if (modalTrackTitle) modalTrackTitle.textContent = track.title;
  if (modalTrackArtist) modalTrackArtist.textContent = track.artist;
  setAmbientBackground(track.thumbnail);

  // Play in YouTube IFrame
  if (isPlayerReady && player) {
    player.loadVideoById(track.youtubeId, 0);
    player.playVideo();
  }

  renderTracks(currentPlaylist);
}

function playNext() {
  if (currentIndex < currentPlaylist.length - 1) {
    playTrackAtIndex(currentIndex + 1);
  } else if (repeatMode === 'all' && currentPlaylist.length > 0) {
    playTrackAtIndex(0);
  }
}

function playPrev() {
  if (currentIndex > 0) {
    playTrackAtIndex(currentIndex - 1);
  }
}

// ========================================================
// Playback Seekbar & Time Loop
// ========================================================
function formatTime(seconds) {
  if (isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function startSeekbarLoop() {
  setInterval(() => {
    if (!isPlayerReady || !player || isSeeking || !isPlaying) return;
    try {
      const cur = player.getCurrentTime() || 0;
      const dur = player.getDuration() || 0;

      if (timeCurrent) timeCurrent.textContent = formatTime(cur);
      if (timeDuration) timeDuration.textContent = formatTime(dur);
      if (modalTimeCurrent) modalTimeCurrent.textContent = formatTime(cur);
      if (modalTimeDuration) modalTimeDuration.textContent = formatTime(dur);

      if (dur > 0) {
        const val = (cur / dur) * 100;
        if (seekBar) seekBar.value = val;
        if (modalSeekBar) modalSeekBar.value = val;
      }
    } catch (e) {
      // transient
    }
  }, 500);
}

function handleSeekInput(val) {
  if (isPlayerReady && player) {
    const dur = player.getDuration() || 0;
    const targetSec = (parseFloat(val) / 100) * dur;
    player.seekTo(targetSec, true);
  }
}

// ========================================================
// Event Listeners Wiring
// ========================================================
if (btnPlayPause) {
  btnPlayPause.addEventListener('click', () => {
    if (!isPlayerReady || !player) return;
    if (isPlaying) player.pauseVideo();
    else player.playVideo();
  });
}

if (modalBtnPlayPause) {
  modalBtnPlayPause.addEventListener('click', () => {
    if (btnPlayPause) btnPlayPause.click();
  });
}

if (btnNext) btnNext.addEventListener('click', playNext);
if (modalBtnNext) modalBtnNext.addEventListener('click', playNext);
if (btnPrev) btnPrev.addEventListener('click', playPrev);
if (modalBtnPrev) modalBtnPrev.addEventListener('click', playPrev);

if (btnRepeat) btnRepeat.addEventListener('click', cycleRepeatMode);
if (modalBtnRepeat) modalBtnRepeat.addEventListener('click', cycleRepeatMode);

if (searchBtn && searchInput) {
  searchBtn.addEventListener('click', () => fetchTracks(searchInput.value));
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') fetchTracks(searchInput.value);
  });
}

if (seekBar) {
  seekBar.addEventListener('mousedown', () => { isSeeking = true; });
  seekBar.addEventListener('mouseup', () => {
    isSeeking = false;
    handleSeekInput(seekBar.value);
  });
}

if (modalSeekBar) {
  modalSeekBar.addEventListener('mousedown', () => { isSeeking = true; });
  modalSeekBar.addEventListener('mouseup', () => {
    isSeeking = false;
    handleSeekInput(modalSeekBar.value);
  });
}

if (volumeBar) {
  volumeBar.addEventListener('input', (e) => {
    if (isPlayerReady && player) {
      player.setVolume(parseInt(e.target.value, 10));
    }
  });
}

let isMuted = false;
if (btnMute) {
  btnMute.addEventListener('click', () => {
    if (!isPlayerReady || !player) return;
    if (isMuted) {
      player.unMute();
      btnMute.textContent = '🔊';
      isMuted = false;
    } else {
      player.mute();
      btnMute.textContent = '🔇';
      isMuted = true;
    }
  });
}

// Category Navigation Buttons
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    const genre = e.target.id.replace('nav-', '');
    fetchTracks(genre === 'all' ? '' : genre);
  });
});

// Initial Discover Load
fetchTracks('');
