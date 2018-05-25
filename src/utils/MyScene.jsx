import SceneManager from './SceneManager';
import * as THREE from 'three';

class MyScene extends SceneManager {
    constructor(player) {
        super();
        this.player = player;
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(800, 400);

        this.scene = this.createScene();
        this.subjects = this.createSubjects();
        
        this.state = null;
        this.track = null;
        this.time = 0;

        this.init();
    }

    async init() {
        while (!this.state)
            this.state = await this.player.getState();
        this.track = await this.player.getTrackData(this.state.track_window.current_track.id);

        console.log(this.track);

        setInterval(() => this.time += 30, 30);
        setInterval(async () => {
            const state = await this.player.getState();
            
            if (state) {
                const time = state.position;
                this.time = (Math.abs(this.time - time) > 50) ? time : this.time;
                const server = state.track_window.current_track.name;
                const current = this.state.track_window.current_track.name;
                this.state = state
                if (server !== current) {
                    this.track = await this.player.getTrackData(this.state.track_window.current_track.id);
                }
            }
        }, 1000);
    }

    get domElement() {
        return this.renderer.domElement;
    }

    createScene() {
        return new THREE.Scene();
    }

    createSubjects() {

        const camera = new THREE.PerspectiveCamera(45, 2, 0.1, 1000);
        camera.position.set(0, 0, 7);
        
        const light = new THREE.PointLight();
        light.position.set(0, 0, 7);
        this.scene.add(light);

        const cubes = [];
        
        for (let i = -2; i <= 2; i += (4 / 3)) {
            for (let j = -2; j <= 2; j += (4 / 2)) {
                const cube = new THREE.Mesh(
                    new THREE.CubeGeometry(1, 1, 1),
                    new THREE.MeshStandardMaterial()
                );
                cube.position.set(i, j, 0);
                cubes.push(cube)
                this.scene.add(cube);
            }
        }

        return {
            camera,
            light,
            cubes
        }
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        const getSegments = () => {
            if (this.track) {
                const segments = this.track.analysis.body.segments;
                const time = this.time / 1000;
                for (let i = 0; i < segments.length; i++)
                if (time >= segments[i].start && time <= segments[i].start + segments[i].duration)
                return {
                    actual: segments[i],
                    next: segments[i + 1]
                }
            }
            return null;
        }
                
        const segments = getSegments();
        if (segments) {
            const time = this.time / 1000;
            const {cubes, camera} = this.subjects;
            const {actual, next} = segments;
            for (let i = 0; i < cubes.length; i++) {
                let cube = cubes[i];
                let scaleActual = actual.pitches[i];
                let scaleNext = next ? next.pitches[i] : 0;
                const t = (time - actual.start) / (actual.duration);
                const scale = (1 - t) * scaleActual + t * scaleNext;
                cube.scale.set(scale, scale, scale);            
            }
            this.renderer.render(this.scene, camera);
        }
        
    }

}

export default MyScene;