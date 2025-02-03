<script>
  import { onMount } from 'svelte';
  import 'leaflet/dist/leaflet.css';
  

  const mediaFiles = [
    'photo1.webp',
    'photo2.jpg',
    'photo3.png',
    'video1.mp4',
    'audio1.mp3',
    'video2.webm',
    'photo4.gif'
  ];

  let gifts = mediaFiles.map(file => {
    const extension = file.split('.').pop().toLowerCase();
    let type = '';

    if (['jpg', 'png', 'gif', 'webp'].includes(extension)) {
      type = 'image';
    } else if (['mp4', 'webm'].includes(extension)) {
      type = 'video';
    } else if (['mp3', 'wav'].includes(extension)) {
      type = 'audio';
    }

    return {
      file,
      type,
      unlocked: false
    };
  });

  // Load gift status from localStorage
  function loadGiftStatus() {
    const savedGifts = localStorage.getItem('gifts');
    if (savedGifts) {
      gifts = JSON.parse(savedGifts);
    }
  }

  // Save gift status to localStorage
  function saveGiftStatus() {
    localStorage.setItem('gifts', JSON.stringify(gifts));
  }

  // Reset all gift statuses and clear localStorage
  function resetGiftStatus() {
    gifts = gifts.map(gift => ({ ...gift, unlocked: false }));
    localStorage.removeItem('gifts');
  }

  let lastUnlockTime = null;
  const cooldownDuration = 0.5 * 60 * 1000;
  let remainingCooldown = 0;

  let map;
  let userMarker;
  let pinMarker;
  let distance = 0;
  const pinCoords = [37.386051, -122.083855];

  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of Earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  }

  function unlockGift() {
    const unlockedGifts = gifts.filter(gift => gift.unlocked).length;
    if (unlockedGifts >= gifts.length) return;

    lastUnlockTime = Date.now();
    const index = gifts.findIndex(gift => !gift.unlocked);

    if (index !== -1) {
      gifts = [
        ...gifts.slice(0, index),
        { ...gifts[index], unlocked: true, timestamp: Date.now() },
        ...gifts.slice(index + 1),
      ];
      saveGiftStatus();
    }
  }

  function updateCooldown() {
    if (!lastUnlockTime) {
      remainingCooldown = 0;
    } else {
      const elapsed = Date.now() - lastUnlockTime;
      remainingCooldown = cooldownDuration - elapsed;
      if (remainingCooldown < 0) {
        remainingCooldown = 0;
      }
    }
  }

  function formatCooldown() {
    const minutes = Math.floor(remainingCooldown / 60000);
    const seconds = Math.floor((remainingCooldown % 60000) / 1000);
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }

  function updateDistance(userCoords) {
    distance = calculateDistance(userCoords[0], userCoords[1], pinCoords[0], pinCoords[1]).toFixed(2);
    if (distance <= .1 && remainingCooldown === 0) {
      unlockGift();
    }
  }

  onMount(async () => {
    loadGiftStatus(); // Load gift status when the component is mounted

    const L = await import('leaflet');

    map = L.map('map').setView([0, 0], 13);
    delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userCoords = [position.coords.latitude, position.coords.longitude];
          map.setView(userCoords, 13);
          userMarker = L.marker(userCoords).addTo(map);
          userMarker.bindPopup('Your Location').openPopup();
          pinMarker = L.marker(pinCoords).addTo(map);
          pinMarker.bindPopup('Pin Location').openPopup();

          setInterval(() => {
            updateDistance(userCoords);
            updateCooldown();
          }, 1000);
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    } else {
      console.error('Geolocation is not supported by this browser.');
    }
  });

  let selectedGift = null;

  function viewGift(gift) {
    if (gift.unlocked) {
      selectedGift = gift;
    } else {
      alert("This gift is locked!");
    }
  }
</script>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
/* Body and overall page styles */
body {
  font-family: 'Inter', sans-serif;
  color: #333;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  height: 100vh;
  margin: 0;
}

/* Container layout */
.container {
  display: flex;
  flex-direction: column;
  height: 100vh; /* Full screen height */
  overflow: hidden; /* Prevent overflow from affecting the overall layout */
}

/* Map section styles */
.map {
  height: 60vh; /* Map takes up 60% of the screen height */
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px; /* Space between map and gifts */
}

#map {
  height: 100%; /* Full height of the map container */
}

/* Distance and cooldown overlays */
.distance {
  position: absolute;
  top: 10px;
  left: 50px;
  background: rgba(255, 255, 255, 0.9);
  color: #333;
  padding: 10px 15px;
  font-size: 1em;
  border-radius: 8px;
  font-family: 'Inter', sans-serif;
  z-index: 1000;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.cooldown {
  position: absolute;
  bottom: 10px;
  left: 50px;
  background: rgba(255, 255, 255, 0.9);
  color: #333;
  padding: 10px 15px;
  font-size: 1em;
  border-radius: 8px;
  font-family: 'Inter', sans-serif;
  z-index: 1000;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Gifts section styles */
.gifts {
  flex: 1; /* Takes up the remaining space */
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
  margin-top: 20px;
  overflow-y: auto; /* Allows scrolling if there are more gifts than can fit */
  padding-bottom: 20px; /* Add some padding to the bottom for scroll */
}

/* Gift item styles */
.gift {
  background-color: #FCFCFC;
  border: 0.5px solid #e0e0e0;
  border-radius: 10px;
  padding: 15px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  font-family: 'Inter', sans-serif;
  font-size: 1em;
  color: #333;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  aspect-ratio: 1 / 1;
  text-align: center;
}

.gift.unlocked {
  background-color: #FCFCFC;
  border-color: #e0e0e0;
}

.gift:hover {
  transform: translateY(-5px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.gift .emoji {
  font-size: 4em;
  margin-bottom: 10px;
}

.gift .name {
  font-size: 0.9em;
  margin-bottom: 5px;
}

.gift .cooldown {
  font-size: 0.8em;
  color: #666;
}

/* Reset button styles */
.reset-button {
  background-color: #FF4D4D;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.2em;
  font-weight: 600;
  margin-top: 20px;
  width: 100%;
}

.reset-button:hover {
  background-color: #FF2A2A;
}

</style>

<div class="container">
  <!-- Map Section -->
  <div class="map">
    <div id="map"></div>
    <div class="distance">
      Distance to Pin: {distance} km
    </div>
    {#if lastUnlockTime && remainingCooldown > 0}
      <div class="cooldown">
        Next gift unlocks in: {formatCooldown()}
      </div>
    {/if}
  </div>

  <!-- Gifts Section -->
  <div class="gifts">
    {#each gifts as gift, index}
      <div class="gift {gift.unlocked ? 'unlocked' : ''}" on:click={() => viewGift(gift)}>
        <div class="emoji">{gift.unlocked ? '🎁' : '🔒'}</div>
        <div class="name">
          {gift.unlocked ? gift.file : (index === gifts.findIndex((gift) => !gift.unlocked) ? formatCooldown() : 'Locked')}
        </div>
      </div>
    {/each}
  </div>

  <!-- Reset Button -->
  <button class="reset-button" on:click={resetGiftStatus}>
    Reset Gifts
  </button>
</div>

{#if selectedGift}
  <div class="modal" on:click={() => selectedGift = null}>
    {#if selectedGift.type === 'image'}
      <img src={`/media/${selectedGift.file}`} alt="Gift" />
    {/if}
    {#if selectedGift.type === 'video'}
      <video controls>
        <source src={`/media/${selectedGift.file}`} type="video/mp4" />
      </video>
    {/if}
    {#if selectedGift.type === 'audio'}
      <audio controls>
        <source src={`/media/${selectedGift.file}`} type="audio/mp3" />
      </audio>
    {/if}
  </div>
{/if}
