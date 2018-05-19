import React, { Component } from 'react';

class Controls extends Component {
    render() {
        return (
            <div className="Controls">
                <button
                    ref={el => this.playButton = el}
                    onClick={e => console.log('play')}
                >
                    Play
                </button>
                <button
                    ref={el => this.pauseButton = el}
                    onClick={e => console.log('pause')}
                >
                    Pause
                </button>
            </div>
        );
    }
}

export default Controls;