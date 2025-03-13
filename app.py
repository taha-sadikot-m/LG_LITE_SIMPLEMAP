from flask import Flask, render_template, jsonify, request, send_from_directory
from flask_socketio import SocketIO, emit, join_room, leave_room
import secrets

app = Flask(__name__)
app.config['SECRET_KEY'] = secrets.token_hex(32)

socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')
rooms = {}

@app.route('/')
def master():
    return render_template('master.html')

@app.route('/slave')
def slave():
    return render_template('slave.html')

@app.route('/create-room', methods=['POST'])
def create_room():
    room_id = secrets.token_urlsafe(6).upper()
    rooms[room_id] = {'master': None, 'slaves': []}
    return jsonify({'room_id': room_id})

@socketio.on('join_room')
def handle_join_room(data):
    room_id = data.get('room_id')
    if not room_id or room_id not in rooms:
        emit('error', {'message': 'Invalid room code'})
        return
    
    join_room(room_id)
    
    if data.get('is_master'):
        if rooms[room_id]['master']:
            emit('error', {'message': 'Room already has a master'})
            return
        rooms[room_id]['master'] = request.sid
        emit('status_update', {'status': 'connected'}, room=request.sid)
    else:
        rooms[room_id]['slaves'].append(request.sid)
        emit('status_update', {'status': 'connected'}, room=request.sid)

@socketio.on('view_update')
def handle_view_update(data):
    room_id = data.get('room_id')
    if room_id in rooms and request.sid == rooms[room_id]['master']:
        emit('view_update', data, room=room_id, include_self=False)

@socketio.on('disconnect')
def handle_disconnect():
    for room_id, room in rooms.items():
        if request.sid == room['master']:
            emit('master_disconnected', room=room_id)
            del rooms[room_id]
            break
        elif request.sid in room['slaves']:
            room['slaves'].remove(request.sid)

@app.route('/favicon.ico')
def favicon():
    return send_from_directory('static', 'favicon.ico')

if __name__ == '__main__':
    socketio.run(app,host='0.0.0.0', port=5000, debug=True)