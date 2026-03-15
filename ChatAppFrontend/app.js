// To change port for backend ASP.NET Core
const API_URL = 'http://localhost:5198/api'; 

const chatBox = document.getElementById('chatBox');
let lastMessageCount = 0;

// Downloading messages (GET 1)
async function fetchMessages() {
    try {
        const response = await fetch(`${API_URL}/messages`);
        const messages = await response.json();
        
        if (messages.length > lastMessageCount) {
            chatBox.innerHTML = '';
            messages.forEach(msg => {
                const div = document.createElement('div');
                div.className = 'message';
                
                let contentHTML = `<strong>${msg.username}</strong> <span>(${msg.timestamp})</span>: <br>`;
                
                if (msg.isFile) {
                    contentHTML += `<a href="${API_URL.replace('/api', '')}${msg.fileUrl}" target="_blank">Pobierz plik: ${msg.content}</a>`;
                } else {
                    contentHTML += msg.content;
                }
                
                div.innerHTML = contentHTML;
                chatBox.appendChild(div);
            });
            chatBox.scrollTop = chatBox.scrollHeight;
            lastMessageCount = messages.length;
        }
    } catch (error) {
        console.error('Błąd pobierania wiadomości:', error);
    }
}

// Sending text message (POST 1)
async function sendMessage() {
    const username = document.getElementById('usernameInput').value || 'Anonim';
    const content = document.getElementById('messageInput').value;

    if (!content) return;

    const message = {
        username: username,
        content: content,
        isFile: false
    };

    await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(message)
    });

    document.getElementById('messageInput').value = '';
    fetchMessages();
}

// Sending files (POST 2)
async function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    const username = document.getElementById('usernameInput').value || 'Anonim';

    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('username', username);

    try {
        const uploadResponse = await fetch(`${API_URL}/files/upload`, {
            method: 'POST',
            body: formData
        });
        
        const result = await uploadResponse.json();

        // Adding information about a file to message stream
        const message = {
            username: username,
            content: result.originalName,
            isFile: true,
            fileUrl: result.url
        };

        await fetch(`${API_URL}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(message)
        });

        fileInput.value = '';
        fetchMessages();

    } catch (error) {
        console.error('Błąd przesyłania pliku:', error);
    }
}

// Refresh chat every 2 seconds (prosty Polling)
setInterval(fetchMessages, 2000);
fetchMessages();