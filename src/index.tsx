import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import YouTube, { YouTubeProps } from 'react-youtube';
import { Client, Stomp } from '@stomp/stompjs'; // STOMP 클라이언트 및 WebSocket 가져오기
import { Message } from '@stomp/stompjs';
import { v4 as uuidv4 } from 'uuid';

interface Room {
    roomId: string;
    roomName: string;
}

// 메시지의 형식을 정의합니다. 예를 들어, JSON 형식을 가정합니다.
interface ChatMessage {
    // 메시지의 속성에 따라 타입을 정의합니다.
    // 이 예시에서는 메시지 텍스트만 고려합니다.
    type: 'ENTER' | 'TALK',
    runningType: 'RUN' | 'STOP',
    count : number,
    roomId : string,
    sender : string,
    message: string;
}

function Example() {

    const [player, setPlayer] = useState<any>(null);
    const [stompClient, setStompClient] = useState<Client | null>(null); // STOMP 클라이언트 상태 추가
    const [roomName, setRoomName] = useState("");
    const [messages, setMessages] = useState<string[]>([]);
    const [existingRooms, setExistingRooms] = useState<Room[]>([]);
    const [count] = useState<number>(0);

    useEffect(() => {
        // WebSocket을 사용하여 STOMP 클라이언트 생성
        const client = Stomp.client('ws://localhost:8080/ws');
        // STOMP 클라이언트에 대한 설정
        client.debug = (msg: string) => console.log(msg); // 디버그 메시지 출력
        client.connect({}, () => {
            console.log('STOMP 연결 성공');
            setStompClient(client); // 연결된 클라이언트 설정
        });

        return () => {
            if (stompClient) {
                stompClient.deactivate(); // 컴포넌트가 언마운트될 때 클라이언트 연결 종료
            }
        };
    }, []);

    // 클라이언트 객체 생성
    const client = {
        clientId: uuidv4(), // 고유한 클라이언트 식별자 생성
        name: "ClientName", // 클라이언트 이름 등
        // 기타 필요한 클라이언트 정보
    };



    const joinRoom = (roomId: string) => {
        console.log(roomId);

        if (stompClient) {
            // 채팅방에 입장할 때 해당 채팅방의 메시지를 구독
            stompClient.subscribe(`/sub/chatting/room/${roomId}`, handleStompMessage);
        }
    }

    // STOMP 클라이언트가 연결되면 실행될 함수
    const handleStompMessage = (message: Message) => {
        // Message.body는 문자열 형태이므로 JSON 파싱이 필요합니다.
        const body: ChatMessage = JSON.parse(message.body);
        // 받은 메시지를 적절히 처리합니다.
        console.log('Received message:', body.message);
        if (body.type == 'TALK' && body.sender != client.clientId) {
            player.seekTo(body.message, 1);
            if (body.runningType == "STOP") {
                player.pauseVideo();
                console.log(client.clientId);
                console.log("stop");
            } else if (body.runningType == "RUN") {
                player.playVideo();
                console.log(client.clientId);
                console.log("run");
            }

        }
    };


    const onPlayerStateChange: YouTubeProps['onStateChange'] = (event) => {
        if (event.data === 1) {
            // 영상이 재생 중일 때
            const currentTime = player.getCurrentTime(); // 현재 재생 위치를 가져옴 (초 단위)
            console.log('현재 재생 위치:', currentTime);

            // 서버로 현재 재생 위치를 보냄 (fetch 등의 방법을 사용할 수 있음)
            if (stompClient) {
                const messageObject = {
                    type: "TALK",
                    runningType: "RUN",
                    count: 0,
                    roomId: "67be7fb6-3040-475e-aa83-676d0922e5fe",
                    sender: client.clientId,
                    message: currentTime
                };
                console.log(client.clientId);
                console.log("run2")
                // STOMP 클라이언트를 통해 메시지 전송
                stompClient.publish({ destination: '/pub/chatting/message', body: JSON.stringify(messageObject) });
            }

        } else if (event.data === 2) {
            // 영상이 일시 정지되었을 때
            const currentTime = player.getCurrentTime(); // 현재 재생 위치를 가져옴 (초 단위)
            console.log('일시 정지된 시간:', currentTime);

            // 서버로 현재 재생 위치를 보냄 (fetch 등의 방법을 사용할 수 있음)
            if (stompClient) {
                const messageObject = {
                    type: "TALK",
                    runningType: "STOP",
                    count: 0,
                    roomId: "67be7fb6-3040-475e-aa83-676d0922e5fe",
                    sender: client.clientId,
                    message: currentTime
                };
                console.log(client.clientId);
                console.log("stop2")
                // STOMP 클라이언트를 통해 메시지 전송
                stompClient.publish({ destination: '/pub/chatting/message', body: JSON.stringify(messageObject) });
            }
        }
    }


    const onPlayerReady: YouTubeProps['onReady'] = (event) => {
        setPlayer(event.target);
        event.target.pauseVideo();
    }

    const handleButtonClick2 = () => {
        fetch('http://localhost:8080/chatting/rooms')
            .then(response => {
                if (!response.ok) {
                    throw new Error('HTTP 오류 ' + response.status);
                }
                return response.json();
            })
            .then((data: Room[]) => {
                setExistingRooms(data);
            })
            .catch(error => {
                console.error('에러 발생:', error);
            });
    }

    const handleButtonClick = () => {
        console.log('방 이름:', roomName);

        // HTTP POST 요청 보내기
        fetch('http://localhost:8080/chatting/room', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: roomName })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('HTTP Error ' + response.status);
                }
                return response.json();
            })
            .then(data => {
                console.log('방 이름 전송 완료:', data);
            })
            .catch(error => {
                console.error('에러 발생:', error);
            });
    }

    const handleRoomNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRoomName(event.target.value);
    }

    const opts: YouTubeProps['opts'] = {
        height: '390',
        width: '640',
        playerVars: {
            autoplay: 1,
        },
    };

    return (
        <div>
            <YouTube
                videoId="2g811Eo7K8U"
                opts={opts}
                onReady={onPlayerReady}
                onStateChange={onPlayerStateChange}
            />
            <input
                type="text"
                value={roomName}
                onChange={handleRoomNameChange}
                placeholder="방 이름을 입력하세요"
                style={{ margin: '10px 0' }}
            />
            <button onClick={handleButtonClick}>방 만들기</button>

            <button onClick={handleButtonClick2}>방 목록 조회</button>

            <div>
                <h2>현재 있는 방</h2>
                <ul>
                    {existingRooms.map((room, index) => (
                        <li key={index}>
                            <button onClick={() => joinRoom(room.roomId)}> 입장하기 {room.roomName}</button>
                        </li>
                    ))}
                </ul>
            </div>

            <div>
                <h2>채팅 메시지</h2>
                <ul>
                    {messages.map((message, index) => (
                        <li key={index}>{message}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

ReactDOM.render(
    <React.StrictMode>
        <Example />
    </React.StrictMode>,
    document.getElementById('root')
);
