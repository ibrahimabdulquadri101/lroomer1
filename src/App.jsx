// import { useState, useRef, useEffect } from "react";
// import { io } from "socket.io-client";
// import Peer from "peerjs";
// import "./App.css";
// import "./index.css";
// // const socket = io("http://localhost:5000");
// const socket = io("https://roomer-e88a.onrender.com", { transports: ["websocket"] });

// function App() {
//   const [peerId, setPeerId] = useState("");
//   const [remoteId, setRemoteId] = useState(null);
//   const myVideo = useRef(null);
//   const remoteVideo = useRef(null);
//   const peer = useRef(null);
//   useEffect(() => {
//     peer.current = new Peer();

//     peer.current.on("open", (id) => {
//       setPeerId(id);
//       console.log("Peer connected with ID:", id);
//       socket.emit("join", id);
//     });
//     console.log("Found")
//     navigator.mediaDevices
//       .getUserMedia({ video: true, audio: true })
//       .then((stream) => {
//         myVideo.current.srcObject = stream;

//         peer.current.on("call", (call) => {
//           call.answer(stream);
//           call.on("stream", (userStream) => {
//             remoteVideo.current.srcObject = userStream;
//           });
//         });
//       });

//     socket.on("match-found", (userId) => {
//       if (!userId) {
//         console.error("User ID is missing!");
//         return;
//       }
//       console.log("Found",userId)
//       setRemoteId(userId);
//       if (!myVideo.current?.srcObject) {
//         console.error("Local stream is not available yet.");
//         return;
//       }
//       const call = peer.current.call(userId, myVideo.current?.srcObject);
//       if(call){
//         call.on("stream", (userStream) => {
//           remoteVideo.current.srcObject = userStream;
//         });
//       }else{
//         console.error("Failed")
//       }
//     });

//     socket.on("user-disconnected", () => {
//       setRemoteId(null);
//     });

//     return () => socket.emit("stop");
//   }, []);
//   const stopChat = () => {
//     if (remoteId) {
//       socket.emit("stop"); // Inform the backend
//     }
  
//     if (peer.current) {
//       peer.current.destroy(); // Disconnect PeerJS
//       peer.current = new Peer(); // Reinitialize Peer
//     }
  
//     setRemoteId(null);
//     console.log("Chat stopped. Looking for a new user...");
//   };
//   useEffect(() => {
//     if (remoteId === null) {
//       console.log("Resetting peer connection...");
//       peer.current = new Peer();

//       peer.current.on("open", (id) => {
//         setPeerId(id);
//         socket.emit("join", id);
//       });
//     }
//   }, [remoteId]);

//   return (
//     <>
//        <div className="flex flex-col items-center gap-4">
//             <video ref={myVideo} autoPlay playsInline className="w-1/2"></video>
//             <video ref={remoteVideo} autoPlay playsInline className="w-1/2"></video>
//             <button onClick={stopChat} className="bg-red-500 text-white px-4 py-2 rounded">
//                 Stop & Find New Chat
//             </button>
//         </div>
//     </>
//   );
// }

// export default App;
import { useState, useRef, useEffect } from "react";
import { io } from "socket.io-client";
import Peer from "peerjs";
import "./App.css";
import "./index.css";

// ✅ Connect to your deployed backend
const socket = io("https://roomer-e88a.onrender.com", { transports: ["websocket"] });

function App() {
  const [peerId, setPeerId] = useState("");
  const [remoteId, setRemoteId] = useState(null);
  const [loading, setLoading] = useState(true); // For UI feedback

  const myVideo = useRef(null);
  const remoteVideo = useRef(null);
  const localStream = useRef(null);
  const peer = useRef(null);

  useEffect(() => {
    // Step 1: Initialize PeerJS
    peer.current = new Peer();

    peer.current.on("open", (id) => {
      setPeerId(id);
      console.log("🔌 Peer connected with ID:", id);
      socket.emit("join", id);
    });

    // Step 2: Get local media stream
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        myVideo.current.srcObject = stream;
        localStream.current = stream;
        setLoading(false);

        // Step 3: Answer incoming calls
        peer.current.on("call", (call) => {
          call.answer(stream);
          call.on("stream", (userStream) => {
            remoteVideo.current.srcObject = userStream;
          });
        });
      })
      .catch((err) => {
        console.error("🛑 Failed to get media:", err);
        setLoading(false);
      });

    // Step 4: Handle match found
    socket.on("match-found", (userId) => {
      console.log("🎯 Match found with user:", userId);
      if (!localStream.current) {
        console.error("❗ Local stream not ready yet.");
        return;
      }

      setRemoteId(userId);

      const call = peer.current.call(userId, localStream.current);
      if (call) {
        call.on("stream", (userStream) => {
          remoteVideo.current.srcObject = userStream;
        });
      } else {
        console.error("🚫 Failed to initiate call.");
      }
    });

    // Step 5: Handle user disconnect
    socket.on("user-disconnected", () => {
      setRemoteId(null);
    });

    // Cleanup on unmount
    return () => {
      socket.emit("stop");
      peer.current?.destroy();
    };
  }, []);

  // Re-init peer on disconnect to get a fresh ID
  useEffect(() => {
    if (remoteId === null && peer.current?.destroyed) {
      console.log("♻️ Resetting peer connection...");
      peer.current = new Peer();
      peer.current.on("open", (id) => {
        setPeerId(id);
        socket.emit("join", id);
      });
    }
  }, [remoteId]);

  // Stop & reset chat
  const stopChat = () => {
    if (remoteId) socket.emit("stop");

    peer.current?.destroy();
    peer.current = new Peer();
    setRemoteId(null);
    console.log("🔄 Chat stopped. Looking for a new user...");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white gap-6 p-6">
      <h1 className="text-2xl font-bold">🎥 Roomer Chat</h1>
      <h2 className="text-sm text-green-400">Your ID: {peerId || "Connecting..."}</h2>

      {loading ? (
        <p className="text-yellow-400">🔄 Preparing your camera...</p>
      ) : (
        <>
          <video ref={myVideo} autoPlay playsInline muted className="w-2/3 rounded border" />
          <video ref={remoteVideo} autoPlay playsInline className="w-2/3 rounded border" />
        </>
      )}

      <button
        onClick={stopChat}
        className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded"
      >
        🔁 Stop & Find New Chat
      </button>
    </div>
  );
}

export default App;
