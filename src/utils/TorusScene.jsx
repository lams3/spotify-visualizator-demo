import * as THREE from 'three';
import SceneManager from './SceneManager';
import {OrbitControls, ShaderPass, RenderPass, EffectComposer, CopyShader, BloomPass, HorizontalBlurShader, VerticalBlurShader} from 'three-addons';

export default class TorusScene extends SceneManager {
    
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
        const {tatum, beat, bar, segment, section, energy, valence, danceability} = infos;
        if (infos && tatum && beat && bar && segment && section && energy && valence && danceability) {
            const {tatumTorus, beatTorus, barTorus, camera, light} = this.subjects;
            light.position.copy(camera.position);
            const color = this.getColor(segment);
            this.setGeometry(segment, tatum, tatumTorus, 1 / 2, new THREE.Color(1, 0, 0));
            this.setGeometry(segment, beat, beatTorus, 1 / 4, new THREE.Color(0, 1, 0));
            this.setGeometry(segment, bar, barTorus, 1 / 8, new THREE.Color(0, 0, 1));
            const delta = this.clock.getDelta();
            barTorus.rotateX(energy * delta);
            barTorus.rotateY(energy * delta);
            barTorus.rotateZ(energy * delta);
            beatTorus.rotateX(danceability * delta);
            beatTorus.rotateY(danceability * delta);
            beatTorus.rotateZ(danceability * delta);
            tatumTorus.rotateX(valence * delta);
            tatumTorus.rotateY(valence * delta);
            tatumTorus.rotateZ(valence * delta);
        }
    }
    
    reset() {
        if (!this.loaded) return;
        for (const k in this.subjects)
            if (this.subjects[k] instanceof THREE.Mesh)
                this.subjects[k].scale.set(1, 1, 1);
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
        bloom.enabled = true;
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
        const displace = (geometry, amount) => {
            for (const v of geometry.vertices) {
                const toAdd = new THREE.Vector3(Math.random(), Math.random(), Math.random());
                toAdd.normalize();
                v.addScaledVector(toAdd, amount * (2 * Math.random() - 1));
            }
            return geometry;
        }

        const camera = new THREE.PerspectiveCamera(60, 2, 0.1, 1000);
        camera.position.set(0, 0, 25);
        
        const controls = new OrbitControls(camera);
        
        const light = new THREE.PointLight();
        this.scene.add(light);
        light.position.set(0, 0, 25);
        
        const tatumTorus = new THREE.Mesh(
            new THREE.TorusGeometry(3, 1, 10, 20),
            new THREE.MeshBasicMaterial({ wireframe: true, transparent: true })
        );
        tatumTorus.backupGeo = tatumTorus.geometry;
        tatumTorus.dispGeo = displace(tatumTorus.geometry.clone(), 1);
        this.scene.add(tatumTorus);
        tatumTorus.rotateX(Math.PI / 2);
        
        const beatTorus = new THREE.Mesh(
            new THREE.TorusGeometry(6, 1, 10, 20),
            new THREE.MeshBasicMaterial({ wireframe: true, transparent: true })
        );
        beatTorus.backupGeo = beatTorus.geometry;
        beatTorus.dispGeo = displace(beatTorus.geometry.clone(), 2);
        this.scene.add(beatTorus);
        
        const barTorus = new THREE.Mesh(
            new THREE.TorusGeometry(9, 1, 10, 20),
            new THREE.MeshBasicMaterial({ wireframe: true, transparent: true })
        );
        barTorus.backupGeo = barTorus.geometry;
        barTorus.dispGeo = displace(barTorus.geometry.clone(), 3);
        this.scene.add(barTorus);
        barTorus.rotateY(Math.PI / 2);

        return {
            camera,
            controls,
            light,
            tatumTorus,
            beatTorus,
            barTorus
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

    setGeometry(segment, param, object, tolerance, color) {
        tolerance /= 2;
        const time = this.time / 1000;
        const begin = param.start + tolerance * param.duration;
        const end = (param.start + param.duration) - tolerance * param.duration;
        if (time > begin && time < end) {
            //object.geometry = object.backupGeo;
            object.material.opacity = 0.2;
            object.material.color = new THREE.Color(1, 1, 1);
            object.material.wireframe = true;
            object.changedState = false;
        } else if (!object.changedState) {
            object.material.opacity = 1;
            object.material.wireframe = false;
            object.material.color = new THREE.Color(Math.random(), Math.random(), Math.random());
            object.changedState = true;
            //object.geometry = object.dispGeo;
        }
    }
}