import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import YouTube, { YouTubeProps } from 'react-youtube';

function Example() {
    const [player, setPlayer] = useState<any>(null); // YouTube 플레이어 인스턴스를 상태로 관리

    const onPlayerReady: YouTubeProps['onReady'] = (event) => {
        setPlayer(event.target);
        event.target.pauseVideo();
    }

    const onPlayerStateChange: YouTubeProps['onStateChange'] = (event) => {
        if (event.data === 1) {
            // 영상이 재생 중일 때
            const currentTime = player.getCurrentTime(); // 현재 재생 위치를 가져옴 (초 단위)
            console.log('현재 재생 위치:', currentTime);

            // 서버로 현재 재생 위치를 보냄 (fetch 등의 방법을 사용할 수 있음)
        } else if (event.data === 2) {
            // 영상이 일시 정지되었을 때
            const currentTime = player.getCurrentTime(); // 현재 재생 위치를 가져옴 (초 단위)
            console.log('일시 정지된 시간:', currentTime);

            // 서버로 현재 재생 위치를 보냄 (fetch 등의 방법을 사용할 수 있음)
        }
    }

    const opts: YouTubeProps['opts'] = {
        height: '390',
        width: '640',
        playerVars: {
            autoplay: 1,
        },
    };

    return (
        <YouTube
            videoId="2g811Eo7K8U"
            opts={opts}
            onReady={onPlayerReady}
            onStateChange={onPlayerStateChange}
        />
    );
}

ReactDOM.render(
    <React.StrictMode>
        <Example />
    </React.StrictMode>,
    document.getElementById('root')
);
