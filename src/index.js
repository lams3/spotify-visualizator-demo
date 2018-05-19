import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './components/App';
import registerServiceWorker from './registerServiceWorker';

const server = 'http://localhost:8080';

async function getSpotify() {
    return new Promise(async (resolve, reject) => {
        if (window.Spotify)
            resolve(window.Spotify);
        else
            window.onSpotifyWebPlaybackSDKReady = () => {
                resolve(window.Spotify);
            }
    });
}

getSpotify()
    .then(async (spotify) => {
        const Spotify = spotify;
        
        const urlParams = new URLSearchParams(window.location.search);
        let code = urlParams.get('code');
        
        
        if (!code) {
            window.location.replace(`${server}/login`);
        }
        
        ReactDOM.render(<App spotify={Spotify} code={code} server={server}/>, document.getElementById('root'));
        registerServiceWorker();
    });

