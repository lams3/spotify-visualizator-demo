import * as THREE from 'three';
import SceneManager from './SceneManager';
import { OrbitControls, ShaderPass, RenderPass, EffectComposer, CopyShader, BloomPass, HorizontalBlurShader, VerticalBlurShader } from 'three-addons';

export default class SubdivideScene extends SceneManager {

    constructor(player) {
        super();
        this.player = player;

        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(800, 400);

        this.clock = new THREE.Clock();

        this.loaded = false;

        this.scene = null;
        this.subjects = null;

        this.changedState = false;
        this.clock = new THREE.Clock();

        this.state = null;
        this.track = null;
        this.time = 0;
    }

    get domElement() {
        return this.renderer.domElement;
    }

    async animate() {
        if (!this.loaded)
            await this.init()

        requestAnimationFrame(this.animate.bind(this));
        //this.renderer.render(this.scene, this.subjects.camera);
        this.composer.render();

        const infos = this.getInfos();
        const { tatum, beat, bar, segment, section, energy, valence, danceability } = infos;
        if (infos && tatum && beat && bar && segment && section && energy && valence && danceability) {
            this.subdivide(segment, beat, this.subjects.ball, 1 / 4);
            const delta = this.clock.getDelta();
            this.scene.traverse(child => {
                if (child !== this.scene) {
                    child.rotateZ(delta * energy);
                }
            });
        }
    }

    reset() {
        if (this.loaded){
            while (this.scene.children.length > 0)
                this.scene.remove(this.scene.children[0]);

            this.subjects.ball = new THREE.Mesh(
                new THREE.SphereGeometry(12, 32, 32),
                new THREE.MeshStandardMaterial()
            );
            this.scene.add(this.subjects.ball);
            console.log(this.scene);
        }
    }

    async init() {
        while (!this.state)
            this.state = await this.player.getState();
        this.track = await this.player.getTrackData(this.state.track_window.current_track.id);

        setInterval(() => this.time += 30, 30);
        setInterval(async () => {
            const newState = await this.player.getState();

            if (newState) {
                const time = newState.position;
                this.time = (Math.abs(this.time - time) > 50) ? time : this.time;
                const server = newState.track_window.current_track.name;
                const current = this.state.track_window.current_track.name;
                this.state = newState
                if (server !== current) {
                    this.track = await this.player.getTrackData(this.state.track_window.current_track.id);
                    this.reset();
                }
            }
            console.log(this.track);
        }, 1000);

        this.scene = new THREE.Scene();
        this.subjects = this.getSubjects();

        this.initPostProcessing();

        this.loaded = true;
        return;
    }

    initPostProcessing() {
        var hBlur = new ShaderPass(HorizontalBlurShader);
        hBlur.enabled = false;
        hBlur.uniforms.h.value = 1 / 400;
        var vBlur = new ShaderPass(VerticalBlurShader);
        vBlur.enabled = false;
        vBlur.uniforms.v.value = 1 / 800;
        var bloom = new BloomPass();
        bloom.enabled = false;
        var renderPass = new RenderPass(this.scene, this.subjects.camera);
        var effectCopy = new ShaderPass(CopyShader);
        effectCopy.renderToScreen = true;
        const composer = new EffectComposer(this.renderer);
        composer.addPass(renderPass);
        composer.addPass(hBlur);
        composer.addPass(vBlur);
        composer.addPass(bloom);
        composer.addPass(effectCopy);
        this.composer = composer;
    }

    getSubjects() {
        const camera = new THREE.PerspectiveCamera(60, 2, 0.1, 1000);
        camera.position.set(0, 0, 25);

        const controls = new OrbitControls(camera);

        const light = new THREE.PointLight();
        this.scene.add(light);
        light.position.set(0, 0, 25);

        const ball = new THREE.Mesh(
            new THREE.SphereGeometry(12, 32, 32),
            new THREE.MeshStandardMaterial()
        );
        ball.radius = 12;
            
        this.scene.add(ball);

        return {
            camera,
            controls,
            light,
            ball
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
                section: this.getInfo(analysis.sections, time),
                energy: this.track.features.body.energy,
                danceability: this.track.features.body.danceability,
                valence: this.track.features.body.valence
            }
        }
        return null;
    }

    getColor(segment) {
        const p = segment.pitches;
        const c = new THREE.Vector3(0, 0, 0);

        for (let i = 0; i < 4; i++) {
            c.x += p[i];
            c.y += p[i + 4];
            c.z += p[i + 8];
        }
        const max = Math.max(c.x, c.y, c.z);
        return new THREE.Color(c.x / max, c.y / max, c.z / max);
    }

    subdivide(segment, param, object, tolerance) {
        if (object.children.length === 0) {
            tolerance /= 2;
            const time = this.time / 1000;
            const begin = param.start + tolerance * param.duration;
            const end = (param.start + param.duration) - tolerance * param.duration;
            if (time > begin && time < end) {
                this.changedState = false;
            } else if (!this.changedState) {
                object.geometry.dispose();
                object.geometry = new THREE.Geometry();
                for (let i = 0; i < 8; i++) {
                    const obj = new THREE.Mesh(
                        new THREE.SphereGeometry(object.radius / 2, 32, 32),
                        new THREE.MeshStandardMaterial()
                    );
                    obj.radius = object.radius / 2;
                    object.add(obj);
                }
                object.children[0].position.x = object.radius / 2;
                object.children[1].position.x = -object.radius / 2;
                object.children[2].position.y = object.radius / 2;
                object.children[3].position.y = -object.radius / 2;
                object.children[4].position.x = object.radius / 2;
                object.children[4].position.y = object.radius / 2;
                object.children[5].position.x = -object.radius / 2;
                object.children[5].position.y = -object.radius / 2;
                object.children[6].position.x = object.radius / 2;
                object.children[6].position.y = -object.radius / 2;
                object.children[7].position.x = -object.radius / 2;
                object.children[7].position.y = object.radius / 2;
                this.changedState = true;
            }
        } else {
            const index = Math.floor(Math.random() * object.children.length);
            this.subdivide(segment, param, object.children[index], tolerance);
        }
    }
}