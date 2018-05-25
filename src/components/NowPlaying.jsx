import React, { Component } from 'react';

class NowPlaying extends Component {

    constructor(props) {
        super(props);
        this.player = props.player;
        this.state = {
            artist: '',
            album: '',
            track: ''
        }
    }

    componentWillMount() {
        this.player.on('player_state_changed', state => {
            const current = state.track_window.current_track;
            this.setState({
                artist: current.artists[0].name,
                album: current.album.name,
                track: current.name
            });        
        });
    }

    render() {
        return (
            <div className="NowPlaying">
                <p>Artist: {this.state.artist}</p>
                <p>Album: {this.state.album}</p>
                <p>Track: {this.state.track}</p>
            </div>
        );
    }

}

export default NowPlaying;
