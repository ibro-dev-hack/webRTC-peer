const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);

const port = process.env.PORT || 9999;

// utilisation des middleware 
app.use(express.static("public"));

app.get("/", (req, res, next) =>{
    return res.sendFile("/index.html");
})

io.on("connect", socket => {
    socket.on("created or joined", room => {

        // check if there are some in room 

        const myRoom = socket.adapter.rooms[room] || { length: 0};

        if(myRoom.length === 0){
            socket.join(room);
            socket.emit("created", room);
        }else if(myRoom.length === 1){
            socket.join(room);
            socket.emit("joined", room);
        }else {
            socket.emit("full","le chemin que vous éssayé d'accéder est dejà plein!");
        }

    });
    
    socket.on("ready", function(room){
        socket.broadcast.to(room).emit("ready", room);
    });

    socket.on("offer", function(event){
        return socket.broadcast.to(event.room).emit("offer", event.sdp);
    });
    socket.on("answer", function(event){
        return socket.broadcast.to(event.room).emit("answer", event.sdp);
    });

    socket.on("candidate", ({ room, candidate, type }) =>{
        return socket.broadcast.to(room).emit("candidate", candidate);
    })
    
});


io.on("close", function(){ console.log("deconnection d'une personne ")})

http.listen(port, () => console.log("Démarrage sur : http://localhost:",port,".... Appuyé CTRL C pour couper le serveur express!" ));