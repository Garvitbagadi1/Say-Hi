// Function to handle member joining the room
let handleMemberJoined = async (memberid) => {
    console.log('new member joined the room:', memberid);
    await add_member(memberid);
    let members = await channel.getMembers();
    updateMemberTotal(members);
};

// Function to add a member to the UI
let add_member = async (memberid) => {
    try {
        let { name } = await RtmClient.getUserAttributesByKeys(memberid, ['name']);
        let memberWrapper = document.getElementById('member__list');
        let memberItem = `
            <div class="member__wrapper" id="member__${memberid}__wrapper">
                <span class="green__icon"></span>
                <p class="member_name">${name}</p>
            </div>`;
        memberWrapper.insertAdjacentHTML('beforeend', memberItem);
    } catch (error) {
        console.error('Error adding member:', error);
    }
};

// Function to update the total number of members
let updateMemberTotal = async (members) => {
    let total = document.getElementById('members__count');
    total.innerText = members.length;
};

// Function to handle member leaving the room
let handleMemberLeft = async (memberid) => {
    await remove_member(memberid);
    let members = await channel.getMembers();
    updateMemberTotal(members);
};

// Function to remove a member from the UI
let remove_member = async (memberid) => {
    let memberWrapper = document.getElementById(`member__${memberid}__wrapper`);
    if (memberWrapper) {
        memberWrapper.remove();
    } else {
        console.warn(`Member wrapper for ${memberid} not found.`);
    }
};

// Function to handle incoming channel messages
let handleChannelMessage = async (messageData, memberId) => {
    console.log('new message received from:', memberId);
    try {
        let data = JSON.parse(messageData.text);
        console.log('message:', data);
        displayMessage(data);
    } catch (error) {
        console.error('Error parsing message data:', error);
    }
};

// Function to send a message
let sendMessage = async (e) => {
    e.preventDefault();
    let message = e.target.message.value;
    try {
        await channel.sendMessage({ text: JSON.stringify({ 'type': 'chat', message, 'displayName': displayName }) });
        e.target.reset();
    } catch (error) {
        console.error('Error sending message:', error);
    }
};

// Function to get members and update the UI
let getMembers = async () => {
    try {
        let members = await channel.getMembers();
        updateMemberTotal(members);
        for (let i = 0; i < members.length; i++) {
            await add_member(members[i]);
        }
    } catch (error) {
        console.error('Error getting members:', error);
    }
};

// Function to leave the channel
let leaveChannel = async () => {
    try {
        await channel.leave();
        await RtmClient.logout();
    } catch (error) {
        console.error('Error leaving channel:', error);
    }
};

window.addEventListener('beforeunload', leaveChannel);

let messageForm = document.getElementById('message__form');
messageForm.addEventListener('submit', sendMessage);

// Function to scroll to the last message
let scrollToLastMessage = () => {
    let lastMessage = document.querySelector('#messages .message__wrapper:last-child');
    if (lastMessage) {
        lastMessage.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
};

// Function to display a message
let displayMessage = (data) => {
    let messagesWrapper = document.getElementById('messages');
    let messageItem = `
        <div class="message__wrapper">
            <p class="message__content"><strong>${data.displayName}</strong>: ${data.message}</p>
        </div>`;
    messagesWrapper.insertAdjacentHTML('beforeend', messageItem);
    scrollToLastMessage();
};

// Real-Time File Sharing
let handleFileSharing = async (e) => {
    e.preventDefault();
    let fileInput = e.target.file;
    let file = fileInput.files[0];
    if (file) {
        let reader = new FileReader();
        reader.onload = async (event) => {
            try {
                let fileData = event.target.result;
                await channel.sendMessage({ text: JSON.stringify({ 'type': 'file', 'fileName': file.name, 'fileData': fileData, 'displayName': displayName }) });
                fileInput.value = '';
            } catch (error) {
                console.error('Error sharing file:', error);
            }
        };
        reader.readAsDataURL(file);
    }
};

let fileForm = document.getElementById('file__form');
fileForm.addEventListener('submit', handleFileSharing);

// Collaborative Whiteboard
let whiteboard = new Whiteboard('#whiteboard-container');

let handleWhiteboardDraw = (data) => {
    whiteboard.draw(data);
};

whiteboard.on('draw', async (data) => {
    try {
        await channel.sendMessage({ text: JSON.stringify({ 'type': 'whiteboard', 'drawData': data, 'displayName': displayName }) });
    } catch (error) {
        console.error('Error sending whiteboard data:', error);
    }
});

channel.on('ChannelMessage', (messageData, memberId) => {
    let data = JSON.parse(messageData.text);
    if (data.type === 'chat') {
        displayMessage(data);
    } else if (data.type === 'file') {
        displayFile(data);
    } else if (data.type === 'whiteboard') {
        handleWhiteboardDraw(data.drawData);
    }
});

// Function to display a shared file
let displayFile = (data) => {
    let filesWrapper = document.getElementById('files');
    let fileItem = `
        <div class="file__wrapper">
            <p class="file__name"><strong>${data.displayName}</strong>: <a href="${data.fileData}" download="${data.fileName}">${data.fileName}</a></p>
        </div>`;
    filesWrapper.insertAdjacentHTML('beforeend', fileItem);
};
