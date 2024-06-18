let switchToCamera = async () => {
    let player = `<div class="video_container" id="user-container-${uid}">
                        <div class="video-player" id="user-${uid}"></div>
                    </div>`;
    displayFrame.insertAdjacentHTML('beforeend', player);

    await localTracks[0].setMuted(true);
    await localTracks[1].setMuted(true);

    document.getElementById('audio-btn').classList.remove('active');
    document.getElementById('screen-btn').classList.remove('active');

    localTracks[1].play(`user-${uid}`);
    await client.publish([localTracks[1]]);
};
