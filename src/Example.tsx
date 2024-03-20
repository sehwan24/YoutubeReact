import React, { useState } from 'react';
import YouTube, { YouTubeProps } from 'react-youtube';

function Example() {
    const [roomName, setRoomName] = useState(""); // 방 이름을 저장하는 상태 변수 추가

    const onPlayerReady: YouTubeProps['onReady'] = (event) => {
        event.target.pauseVideo();
    }

    const opts: YouTubeProps['opts'] = {
        height: '390',
        width: '640',
        playerVars: {
            autoplay: 1,
        },
    };

    const handleRoomNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRoomName(event.target.value); // 입력 필드 값이 변경될 때 방 이름 업데이트
    }

    const handleSubmit = () => {
        // 서버로 방 이름을 전송하는 로직 추가
        console.log("Room Name:", roomName); // 임시로 콘솔에 방 이름 출력
    }

    return (
        <div style={{ position: 'relative' }}>
            <input
                type="text"
                value={roomName}
                onChange={handleRoomNameChange}
                placeholder="방 이름을 입력하세요"
                style={{ marginBottom: '10px' }} // 입력 필드 아래 여백 추가
            />
            <button onClick={handleSubmit} style={{ position: 'absolute', top: '10px', right: '10px' }}>방 만들기</button>
            <YouTube videoId="2g811Eo7K8U" opts={opts} onReady={onPlayerReady} />
        </div>
    );
}

export default Example;
