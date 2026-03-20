// To change port for backend ASP.NET Core
const API_URL = 'http://localhost:5198/api'; 

const chatBox = document.getElementById('chatBox');
let lastMessageCount = 0;

async function fetchMessages() {
    try {
        const response = await fetch(`${API_URL}/messages`);
        const messages = await response.json();
        
        if (messages.length > lastMessageCount) {
            chatBox.innerHTML = '';
            messages.forEach(msg => {
                const div = document.createElement('div');
                div.className = 'message';
                
                // Safety measure for capital and small letters
                const username = msg.username || msg.Username;
                const timestamp = msg.timestamp || msg.Timestamp;
                const isFile = msg.isFile || msg.IsFile;
                const content = msg.content || msg.Content;
                const fileUrl = msg.fileUrl || msg.FileUrl;
                
                let contentHTML = `<strong>${username}</strong> <span>(${timestamp})</span>: <br>`;
                
                if (isFile) {
                    // Download atribute makes file to be downloaded not opened in the browser
                    contentHTML += `<a href="${API_URL.replace('/api', '')}${fileUrl}" target="_blank" download="${content}">Download file: ${content}</a>`;
                } else {
                    contentHTML += content;
                }
                
                div.innerHTML = contentHTML;
                chatBox.appendChild(div);
            });
            chatBox.scrollTop = chatBox.scrollHeight;
            lastMessageCount = messages.length;
        }
    } catch (error) {
        console.error('Error downloading message:', error);
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
    const username = document.getElementById('usernameInput').value || 'Anonymous';

    if (!file) {
        alert("Choose a file before trying to send it!");
        return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('username', username);

    try {
        const uploadResponse = await fetch(`${API_URL}/files/upload`, {
            method: 'POST',
            body: formData
        });
        
       if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            throw new Error(`Server returned error: ${uploadResponse.status}. Details: ${errorText}`);
        }

        const result = await uploadResponse.json();

        // Building message about sent file
        const message = {
            username: username,
            content: result.originalName,
            isFile: true,
            fileUrl: result.url
        };

        // Send to chat
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
        console.error('Error sending file:', error);
        alert("There is error uploading file. Check console");
    }
}

setInterval(fetchMessages, 2000);
fetchMessages();