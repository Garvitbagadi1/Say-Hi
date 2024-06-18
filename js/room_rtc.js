const APP_ID = "d40799f380f548e694cb91a0229049c6";

let uid = sessionStorage.getItem('uid');
if (!uid) {
    uid = String(Math.floor(Math.random() * 10000));
    sessionStorage.setItem('uid', uid);
}
let token = null;
let client;
let RtmClient;
let channel;

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
let roomId = urlParams.get('room');

if (!roomId) {
    roomId = 'main';
}

let localTracks = [];
let remoteUsers = {};
let localScreenTrack = null;
let shareScreen = false;

let joinRoomInit = async () => {
    try {
        RtmClient = await AgoraRTM.createInstance(APP_ID);
        await RtmClient.login({ uid, token });

        await RtmClient.addOrUpdateLocalUserAttributes({ 'name': display_name });

        channel = await RtmClient.createChannel(roomId);
        await channel.join();

        channel.on('MemberJoined', handleMemberJoined);
        channel.on('MemberLeft', handleMemberLeft);
        channel.on('ChannelMessage',handleChannelMessage)
        getMembers()
        
        client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        await client.join(APP_ID, roomId, token, uid);

        client.on('user-published', handleUserPublished);
        client.on('user-left', handleUserLeft);
    } catch (error) {
        console.error("Error joining the room:", error);
    }
};

let joinStream = async () => {
    try {
        document.getElementById('join-btn')
.style.display='none'
document.getElementsByClassName('stream__actions')[0].style.display= 'flex'
        
        localTracks = await AgoraRTC.createMicrophoneAndCameraTracks({}, {
            encodeConfig: {
                width: { min: 640, ideal: 1920, max: 1920 },
                height: { min: 480, ideal: 1080, max: 1080 }
            }
        });

        let player = `
            <div class="video_container" id="user-container-${uid}">
                <div class="video-player" id="user-${uid}"></div>
            </div>`;
        document.getElementById('streams__container').insertAdjacentHTML('beforeend', player);
        document.getElementById(`user-container-${uid}`).addEventListener('click', expandVideoFrame);

        // Audio: index 0, Video: index 1
        localTracks[1].play(`user-${uid}`);
        await client.publish(localTracks);
    } catch (error) {
        console.error("Error joining the stream:", error);
    }
};

let display_name = sessionStorage.getItem('display_name');
if (!display_name) {
    window.location = 'lobby.html';
}

let handleUserPublished = async (user, mediaType) => {
    try {
        remoteUsers[user.uid] = user;
        await client.subscribe(user, mediaType);

        let player = document.getElementById(`user-container-${user.uid}`);
        if (player === null) {
            player = `
                <div class="video_container" id="user-container-${user.uid}">
                    <div class="video-player" id="user-${user.uid}"></div>
                </div>`;
            document.getElementById('streams__container').insertAdjacentHTML('beforeend', player);
            document.getElementById(`user-container-${user.uid}`).addEventListener('click', expandVideoFrame);
        }

        if (mediaType === 'video') {
            user.videoTrack.play(`user-${user.uid}`);
        } else if (mediaType === 'audio') {
            user.audioTrack.play();
        }
    } catch (error) {
        console.error("Error handling user published:", error);
    }
};

let handleUserLeft = async (user) => {
    try {
        delete remoteUsers[user.uid];
        let userContainer = document.getElementById(`user-container-${user.uid}`);
        if (userContainer) {
            userContainer.remove();
        }
        if (userIdInDisplayFrame === `user-container-${user.uid}`) {
            displayFrame.style.display = null;

            let videoFrame = document.getElementsByClassName('video_container');
            for (let i = 0; i < videoFrame.length; i++) {
                videoFrame[i].style.height = '300px';
                videoFrame[i].style.width = '300px';
            }
        }
    } catch (error) {
        console.error("Error handling user left:", error);
    }
};

let toggleCamera = async (event) => {
    try {
        let button = event.currentTarget;
        if (localTracks[1].muted) {
            await localTracks[1].setMuted(false);
            button.classList.add('active');
        } else {
            await localTracks[1].setMuted(true);
            button.classList.remove('active');
        }
    } catch (error) {
        console.error("Error toggling camera:", error);
    }
};

let toggleMic = async (event) => {
    try {
        let button = event.currentTarget;
        if (localTracks[0].muted) {
            await localTracks[0].setMuted(false);
            button.classList.add('active');
        } else {
            await localTracks[0].setMuted(true);
            button.classList.remove('active');
        }
    } catch (error) {
        console.error("Error toggling microphone:", error);
    }
};

let toggleScreen = async (event) => {
    try {
        let screenButton = event.currentTarget;
        let cameraButton = document.getElementById('camera-btn');

        if (!shareScreen) {
            // Start screen sharing
            shareScreen = true;
            screenButton.classList.add('active');
            cameraButton.style.display = 'none';

            localScreenTrack = await AgoraRTC.createScreenVideoTrack();

            document.getElementById(`user-container-${uid}`).remove();

            let player = `
                <div class="video_container" id="user-container-${uid}">
                    <div class="video-player" id="user-${uid}"></div>
                </div>`;
            displayFrame.insertAdjacentHTML('beforeend', player);
            document.getElementById(`user-container-${uid}`).addEventListener('click', expandVideoFrame);
            userIdInDisplayFrame = `user-container-${uid}`;

            localScreenTrack.play(`user-${uid}`);

            await client.unpublish([localTracks[1]]);
            await client.publish([localScreenTrack]);

            let videoFrame = document.getElementsByClassName('video_container');
            for (let i = 0; i < videoFrame.length; i++) {
                videoFrame[i].style.height = '100px';
                videoFrame[i].style.width = '100px';
            }
        } else {
            // Stop screen sharing
            shareScreen = false;
            cameraButton.style.display = 'block';
            screenButton.classList.remove('active');
            document.getElementById(`user-container-${uid}`).remove();
            await client.unpublish([localScreenTrack]);
            switchToCamera();
        }
    } catch (error) {
        console.error("Error toggling screen sharing:", error);
    }
};

let leaveStream=async(e)=>{
    e.preventDefault()
    document.getElementById('join-btn')
.style.display='block'
document.getElementsByClassName('stream__actions')[0].style.display= 'none'
    for(let i=0;localTracks.length>i;i++){
        localTracks[i].stop()
        localTracks[i].close()
    }
    await client.unpublish([localTracks[0],localTracks[1]])
    if (localScreenTrack){
        await client.unpublish([localScreenTrack])
    }
    document.getElementById(`user-container-${uid}`).remove()
    if(userIdInDisplayFrame === `user-container-${uid}`){
        displayFrame.style.display = null
        for(let i=0;i<videoFrame.length;i++){
    videoFrame[i].style.height='300px'
    videoFrame[i].style.width='300px'
  }
    }
    channel.sendMessage({text:JSON.stringify({'type':'user_left','uid':uid})})
}

document.getElementById('camera-btn').addEventListener('click', toggleCamera);
document.getElementById('audio-btn').addEventListener('click', toggleMic);
document.getElementById('screen-btn').addEventListener('click', toggleScreen);
document.getElementById('join-btn').addEventListener('click',joinStream)
document.getElementById('leave-btn').addEventListener('click',leaveStream)
joinRoomInit();
