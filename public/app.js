const WORKER_URL = window.location.origin;

// --- IDENTITY SYSTEM ---
const adjectives = ["Cyber", "Neon", "Ghost", "Crypto", "Silent", "Quantum", "Shadow"];
const nouns = ["Ninja", "Phantom", "Node", "Specter", "Drifter", "Proxy", "Viper"];
const myUsername = `${adjectives[Math.floor(Math.random()*adjectives.length)]} ${nouns[Math.floor(Math.random()*nouns.length)]} #${Math.floor(Math.random()*999)}`;
const myColor = `hsl(${Math.random() * 360}, 70%, 60%)`;

let peer, myId, connections = [], localStream, isMicOn = false;
let isSearching = false; // <--- NEW CRITICAL FLAG

function initPeer() {
    peer = new Peer(undefined, { host: '0.peerjs.com', port: 443, path: '/' });
    
    peer.on('open', id => {
        myId = id;
        console.log("My Peer ID:", id);
    });

    // Handle INCOMING connections (When someone finds YOU)
    peer.on('connection', c => {
        // If we are searching, STOP SEARCHING immediately
        if (isSearching) {
            isSearching = false;
            document.getElementById("room-status").innerText = "Connected!";
            document.getElementById("premium-tools").style.display = "flex";
        }
        setupConnection(c);
    });

    peer.on('call', call => { 
        call.answer(); 
        call.on('stream', s => { 
            const a = new Audio(); 
            a.srcObject = s; 
            a.play(); 
        }); 
    });
}
initPeer();

// --- MATCHMAKING LOGIC ---
async function startRandomChat() {
    // 1. Reset UI
    switchUI();
    document.getElementById("chat-feed").innerHTML = '<div class="system-msg">Searching for a partner...</div>';
    document.getElementById("room-status").innerText = "Searching...";
    
    // 2. Start Polling Loop
    isSearching = true; 
    let matched = false;

    while (isSearching) { // Only run while we are flagged as searching
        try {
            const res = await fetch(`${WORKER_URL}/match?id=${myId}`);
            const data = await res.json();
            
            // If the server found someone for us:
            if (data.status === "matched") {
                isSearching = false; // STOP LOOP
                connectToPeer(data.peerId); 
                matched = true;
                document.getElementById("room-status").innerText = "Connected (1:1)";
                document.getElementById("premium-tools").style.display = "flex";
            } else {
                // If waiting, wait 2 seconds before asking again
                await new Promise(r => setTimeout(r, 2000));
            }
        } catch(e) { 
            console.error(e);
            await new Promise(r => setTimeout(r, 2000));
        }
    }
}

// --- PUBLIC & GROUP LOGIC ---
async function joinPublicLounge() {
    switchUI();
    isSearching = false; // Ensure random loop is dead
    document.getElementById("room-status").innerText = "Lounge";
    const res = await fetch(`${WORKER_URL}/join-public?id=${myId}`);
    const data = await res.json();
    if(data.peers) data.peers.forEach(pid => connectToPeer(pid));
}

async function createGroup() {
    const key = Math.floor(100000 + Math.random() * 900000);
    document.getElementById('group-key-input').value = key;
    joinGroup();
}

async function joinGroup() {
    const key = document.getElementById('group-key-input').value;
    if(key.length !== 6) return alert("6-digit key required");
    
    switchUI();
    isSearching = false; // Ensure random loop is dead
    document.getElementById("room-status").innerText = `Room: ${key}`;
    document.getElementById("premium-tools").style.display = "flex";
    
    const res = await fetch(`${WORKER_URL}/join-group?key=${key}&id=${myId}`);
    const data = await res.json();
    if(data.peers) data.peers.forEach(pid => connectToPeer(pid));
}

// --- CONNECTION HANDLING ---
function connectToPeer(id) { 
    const c = peer.connect(id); 
    setupConnection(c); 
}

function setupConnection(conn) {
    conn.on('open', () => { 
        // Double check: If we connect, make sure we stop looking for others
        isSearching = false; 
        
        // Add to list if not already there
        if(!connections.find(c => c.peer === conn.peer)) {
            connections.push(conn);
            addSystemMessage("User joined the chat.");
            
            // Send Greeting
            conn.send({ type: 'system', text: `${myUsername} joined.` });
        }
    });

    conn.on('data', d => {
        if(d.type === 'chat') addMessage(d, 'them');
        else if(d.type === 'file') renderFileLink(d);
        else if(d.type === 'system') addSystemMessage(d.text);
    });

    conn.on('close', () => {
        addSystemMessage("User disconnected.");
        
        // NEW: "Search Again" Button Logic
        const container = document.createElement('div');
        container.style.textAlign = 'center';
        container.style.marginTop = '15px';
        
        // Create a button that triggers the existing startRandomChat() function
        const btn = document.createElement('button');
        btn.className = 'btn-pink'; // Re-use your pink neon style
        btn.innerText = "🎲 Find New Stranger";
        btn.style.width = "auto";
        btn.style.padding = "10px 20px";
        
        // When clicked, clear chat and search again
        btn.onclick = () => {
            chatFeed.innerHTML = ''; // Clean previous conversation
            startRandomChat();       // Restart the search logic
        };
        
        container.appendChild(btn);
        chatFeed.appendChild(container);
        
        // Auto-scroll to show the button
        chatFeed.scrollTop = chatFeed.scrollHeight;
    });
    
    conn.on('error', () => {
        console.log("Connection Error");
    });
}

// --- MESSAGING ---
function sendMessage() {
    const input = document.getElementById("msg-input");
    if(!input.value) return;
    const data = { type: 'chat', sender: myUsername, color: myColor, text: input.value };
    connections.forEach(c => c.send(data));
    addMessage(data, 'me');
    input.value = "";
}

function addMessage(data, type) {
    const div = document.createElement("div"); 
    div.className = `message ${type}`;
    // Secure innerHTML to prevent basic injection, though peer data is trusted-ish here
    div.innerHTML = `<span class="user-label" style="color:${type==='me'?'#fff':data.color}">${data.sender}</span>${data.text.replace(/</g, "&lt;")}`;
    document.getElementById("chat-feed").appendChild(div);
    scrollToBottom();
}

function addSystemMessage(text) {
    const div = document.createElement("div"); 
    div.className = "system-msg"; 
    div.innerText = text;
    document.getElementById("chat-feed").appendChild(div);
    scrollToBottom();
}

// --- VOICE ---
async function toggleVoice() {
    const btn = document.getElementById("voice-btn");
    if (!localStream) {
        try {
            localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            isMicOn = true; btn.innerHTML = "🎤 Mic: ON"; btn.style.background = "var(--neon-pink)";
            connections.forEach(c => peer.call(c.peer, localStream));
        } catch(e) { alert("Mic denied. Check settings."); }
    } else {
        isMicOn = !isMicOn;
        localStream.getAudioTracks()[0].enabled = isMicOn;
        btn.innerHTML = isMicOn ? "🎤 Mic: ON" : "🔇 Mic: OFF";
        btn.style.background = isMicOn ? "var(--neon-pink)" : "#222";
    }
}

// --- UTILS ---
function sendFile(file) {
    if(file.size > 5*1024*1024) return alert("File too large (Max 5MB)");
    const blob = new Blob([file], {type: file.type});
    const data = { type: 'file', file: blob, name: file.name, sender: myUsername, color: myColor };
    connections.forEach(c => c.send(data));
    addSystemMessage(`Sent file: ${file.name}`);
}

function renderFileLink(data) {
    const blob = new Blob([data.file], {type: data.type});
    const url = URL.createObjectURL(blob);
    const div = document.createElement("div"); div.className = "message them";
    div.innerHTML = `<span class="user-label" style="color:${data.color}">${data.sender}</span> Shared: <a href="${url}" download="${data.name}" style="color:var(--neon-cyan); text-decoration:underline;">${data.name}</a>`;
    document.getElementById("chat-feed").appendChild(div);
    scrollToBottom();
}

function scrollToBottom() { 
    const f = document.getElementById("chat-feed"); 
    f.scrollTop = f.scrollHeight; 
}

function switchUI() { 
    document.getElementById("home-screen").style.display = "none"; 
    document.getElementById("chat-interface").style.display = "flex"; 
}

function leaveChat() { location.reload(); }
function handleEnter(e) { if(e.key === 'Enter') sendMessage(); }
function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

async function processDonation(amount) {
    if(amount==='custom') amount = prompt("Enter amount (USD):");
    if(!amount) return;
    document.getElementById("donation-status").innerText = "Generating Invoice...";
    try {
        const res = await fetch(`${WORKER_URL}/create-donation?amount=${amount}`);
        const data = await res.json();
        if(data.payLink) window.location.href = data.payLink;
    } catch(e) { alert("Error connecting to payment server."); }
}