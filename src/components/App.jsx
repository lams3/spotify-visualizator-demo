import React, { Component } from 'react';
import SearchBar from './SearchBar';
import Controls from './Controls';
import NowPlaying from './NowPlaying';
import Renderer from './Renderer';
import Player from '../utils/Player';
import SubdivideScene from '../utils/SubdivideScene';
import TorusScene from '../utils/TorusScene';

class App extends Component {

  constructor(props) {
    super(props);
    this.server = props.server;
    this.code = props.code;
    this.player = new Player(props.spotify, this.code, this.server);
  }

  componentWillMount() {
    this.player.connect();
    this.player.on('ready', (data) => {
      this.deviceId = data.device_id;
      this.player.transfer(this.deviceId);
    });
  }  

  render() {
    return (
      <div className="App">
        <SearchBar></SearchBar>
        <Controls player={this.player}></Controls>
        <NowPlaying player={this.player}></NowPlaying>
        <Renderer player={this.player} Scene={SubdivideScene}></Renderer>
      </div>
    );
  }

}

export default App;
