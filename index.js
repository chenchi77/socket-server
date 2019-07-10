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
        console.log(key);
        collection.push(key);
    }
    return collection;
}

io.on('connection', function(socket){
    socket.on('disconnect', function(){
        if (socket.room) {
            var room = socket.room;
            io.to(room).emit('leave', socket.id);
            socket.leave(room);
        }
    });

    socket.on('join', function(roomName, callback) {
        socket.join(roomName);
        socket.room = roomName;
        var socketIds = socketIdsInRoom(roomName);
        console.log('returning socket ids: ', socketIds)
        callback(socketIds);
    });

    socket.on('exchange', function(data){
        try {
            data.from = socket.id;
            var to = io.sockets.connected[data.to];
            to.emit('exchange', data);
        } catch {
            console.log('Error => something went wrong');
        }
    });
});

server.listen(port, function(){
    console.log('server up and running at %s port', port);
});
  