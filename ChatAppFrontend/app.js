const API_URL = 'http://localhost:5000/api'; 

// AWS Cognito Configuration 
const poolData = {
    UserPoolId: 'YOUR_COGNITO_USER_POOL_ID', 
    ClientId: 'YOUR_COGNITO_CLIENT_ID'      
};

const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
let currentUserToken = null;
let fetchInterval = null;
let lastMessageCount = 0;

// DOM
const authContainer = document.getElementById('authContainer');
const chatContainer = document.getElementById('chatContainer');
const authMessage = document.getElementById('authMessage');
const verificationSection = document.getElementById('verificationSection');
const chatBox = document.getElementById('chatBox');

// Authentication Logic

function register() {
    const username = document.getElementById('authUsername').value;
    const password = document.getElementById('authPassword').value;
    const email = document.getElementById('authEmail').value;

    if (!username || !password || !email) {
        authMessage.innerText = "Please provide username, password, and email for registration.";
        return;
    }

    const attributeList = [
        new AmazonCognitoIdentity.CognitoUserAttribute({ Name: 'email', Value: email })
    ];

    userPool.signUp(username, password, attributeList, null, (err, result) => {
        if (err) {
            authMessage.innerText = `Registration failed: ${err.message}`;
            return;
        }
        authMessage.innerText = "Registration successful! Please check your email for the verification code.";
        authMessage.style.color = "green";
        verificationSection.style.display = "block";
    });
}

function confirmRegistration() {
    const username = document.getElementById('authUsername').value;
    const code = document.getElementById('verificationCode').value;

    const cognitoUser = new AmazonCognitoIdentity.CognitoUser({
        Username: username,
        Pool: userPool
    });

    cognitoUser.confirmRegistration(code, true, (err, result) => {
        if (err) {
            authMessage.innerText = `Verification failed: ${err.message}`;
            authMessage.style.color = "#d9534f";
            return;
        }
        authMessage.innerText = "Account verified successfully! You can now login.";
        authMessage.style.color = "green";
        verificationSection.style.display = "none";
    });
}

function login() {
    const username = document.getElementById('authUsername').value;
    const password = document.getElementById('authPassword').value;

    const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails({
        Username: username,
        Password: password
    });

    const cognitoUser = new AmazonCognitoIdentity.CognitoUser({
        Username: username,
        Pool: userPool
    });

    cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (result) => {
            
            currentUserToken = result.getAccessToken().getJwtToken();
            showChat();
        },
        onFailure: (err) => {
            authMessage.innerText = `Login failed: ${err.message}`;
            authMessage.style.color = "#d9534f";
        }
    });
}

function logout() {
    const cognitoUser = userPool.getCurrentUser();
    if (cognitoUser != null) {
        cognitoUser.signOut();
    }
    currentUserToken = null;
    hideChat();
}


function showChat() {
    authContainer.style.display = 'none';
    chatContainer.style.display = 'block';
  
    fetchMessages();
    fetchInterval = setInterval(fetchMessages, 2000);
}

function hideChat() {
    authContainer.style.display = 'block';
    chatContainer.style.display = 'none';
    chatBox.innerHTML = '';
    
    
    if (fetchInterval) {
        clearInterval(fetchInterval);
    }
}

// Chat Features

// Fetch messages (GET) includes JWT Token
async function fetchMessages() {
    if (!currentUserToken) return;

    try {
        const response = await fetch(`${API_URL}/messages`, {
            headers: {
                'Authorization': `Bearer ${currentUserToken}`
            }
        });

        if (response.status === 401) {
            logout();
            alert("Session expired. Please login again.");
            return;
        }

        const messages = await response.json();
        
        if (messages.length > lastMessageCount) {
            chatBox.innerHTML = '';
            messages.forEach(msg => {
                const div = document.createElement('div');
                div.className = 'message';
                
                const username = msg.username || msg.Username;
                const timestamp = msg.timestamp || msg.Timestamp;
                const isFile = msg.isFile || msg.IsFile;
                const content = msg.content || msg.Content;
                const fileUrl = msg.fileUrl || msg.FileUrl;
                
                let contentHTML = `<strong>${username}</strong> <span>(${timestamp})</span>: <br>`;
                
                if (isFile) {
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
        console.error('Error fetching messages:', error);
    }
}

// Send text message (POST)
async function sendMessage() {
    const content = document.getElementById('messageInput').value;
    if (!content || !currentUserToken) return;

    const message = {
        content: content,
        isFile: false
    };

    try {
        await fetch(`${API_URL}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUserToken}`
            },
            body: JSON.stringify(message)
        });

        document.getElementById('messageInput').value = '';
        fetchMessages();
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

// Upload file (POST)
async function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    if (!file || !currentUserToken) {
        alert("Please select a file before uploading!");
        return;
    }

    const formData = new FormData();
    formData.append('file', file);
    // Username is no longer sent from frontend, backend extracts it from the JWT.

    try {
        const uploadResponse = await fetch(`${API_URL}/files/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentUserToken}`
            },
            body: formData
        });
        
        if (!uploadResponse.ok) {
            throw new Error(`Server returned error: ${uploadResponse.status}`);
        }

        const result = await uploadResponse.json();

        // The backend processes the upload, now we send a chat message referencing it
        const message = {
            content: result.originalName,
            isFile: true,
            fileUrl: result.url
        };

        await fetch(`${API_URL}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUserToken}`
            },
            body: JSON.stringify(message)
        });

        fileInput.value = '';
        fetchMessages();

    } catch (error) {
        console.error('Error uploading file:', error);
        alert("An error occurred during file upload.");
    }
}

// Check if user is already logged in on page load
window.onload = function() {
    const cognitoUser = userPool.getCurrentUser();
    if (cognitoUser != null) {
        cognitoUser.getSession((err, session) => {
            if (err) {
                hideChat();
                return;
            }
            if (session.isValid()) {
                currentUserToken = session.getAccessToken().getJwtToken();
                showChat();
            }
        });
    }
};