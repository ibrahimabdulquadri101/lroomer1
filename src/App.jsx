import { useState, useRef, useEffect } from "react";
import { io } from "socket.io-client";
import Peer from "peerjs";
import "./App.css";
import "./index.css";
// const socket = io("http://localhost:5000");
const socket = io("https://roomer-e88a.onrender.com", { transports: ["websocket"] });

function App() {
  const [peerId, setPeerId] = useState("");
  const [remoteId, setRemoteId] = useState(null);
  const myVideo = useRef(null);
  const remoteVideo = useRef(null);
  const peer = useRef(null);
  useEffect(() => {
    peer.current = new Peer();

    peer.current.on("open", (id) => {
      setPeerId(id);
      console.log("Peer connected with ID:", id);
      socket.emit("join", id);
    });
    console.log("Found")
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        myVideo.current.srcObject = stream;

        peer.current.on("call", (call) => {
          call.answer(stream);
          call.on("stream", (userStream) => {
            remoteVideo.current.srcObject = userStream;
          });
        });
      });

    socket.on("match-found", (userId) => {
      if (!userId) {
        console.error("User ID is missing!");
        return;
      }
      console.log("Found",userId)
      setRemoteId(userId);
      if (!myVideo.current?.srcObject) {
        console.error("Local stream is not available yet.");
        return;
      }
      const call = peer.current.call(userId, myVideo.current?.srcObject);
      if(call){
        call.on("stream", (userStream) => {
          remoteVideo.current.srcObject = userStream;
        });
      }else{
        console.error("Failed")
      }
    });

    socket.on("user-disconnected", () => {
      setRemoteId(null);
    });

    return () => socket.emit("stop");
  }, []);
  const stopChat = () => {
    if (remoteId) {
      socket.emit("stop"); // Inform the backend
    }
  
    if (peer.current) {
      peer.current.destroy(); // Disconnect PeerJS
      peer.current = new Peer(); // Reinitialize Peer
    }
  
    setRemoteId(null);
    console.log("Chat stopped. Looking for a new user...");
  };
  useEffect(() => {
    if (remoteId === null) {
      console.log("Resetting peer connection...");
      peer.current = new Peer();

      peer.current.on("open", (id) => {
        setPeerId(id);
        socket.emit("join", id);
      });
    }
  }, [remoteId]);

  return (
    <>
       <div className="flex flex-col items-center gap-4">
            <h2>Your ID: {peerId}</h2>
            <video ref={myVideo} autoPlay playsInline className="w-1/2"></video>
            <video ref={remoteVideo} autoPlay playsInline className="w-1/2"></video>
            <button onClick={stopChat} className="bg-red-500 text-white px-4 py-2 rounded">
                Stop & Find New Chat
            </button>
        </div>
    </>
  );
}

export default App;
