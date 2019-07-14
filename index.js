// Socket server for both match and chat features
// ** Has to be running on two seperate servers **
var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;

app.get('/', function(req, res){
  res.send('<h1>Hello world</h1>');
});

function socketIdsInRoom(roomName) {
    var room = io.nsps['/'].adapter.rooms[roomName];
    if (!room) {
        return [];
    }
    var collection = [];
    for (var key in room.sockets) {
        collection.push(key);
    }
    return collection;
}
// For concurrency issues
let socketDict = {};
io.on('connection', function(socket){
    socket.on('disconnect', function(){
        if (socket.room) {
            // Chat socket
            var room = socket.room;
            io.to(room).emit('leave', socket.id);
            socket.leave(room);
        } else if (socket.lobbyPaired) {
            delete socketDict[socket.id];
        }
    });

    socket.on('match', function() {
        socket.join('lobby');
        // If someone is waiting
        var socketIds = socketIdsInRoom('lobby');
        for (let sid of socketIds) {
            if (!(sid in socketDict)) {
                socketDict[sid] = false;
            }
        }
        // Clean socketDict
        for (let sid in socketDict) {
            if (typeof io.sockets.connected[sid] === undefined) delete socketDict[sid];
        }

        let availSocketList = [];
        for (let sid in socketDict) {
            if (!socketDict[sid] && availSocketList.length < 2) {
                availSocketList.push(sid);
                if (availSocketList.length == 2) break;
            }
        }
        if (availSocketList.length == 2) {
            const roomName = `room-${new Date().getTime()}`;
            const socketId1 = availSocketList[0];
            const socketId2 = availSocketList[1];
            if (typeof io.sockets.connected[socketId1] === undefined) {
                delete socketDict[socketId1];
                return;
            }
            if (typeof io.sockets.connected[socketId2]  === undefined) {
                delete socketDict[socketId2];
                return;
            }
            try {
                io.sockets.connected[socketId1].emit(
                    'paired',
                    {
                        roomName,
                    }
                )
                io.sockets.connected[socketId2].emit(
                    'paired',
                    {
                        roomName,
                    }
                )
                socketDict[socketId1] = true;
                socketDict[socketId2] = true;
            } catch {
                console.log('User canceled', socketDict);
            }
        }
    });

    socket.on('join', function(roomName) {
        socket.join(roomName);
        socket.room = roomName;
        var socketIds = socketIdsInRoom(roomName);
        if (socketIds.length == 2) {
            const joiningSocketIndex = socketIds.indexOf(socket.id);
            const waitingSocketIndex = (joiningSocketIndex == 0) ? 1 : 0;
            const joiningSocketId = socketIds[joiningSocketIndex];
            const waitingSocketId = socketIds[waitingSocketIndex];
            io.sockets.connected[joiningSocketId].emit(
                'peerSocketId', 
                {
                    peerSocketId: waitingSocketId,
                    role: 'offer',
                }
            );
            io.sockets.connected[waitingSocketId].emit(
                'peerSocketId',
                {
                    peerSocketId: joiningSocketId,
                    role: 'answer',
                }
            );
        }
    });

    socket.on('exchange', function(data){
        try {
            data.from = socket.id;
            var to = io.sockets.connected[data.to];
            to.emit('exchange', data);
        } catch(e) {
            console.log('Error => something went wrong');
            console.log(JSON.stringify(e));
        }
    });
});

server.listen(port, function(){
    console.log('server up and running at %s port', port);
});
  