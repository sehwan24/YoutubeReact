import React, {useState, useEffect, useCallback} from 'react';
import ReactDOM from 'react-dom';
import YouTube, {YouTubeEvent, YouTubeProps} from 'react-youtube';
import { Client, Stomp } from '@stomp/stompjs'; // STOMP 클라이언트 및 WebSocket 가져오기
import { Message } from '@stomp/stompjs';
import { v4 as uuidv4 } from 'uuid';


interface Room {
    roomId: string;
    roomName: string;
}


interface ChatMessage {
    type: 'ENTER' | 'TALK' | 'VIDEO' | 'URL',
    runningType: 'RUN' | 'STOP' | 'NO',
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
    const [existingTimeLines, setExistingTimeLines] = useState<string[]>([]);
    const [playerReady, setPlayerReady] = useState(false);  // 플레이어 준비 상태
    const [videoId, setVideoId] = useState('2g811Eo7K8U');
    const [inputValue, setInputValue] = useState('');


    useEffect(() => {
        console.log('plz use Effect');
        console.log(player);
        console.log(playerReady);
        if (player && playerReady) {
            console.log("Ohhhhhhh");
            try {
                const roomId = sessionStorage.getItem("roomId");
                if (roomId) {
                    joinRoom(roomId);
                } else {
                    console.error("Room ID is not available.");
                }
                sessionStorage.setItem('currentState', "RUN");
                console.log('세션 룸id' + sessionStorage.getItem("roomId"));
                player.loadVideoById(videoId, 0, 'large');
            } catch (error) {
                console.error("Error loading video:", error);
            }
        }
    }, [videoId, player, playerReady]);



    useEffect(() => {
        console.log('use Effect !!!!!!!!!!!!!!!!!!');
        sessionStorage.setItem('currentState', 'STOP');
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





    // STOMP 클라이언트가 연결되면 실행될 함수
    const handleStompMessage = (message: Message) => {
        const body: ChatMessage = JSON.parse(message.body);
        if (player) {
            player.seekTo(body.message, true);
        } else {
            console.error('YouTube 플레이어가 초기화되지 않았습니다');
        }
        console.log('1');
        if (body.type === 'VIDEO' && body.sender !== client.clientId) {
            console.log('2');
            player.seekTo(body.message, 1);
            if (body.runningType === "STOP" && sessionStorage.getItem("currentState") === "RUN") {
                console.log('3')
                player.pauseVideo();
                sessionStorage.setItem('currentState', "STOP");
            } else if (body.runningType === "RUN" && sessionStorage.getItem("currentState") === "STOP") {
                console.log('4');
                player.playVideo();
                sessionStorage.setItem('currentState', "RUN");
            }

        }
        if (body.type === 'URL' && body.sender !== client.clientId) {
            if (body.runningType === "NO") {
                setVideoId(body.message);
                sessionStorage.setItem('currentState', "STOP");
            }
        }
    };

    const joinRoom = (roomId: string) => {  //채팅방 입장 시
        console.log(roomId);
        console.log('join ! ! ! ! ! ! ! ');

        sessionStorage.setItem('roomId', roomId);

        if (stompClient) {
            // 채팅방에 입장할 때 해당 채팅방의 메시지를 구독
            const messageObject = {
                type: "ENTER",
                runningType: "NO",
                roomId: sessionStorage.getItem("roomId"),
                sender: client.clientId,
                message: "entered room"
            };
            console.log(client.clientId);
            console.log("run2")
            // STOMP 클라이언트를 통해 메시지 전송
            stompClient.publish({ destination: '/pub/chatting/message', body: JSON.stringify(messageObject) });
            stompClient.subscribe(`/sub/chatting/room/${roomId}`, handleStompMessage);
        }
    };

    const watchTimeLine = (timeLine: string) => {  //타임라인으로 이동
        console.log(timeLine);
        console.log('goto timeline');

        player.seekTo(timeLine, 1);
        if (sessionStorage.getItem('currentState') === "STOP") {
            player.playVideo();
        }
        sessionStorage.setItem('currentState', "RUN");

        if (stompClient) {
            const messageObject = {
                type: "VIDEO",
                runningType: "RUN",
                roomId: sessionStorage.getItem("roomId"),
                sender: client.clientId,
                message: timeLine
            };
            console.log(client.clientId);
            console.log("run2")
            // STOMP 클라이언트를 통해 메시지 전송
            stompClient.publish({ destination: '/pub/chatting/message', body: JSON.stringify(messageObject) });
        }
    };


    const onPlayerStateChange: YouTubeProps['onStateChange'] = (event) => {
        if (!player || !playerReady) {
            console.log("Player is not ready or not available.");
            return;
        }
        if (event.data === 1 && sessionStorage.getItem('currentState') !== "RUN") {
            // 영상이 재생 중일 때
            sessionStorage.setItem('currentState', "RUN");
            const currentTime = player.getCurrentTime(); // 현재 재생 위치를 가져옴 (초 단위)
            console.log('현재 재생 위치:', currentTime);

            // 서버로 현재 재생 위치를 보냄
            if (stompClient) {
                const messageObject = {
                    type: "VIDEO",
                    runningType: "RUN",
                    roomId: sessionStorage.getItem("roomId"),
                    sender: client.clientId,
                    message: currentTime
                };
                console.log(client.clientId);
                console.log("run2")
                // STOMP 클라이언트를 통해 메시지 전송
                stompClient.publish({ destination: '/pub/chatting/message', body: JSON.stringify(messageObject) });
            }

        } else if (event.data === 2 && sessionStorage.getItem('currentState') !== "STOP") {
            sessionStorage.setItem('currentState', "STOP");
            // 영상이 일시 정지되었을 때
            const currentTime = player.getCurrentTime(); // 현재 재생 위치를 가져옴 (초 단위)
            console.log('일시 정지된 시간:', currentTime);

            // 서버로 현재 재생 위치를 보냄 (fetch 등의 방법을 사용할 수 있음)
            if (stompClient) {
                const messageObject = {
                    type: "VIDEO",
                    runningType: "STOP",
                    roomId: sessionStorage.getItem("roomId"),
                    sender: client.clientId,
                    message: currentTime
                };
                console.log(client.clientId);
                console.log("stop2")
                // STOMP 클라이언트를 통해 메시지 전송
                stompClient.publish({ destination: '/pub/chatting/message', body: JSON.stringify(messageObject) });
            }
        }
    };



    const onPlayerReady: YouTubeProps['onReady'] = (event) => {
        console.log("Player is ready:", event.target);  // 로깅 추가
        if (!event.target) {
            console.error("YouTube Player is not initialized properly.");
            return;
        }
        setPlayer(event.target);
        setPlayerReady(true);
        event.target.pauseVideo();
    };

    const handleButtonClick4 = () => {
        const url = `http://localhost:8080/timeline/${videoId}`;
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error('HTTP 오류 ' + response.status);
                }
                return response.json();
            })
            .then((data: string[]) => {
                setExistingTimeLines(data);
            })
            .catch(error => {
                console.error('에러 발생:', error);
            });
    }

    const handleButtonClick3 = () => {
        fetch('http://localhost:8080/timeline/new', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ videoId: videoId , timeLine: player.getCurrentTime()})
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('HTTP Error ' + response.status);
                }
                return response.json();
            })
            .then(data => {
                console.log('타임라인 전송 완료:', data);
            })
            .catch(error => {
                console.error('에러 발생:', error);
            });

    };



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


    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(event.target.value);
    }

    const updateVideoId = () => {
        //player.loadVideoByUrl(inputValue);
        const videoIdFromURL =
            inputValue.split('?v=').length > 1 ? inputValue.split('?v=')[1].split('&')[0] : false;
        if (videoIdFromURL && playerReady) {
            setVideoId(videoIdFromURL);
        }

        if(videoIdFromURL) {
            if (stompClient) {
                const messageObject = {
                    type: "URL",
                    runningType: "NO",
                    roomId: sessionStorage.getItem("roomId"),
                    sender: client.clientId,
                    message: videoIdFromURL
                };
                // STOMP 클라이언트를 통해 메시지 전송
                stompClient.publish({ destination: '/pub/chatting/message', body: JSON.stringify(messageObject) });
            }
        }
    };


    const opts: YouTubeProps['opts'] = {
        height: '390',
        width: '640',
        playerVars: {
            autoplay: 1,
            origin: window.location.origin,
        },
    };

    return (
        <div>
            <YouTube
                videoId={videoId}
                opts={opts}
                onReady={onPlayerReady}
                onStateChange={onPlayerStateChange}
            />
            <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                placeholder="YouTube 비디오 링크를 입력하세요"
                style={{ width: '30%', marginRight: '10px' }}
            />
            <button
                onClick={updateVideoId}>시청하기 </button>

            <div>
                <input
                    type="text"
                    value={roomName}
                    onChange={handleRoomNameChange}
                    placeholder="방 이름을 입력하세요"
                    style={{ width: '30%', marginRight: '10px' }}
                />
                <button
                    style={{ marginRight: '10px' }}
                    onClick={handleButtonClick}>방 만들기 </button>

                <button onClick={handleButtonClick2}>방 목록 조회</button>
            </div>

            <div>
                <button onClick={handleButtonClick3}>타임라인 추가</button>
                <button
                    style={{ marginRight: '10px' }}
                    onClick={handleButtonClick4}>타임라인 조회</button>
            </div>

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
                <h2>타임 라인</h2>
                <ul>
                    {existingTimeLines.map((timeline, index) => (
                        <li key={index}>
                            <button onClick={() => watchTimeLine(timeline)}> 시청하기 {timeline}</button>
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
