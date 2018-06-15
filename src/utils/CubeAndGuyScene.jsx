import SceneManager from './SceneManager';
import * as THREE from 'three';

class MyScene extends SceneManager {
    constructor(player) {
        super();
        this.player = player;
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(800, 400);

        this.loaded = false;

        this.state = null;
        this.track = null;
        this.time = 0;

        this.init();
    }

    async init() {
        while (!this.state)
            this.state = await this.player.getState();
        this.track = await this.player.getTrackData(this.state.track_window.current_track.id);

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
            console.log(this.track);
        }, 1000);
    }

    get domElement() {
        return this.renderer.domElement;
    }

    createScene() {
        return new THREE.Scene();
    }

    async createSubjects() {
        const clock = new THREE.Clock();

        const camera = new THREE.PerspectiveCamera(60, 2, 0.1, 1000);
        camera.position.set(0, 3, 7);
        camera.lookAt(new THREE.Vector3(0, 0, 0));
        //console.log(camera.targe);

        const light = new THREE.PointLight();
        light.position.set(0, 3, 7);
        this.scene.add(light);

        const ambientLight = new THREE.AmbientLight(0xffffff, 1);
        this.scene.add(ambientLight);

        const groundTexture = await new THREE.TextureLoader().load('./assets/textures/ground.jpg');
        groundTexture.wrapS = THREE.RepeatWrapping;
        groundTexture.wrapT = THREE.RepeatWrapping;
        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2),
            new THREE.MeshBasicMaterial({
                map: groundTexture,
                transparent: true
            })
        );
        ground.rotateX(-Math.PI / 2);
        ground.position.y -= 2;
        this.scene.add(ground);


        const guy = await new Promise((resolve, reject) => {
            new THREE.JSONLoader().load('./assets/models/guy/eva-animated.json', (geometry, materials) => {
                for (const material of materials)
                    material.skinning = true;

                resolve(new THREE.SkinnedMesh(
                    geometry,
                    materials
                ));
            });
        });
        guy.position.y -= 2;

        const mixer = new THREE.AnimationMixer(guy);
        const action = {
            hello: mixer.clipAction(guy.geometry.animations[0]),
            idle: mixer.clipAction(guy.geometry.animations[1]),
            pose: mixer.clipAction(guy.geometry.animations[2]),
            run: mixer.clipAction(guy.geometry.animations[3]),
            walk: mixer.clipAction(guy.geometry.animations[4]),
        };

        for (const a in action) {
            action[a].setEffectiveWeight(1);
            action[a].enabled = true;
        }

        this.scene.add(guy);


        const cubes = [];

        for (let i = -2; i <= 2; i += (4 / 2)) {
            for (let j = -2; j <= 2; j += (4 / 3)) {
                const cube = new THREE.Mesh(
                    new THREE.CubeGeometry(1, 1, 1),
                    new THREE.MeshStandardMaterial()
                );
                cube.position.set(j, i, -2);
                cubes.push(cube);
                this.scene.add(cube);
            }
        }

        action.run.play();

        return {
            camera,
            light,
            cubes,
            mixer,
            clock,
            groundTexture
        }
    }

    getInfo(arr, time) {
        for (let i = 0; i < arr.length; i++) {
            if (time >= arr[i].start && time <= arr[i].start + arr[i].duration)
                return arr[i];
        }
        return null;
    }

    getInfos() {
        if (this.track) {
            const analysis = this.track.analysis.body;
            const time = this.time / 1000;
            return {
                beat: this.getInfo(analysis.beats, time),
                bar: this.getInfo(analysis.bars, time),
                tatum: this.getInfo(analysis.tatums, time),
                segment: this.getInfo(analysis.segments, time),
            }
            
        }
        return null;
    }

    async animate() {
        if (!this.loaded) {
            this.scene = await this.createScene();
            this.subjects = await this.createSubjects();
            this.loaded = true;
        }

        requestAnimationFrame(this.animate.bind(this));
        const infos = this.getInfos();
        if (infos && infos.bar && infos.beat && infos.tatum && infos.segment) {
            const {beat, bar, tatum, segment} = infos;
            const time = this.time / 1000;
            const { cubes, camera, clock, mixer, groundTexture } = this.subjects;

            groundTexture.offset.y -= 0.01;
            mixer.update(clock.getDelta());

            const s = (segment.loudness_max + 60) / 60;
            const p = segment.pitches;
            const c = new THREE.Vector3(0, 0, 0);

            for (let i = 0; i < 4; i++) {
                c.x += p[i];
                c.y += p[i + 4];
                c.z += p[i + 8];
            }
            const max = Math.max(c.x, c.y, c.z);
            const color = new THREE.Color(c.x / max, c.y / max, c.z / max);
            

            for (let i = 0; i < cubes.length; i++) {
                let cube = cubes[i];
                cube.material.color = color;
                if (i < 4) {
                    const begin = bar.start + (bar.duration / 4);
                    const end = beat.start + 3 * (bar.duration / 4);
                    const scale = (time > begin) && (time < end) ? 1 : 1 + s;
                    cube.scale.set(scale, scale, scale);
                } else if (i < 8) {
                    const begin = beat.start + (beat.duration / 4);
                    const end = beat.start + 3 * (beat.duration / 4);
                    const scale = (time > begin) && (time < end) ? 1 : 1 + s;
                    cube.scale.set(scale, scale, scale);
                } else {
                    const begin = tatum.start + (tatum.duration / 4);
                    const end = tatum.start + 3 * (tatum.duration / 4);
                    const scale = (time > begin) && (time < end) ? 1 : 1 + s;
                    cube.scale.set(scale, scale, scale);
                }

                //let scaleActual = actual.pitches[i];
                //let scaleNext = next ? next.pitches[i] : 0;
                //const t = (time - actual.start) / (actual.duration);
                //const scale = (1 - t) * scaleActual + t * scaleNext;
                //cube.scale.set(scale, scale, scale);
            }
            this.renderer.render(this.scene, camera);
        }

    }

}

export default MyScene;