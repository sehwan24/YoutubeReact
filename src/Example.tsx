import React from 'react';
import YouTube, { YouTubeProps } from 'react-youtube';

function Example() {
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

    return <YouTube videoId="2g811Eo7K8U" opts={opts} onReady={onPlayerReady} />;
}