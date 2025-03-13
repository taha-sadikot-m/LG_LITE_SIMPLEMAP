const socket = io();
let map, roomId, lastSentData = null;

document.getElementById('create-room').addEventListener('click', async () => {
    try {
        const response = await fetch('/create-room', { method: 'POST' });
        if (!response.ok) throw new Error('Failed to create room');
        
        const data = await response.json();
        roomId = data.room_id;
        
        socket.emit('join_room', {
            room_id: roomId,
            is_master: true
        });

        // Update UI
        document.getElementById('room-code').textContent = roomId;
        document.getElementById('connection-status').textContent = 'Connected';
        document.querySelector('.initial-form').classList.add('hidden');

        // Initialize map
        initializeMap();
    } catch (error) {
        showError(error.message);
    }
});



// Add after map initialization
function initializeControls() {
    // Zoom controls
    document.getElementById('zoom-in').addEventListener('click', () => {
        map.zoomIn();
    });

    document.getElementById('zoom-out').addEventListener('click', () => {
        map.zoomOut();
    });

    // Pan controls
    const panStep = 50; // Adjust sensitivity
    
    document.getElementById('pan-up').addEventListener('click', () => {
        map.panBy([0, -panStep], {duration: 100});
    });

    document.getElementById('pan-down').addEventListener('click', () => {
        map.panBy([0, panStep], {duration: 100});
    });

    document.getElementById('pan-left').addEventListener('click', () => {
        map.panBy([-panStep, 0], {duration: 100});
    });

    document.getElementById('pan-right').addEventListener('click', () => {
        map.panBy([panStep, 0], {duration: 100});
    });

    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        if(e.key === '+') map.zoomIn();
        if(e.key === '-') map.zoomOut();
        if(e.key === 'ArrowUp') map.panBy([0, -panStep]);
        if(e.key === 'ArrowDown') map.panBy([0, panStep]);
        if(e.key === 'ArrowLeft') map.panBy([-panStep, 0]);
        if(e.key === 'ArrowRight') map.panBy([panStep, 0]);
    });
}

// Call this after map initialization
initializeControls();


// Add to static/js/master.js
function initializeTouchControls() {
    let touchStartX = 0;
    let touchStartY = 0;
    const touchThreshold = 30;

    map.getCanvas().addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    });

    map.getCanvas().addEventListener('touchend', (e) => {
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;

        if(Math.abs(dx) > Math.abs(dy)) {
            if(Math.abs(dx) > touchThreshold) {
                map.panBy([dx > 0 ? -100 : 100, 0]);
            }
        } else {
            if(Math.abs(dy) > touchThreshold) {
                map.panBy([0, dy > 0 ? -100 : 100]);
            }
        }
    });
}

// Call this after map initialization
initializeTouchControls();

function initializeMap() {
    map = new maplibregl.Map({
        container: 'map',
        style: 'https://demotiles.maplibre.org/style.json',
        center: [0, 0],
        zoom: 2,
        pitch: 0,
        interactive: true
    });

    const updateViewportMetrics = () => {
        const center = map.getCenter();
        const centerProj = map.project(center);
        const westProj = [centerProj.x - window.innerWidth / 2, centerProj.y];
        const eastProj = [centerProj.x + window.innerWidth / 2, centerProj.y];
        
        const westMercator = maplibregl.MercatorCoordinate.fromLngLat(map.unproject(westProj));
        const eastMercator = maplibregl.MercatorCoordinate.fromLngLat(map.unproject(eastProj));
        return eastMercator.x - westMercator.x;
    };

    const sendUpdate = () => {
        const viewportWidthMeters = updateViewportMetrics();
        const data = {
            room_id: roomId,
            lng: map.getCenter().lng,
            lat: map.getCenter().lat,
            zoom: map.getZoom(),
            bearing: map.getBearing(),
            pitch: map.getPitch(),
            viewportWidthMeters: viewportWidthMeters
        };

        if (JSON.stringify(data) !== JSON.stringify(lastSentData)) {
            socket.emit('view_update', data);
            lastSentData = data;
        }
    };

    map.on('move', () => requestAnimationFrame(sendUpdate));
    window.addEventListener('resize', sendUpdate);
}

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => errorDiv.style.display = 'none', 5000);
}

socket.on('disconnect', () => {
    document.getElementById('connection-status').textContent = 'Disconnected';
});