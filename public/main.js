let divSelectRoom = document.querySelector(".select-room");
let divConsultingRoom = document.querySelector("#consultingRoom");
let inputRoomNumber = document.querySelector("#roomNumber");
let localVideo = document.querySelector("#localVideo");
let remoteVideo = document.querySelector("#remoteVideo");
let btnGoRoom = document.querySelector("#goRoom");
const callName = document.querySelector("#callName");
const inputCallName = document.querySelector("#inputCallName");
const setCallName = document.querySelector("#setName");

let localStream, remoteStream, roomNumber, isCaller = false, peerConnection, dataChannel;

const socket = io();

const iceServers = {
    iceServers: [
        { 'urls': 'stun:stun.services.mozilla.com' },
        { 'urls': 'stun:stun.l.google.com:19302' }
    ]
};

const streamContraints = { video: true, audio: true };


btnGoRoom.addEventListener('click', function (ev) {
    if (inputRoomNumber.value === '') {
        return alert("please enter your room name");
    }

    divConsultingRoom.style.display = "block";
    divSelectRoom.style.display = "none";

    socket.emit("created or joined", inputRoomNumber.value);
});


socket.on("created", room => {

    // recuperation des flux videos
    navigator.mediaDevices.getUserMedia(streamContraints)
        .then(stream => {
            localVideo.srcObject = stream;
            localStream = stream;
            isCaller = true;

        }).catch(err => console.log("Erreur ", err))

});


socket.on("joined", room => {

    // recuperation des flux videos
    return navigator.mediaDevices.getUserMedia(streamContraints)
        .then(stream => {
            localVideo.srcObject = stream;
            localStream = stream;
            socket.emit("ready", room);
        }).catch(err => console.log("Erreur ", err))

});

socket.on("ready", room => {
    console.log("ready...", room);
    if (isCaller) {
        peerConnection = new RTCPeerConnection(iceServers);
        peerConnection.onicecandidate = onIceCandidate;
        peerConnection.ontrack = onAddStream;
        peerConnection.addTrack(localStream.getTracks()[0], localStream);
        peerConnection.addTrack(localStream.getTracks()[1], localStream);
        peerConnection.createOffer({ offerToReceiveVideo: 1 })
            .then(sdp => {
                peerConnection.setLocalDescription(sdp);
                socket.emit("offer", { room: inputRoomNumber.value, sdp: sdp, type: "offer" });
            }).catch(err => console.log("Erreur de creation de l'offer", err));

        dataChannel = peerConnection.createDataChannel(inputRoomNumber.value);
        dataChannel.onmessage = event => {
            console.log("onmessage :", event);
            callName.innerHTML = event.data;
        }

    }

    return
});



socket.on("offer", sdp => {

    if (!isCaller) {
        peerConnection = new RTCPeerConnection(iceServers);
        peerConnection.onicecandidate = onIceCandidate;
        peerConnection.ontrack = onAddStream;
        peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
        peerConnection.addTrack(localStream.getTracks()[0], localStream)
        peerConnection.addTrack(localStream.getTracks()[1], localStream)
        peerConnection.createAnswer({ offerToReceiveVideo: 1 })
            .then(sdp => {
                peerConnection.setLocalDescription(sdp);
                socket.emit("answer", { room: inputRoomNumber.value, sdp: sdp, type: "answer" });
            }).catch(err => console.log("Erreur de creation de l'answer", err));

        peerConnection.ondatachannel = event => {
            dataChannel = event.channel;

            dataChannel.onmessage = event => {
                console.log("message event ", event);
                callName.innerHTML = event.data;
            }
        }


    }
})

socket.on("answer", sdp => {
    if (isCaller) {
        peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
    }
})

// listen on full event
socket.on("full", room => {
    alert("la réunion des déja saturer");
})


// création de la fonction onicecandidate
function onIceCandidate(event) {
    if (event) {
        return socket.emit("candidate", { type: "candidate", room: inputRoomNumber.value, candidate: event.candidate })
    }
    return console.log("pas de candidate ")
}

socket.on("candidate", event => {
    peerConnection.addIceCandidate(event);
})

// création de la fonction on add stream
function onAddStream(track) {
    remoteStream = track.streams[0];
    remoteVideo.srcObject = track.streams[0];
}

setCallName.addEventListener("click", function (event) {
    if (inputCallName.value === '') {
        return alert("veuillez entrez un text ");
    }

    dataChannel.send(inputCallName.value);
})