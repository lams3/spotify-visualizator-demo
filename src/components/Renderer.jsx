import React, { Component } from 'react';
import SceneManager from '../utils/SceneManager';

class Renderer extends Component {

    constructor(props) {
        super(props);
        this.player = props.player;
        this.sceneManager = new props.Scene(this.player);
    }

    componentDidMount() {
        this.container.appendChild(this.sceneManager.domElement);
        this.sceneManager.animate();
    }

    render() {
        return (
            <div ref={el => this.container = el} className="Renderer">
                
            </div>
        );
    }

}

export default Renderer;