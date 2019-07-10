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
    console.log('user connected', socket.id);
    socket.on('disconnect', function(){
        console.log('user disconnected');
        if (socket.room) {
            var room = socket.room;
            io.to(room).emit('leave', socket.id);
            socket.leave(room);
        }
    });

    socket.on('join', function(roomName, callback){
        console.log('join', roomName);
        var socketIds = socketIdsInRoom(roomName);
        console.log('socketIds', socketIds);
        socket.join(roomName);
        socket.room = roomName;
        console.log('join finished');
        callback(socketIds);
    });

    socket.on('exchange', function(data){
        console.log('exchange', data);
        data.from = socket.id;
        var to = io.sockets.connected[data.to];
        to.emit('exchange', data);
    });
});

server.listen(port, function(){
    console.log('server up and running at %s port', port);
});
  