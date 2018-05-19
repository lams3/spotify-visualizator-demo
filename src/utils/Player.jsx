class Player {
    
    player;

    constructor(Spotify, code, server) {
        this.code = code;
        this.server = server;
        this.player = new Spotify.Player({
            name: 'Visualizer',
            getOAuthToken: callback => callback(code)
        });
    }

    async connect() {
        return await this.player.connect();
    }

    async play() {
         return await this.player.resume();
    }
        
    async pause() {
        return await this.player.pause();
    }

    async next() {
        return await this.player.nextTrack();
    }

    async seek(ms) {
        return await this.player.seek(ms);
    }

    async transfer(deviceId) {
        let request = new Request(`${this.server}/transfer/${this.code}/${deviceId}`);
        let response = await fetch(request);
        return response.json();
    }

    on(event, callback) {
        this.player.on(event, callback);
    }

}

export default Player;