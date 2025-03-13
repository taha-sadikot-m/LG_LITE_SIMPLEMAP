const socket = io();
let map, roomId, position;

document.getElementById('join-room').addEventListener('click', () => {
    roomId = document.getElementById('room-code-input').value.trim().toUpperCase();
    if (!roomId) {
        showError('Please enter a room code');
        return;
    }

    socket.emit('join_room', {
        room_id: roomId,
        is_master: false
    });
});

document.querySelectorAll('.grid-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        position = parseInt(this.dataset.position);
        document.querySelectorAll('.grid-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        document.getElementById('node-position').textContent = this.textContent;
        initializeMap();
    });
});

function initializeMap() {
    document.querySelectorAll('.initial-form').forEach(form => form.classList.add('hidden'));
    
    map = new maplibregl.Map({
        container: 'map',
        style: 'https://demotiles.maplibre.org/style.json',
        interactive: false
    });

    // Update UI
    document.getElementById('room-code').textContent = roomId;
    document.getElementById('connection-status').textContent = 'Connected';

    socket.on('view_update', data => {
        if (!position || data.room_id !== roomId) return;

        const offsetMultiplier = position - 2;
        const offsetMeters = offsetMultiplier * data.viewportWidthMeters;
        
        const centerMercator = maplibregl.MercatorCoordinate.fromLngLat({
            lng: data.lng,
            lat: data.lat
        });
        
        const adjustedMercator = new maplibregl.MercatorCoordinate(
            centerMercator.x + offsetMeters,
            centerMercator.y,
            centerMercator.z
        );
        
        map.jumpTo({
            center: adjustedMercator.toLngLat(),
            zoom: data.zoom,
            bearing: data.bearing,
            pitch: data.pitch
        });
    });
}

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => errorDiv.style.display = 'none', 5000);
}

socket.on('room_joined', () => {
    document.getElementById('position-selection').classList.remove('hidden');
});

socket.on('disconnect', () => {
    document.getElementById('connection-status').textContent = 'Disconnected';
});

socket.on('connect_error', (error) => {
    showError(`Connection failed: ${error.message}`);
});

socket.on('error', (error) => {
    showError(`Server error: ${error.message}`);
});

socket.on('status_update', (data) => {
    if (data.status === 'connected') {
        document.getElementById('position-selection').classList.remove('hidden');
    }
});

socket.on('master_disconnected', () => {
    showError('Master node disconnected');
    document.getElementById('connection-status').textContent = 'Disconnected';
});