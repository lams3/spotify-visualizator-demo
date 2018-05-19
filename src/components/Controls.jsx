import React, { Component } from 'react';

class Controls extends Component {
    
    constructor(props) {
        super(props);
        this.player = props.player;
    }

    render() {
        return (
            <div className="Controls">
                <button
                    ref={el => this.playButton = el}
                    onClick={e => this.player.play()}
                >
                    Play
                </button>
                <button
                    ref={el => this.pauseButton = el}
                    onClick={e => this.player.pause()}
                >
                    Pause
                </button>
                <button
                    ref={el => this.nextButton = el}
                    onClick={e => this.player.next()}
                >
                    Next
                </button>
            </div>
        );
    }
}

export default Controls;