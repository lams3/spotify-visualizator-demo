import React, { Component } from 'react';
import SearchBar from './SearchBar';
import Controls from './Controls';
import NowPlaying from './NowPlaying';
import Renderer from './Renderer';

class App extends Component {

  render() {
    return (
      <div className="App">
        <SearchBar></SearchBar>
        <Controls></Controls>
        <NowPlaying></NowPlaying>
        <Renderer></Renderer>
      </div>
    );
  }

}

export default App;
