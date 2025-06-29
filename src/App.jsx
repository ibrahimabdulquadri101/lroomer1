// import { useState, useRef, useEffect } from "react";
// import { io } from "socket.io-client";
// import Peer from "peerjs";
// import "./App.css";
// import "./index.css";

// // ✅ Connect to your deployed backend
// const socket = io("https://roomer-e88a.onrender.com", {
//   transports: ["websocket"],
// });

// function App() {
//   const [peerId, setPeerId] = useState("");
//   const [remoteId, setRemoteId] = useState(null);
//   const [loading, setLoading] = useState(true); // For UI feedback

//   const myVideo = useRef(null);
//   const remoteVideo = useRef(null);
//   const localStream = useRef(null);
//   const peer = useRef(null);

//   useEffect(() => {
//     // Step 1: Initialize PeerJS
//     peer.current = new Peer();

//     peer.current.on("open", (id) => {
//       setPeerId(id);
//       console.log("🔌 Peer connected with ID:", id);
//       socket.emit("join", id);
//     });

//     // Step 2: Get local media stream
//     navigator.mediaDevices
//       .getUserMedia({ video: true, audio: true })
//       .then((stream) => {
//         if (myVideo.current) {
//           myVideo.current.srcObject = stream;
//         } else {
//           console.warn("myVideo ref is not ready yet.");
//         }

//         localStream.current = stream;

//         peer.current.on("call", (call) => {
//           call.answer(stream);
//           call.on("stream", (userStream) => {
//             remoteVideo.current.srcObject = userStream;
//           });
//         });
//         setLoading(false);
//       })
//       .catch((err) => {
//         console.error("🛑 Failed to get media:", err);
//         setLoading(false);
//       });

//     // Step 4: Handle match found
//     socket.on("match-found", (userId) => {
//       console.log("🎯 Match found with user:", userId);
//       if (!localStream.current) {
//         console.error("❗ Local stream not ready yet.");
//         return;
//       }

//       setRemoteId(userId);

//       const call = peer.current.call(userId, localStream.current);
//       if (call) {
//         call.on("stream", (userStream) => {
//           remoteVideo.current.srcObject = userStream;
//         });
//       } else {
//         console.error("🚫 Failed to initiate call.");
//       }
//     });

//     // Step 5: Handle user disconnect
//     socket.on("user-disconnected", () => {
//       setRemoteId(null);
//     });

//     // Cleanup on unmount
//     return () => {
//       socket.emit("stop");
//       peer.current?.destroy();
//     };
//   }, []);

//   // Re-init peer on disconnect to get a fresh ID
//   useEffect(() => {
//     if (remoteId === null && peer.current?.destroyed) {
//       console.log("♻️ Resetting peer connection...");
//       peer.current = new Peer();
//       peer.current.on("open", (id) => {
//         setPeerId(id);
//         socket.emit("join", id);
//       });
//     }
//   }, [remoteId]);

//   // Stop & reset chat
//   const stopChat = () => {
//     if (remoteId) socket.emit("stop");

//     peer.current?.destroy();
//     peer.current = new Peer();
//     setRemoteId(null);
//     console.log("🔄 Chat stopped. Looking for a new user...");
//   };

//   return (
//     <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white gap-6 p-6">
//       <h1 className="text-2xl font-bold">🎥 Roomer Chat</h1>
//       <h2 className="text-sm text-green-400">
//         Your ID: {peerId || "Connecting..."}
//       </h2>

//       {loading ? (
//         <p className="text-yellow-400">🔄 Preparing your camera...</p>
//       ) : (
//         <>
//           <video
//             ref={myVideo}
//             autoPlay
//             muted
//             playsInline
//             className={`w-2/3 rounded border ${
//               loading ? "opacity-30 blur-sm" : ""
//             }`}
//           />
//           {loading && (
//             <p className="text-yellow-400">🔄 Preparing your camera...</p>
//           )}

//           <video
//             ref={remoteVideo}
//             autoPlay
//             playsInline
//             className="w-2/3 rounded border"
//           />
//         </>
//       )}

//       <button
//         onClick={stopChat}
//         className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded"
//       >
//         🔁 Stop & Find New Chat
//       </button>
//     </div>
//   );
// }

// export default App;

import { useState, useRef, useEffect } from "react";
import { io } from "socket.io-client";
import Peer from "peerjs";
import "./App.css";
import "./index.css";

// ✅ Connect to backend with fallback
const socket = io("https://roomer-e88a.onrender.com", {
  transports: ["websocket", "polling"],
  reconnectionAttempts: 5,
});

function App() {
  const [peerId, setPeerId] = useState("");
  const [remoteId, setRemoteId] = useState(null);
  const [loading, setLoading] = useState(true);

  const myVideo = useRef(null);
  const remoteVideo = useRef(null);
  const localStream = useRef(null);
  const peer = useRef(null);

  // Helper to init peer
  const initializePeer = () => {
    peer.current = new Peer({
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
        ],
      },
    });

    peer.current.on("open", (id) => {
      setPeerId(id);
      console.log("🔌 Peer connected with ID:", id);
      socket.emit("join", id);
    });

    peer.current.on("error", (err) => {
      console.error("🧨 PeerJS error:", err);
    });
  };

  // Get user media stream
  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStream.current = stream;

      // Attach stream to video with autoplay handling
      requestAnimationFrame(() => {
        if (myVideo.current) {
          myVideo.current.srcObject = stream;
          myVideo.current.onloadedmetadata = () => {
            myVideo.current.play().catch((err) =>
              console.warn("Autoplay error:", err)
            );
          };
        } else {
          console.warn("⚠️ myVideo ref not ready");
        }
      });

      // Answer incoming calls
      peer.current.on("call", (call) => {
        call.answer(stream);
        call.on("stream", (remoteStream) => {
          remoteVideo.current.srcObject = remoteStream;
        });
        call.on("error", (err) => {
          console.error("❌ Call error:", err);
        });
      });

      setLoading(false);
    } catch (err) {
      console.error("🛑 Failed to get user media:", err.name, err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    initializePeer();
    initializeMedia();

    // Match found
    socket.on("match-found", (userId) => {
      console.log("🎯 Match found with user:", userId);
      if (!localStream.current) {
        console.error("❗ Local stream not ready");
        return;
      }

      setRemoteId(userId);
      const call = peer.current.call(userId, localStream.current);
      if (call) {
        call.on("stream", (remoteStream) => {
          remoteVideo.current.srcObject = remoteStream;
        });
        call.on("error", (err) => {
          console.error("📛 Call error:", err);
        });
      }
    });

    // Handle disconnect
    socket.on("user-disconnected", () => {
      setRemoteId(null);
    });

    socket.on("connect_error", (err) => {
      console.error("⚠️ Socket connection error:", err.message);
    });

    // Cleanup
    return () => {
      socket.emit("stop");
      peer.current?.destroy();
      localStream.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  // Re-initialize peer if disconnected
  useEffect(() => {
    if (remoteId === null && peer.current?.destroyed) {
      console.log("♻️ Re-initializing peer...");
      initializePeer();
    }
  }, [remoteId]);

  // Stop chat and reset
  const stopChat = () => {
    if (remoteId) socket.emit("stop");

    peer.current?.destroy();
    localStream.current?.getTracks().forEach((track) => track.stop());
    setRemoteId(null);

    initializePeer();
    initializeMedia();

    console.log("🔄 Chat stopped. Searching for a new partner...");
  };

  // Debug exposure
  useEffect(() => {
    window.myVideo = myVideo;
    window.remoteVideo = remoteVideo;
    window.localStream = localStream;
    window.peer = peer;
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white gap-6 p-6">
      <h1 className="text-2xl font-bold">🎥 Roomer Chat</h1>
      <h2 className="text-sm text-green-400">
        Your ID: {peerId || "Connecting..."}
      </h2>

      {loading ? (
        <p className="text-yellow-400">🔄 Preparing your camera...</p>
      ) : (
        <>
          <video
            ref={myVideo}
            autoPlay
            muted
            playsInline
            className="w-2/3 rounded border"
          />
          <video
            ref={remoteVideo}
            autoPlay
            playsInline
            className="w-2/3 rounded border"
          />
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
