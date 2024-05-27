import Phaser from 'phaser'
import ObstaclesController from '../scripts/ObstaclesController';
import PlayerController from '../scripts/PlayerController';
import MonsterController from '../scripts/MonsterController';
import FireController from '../scripts/FireController';
import FlowerController from '../scripts/FlowerController';
import PlantController from '../scripts/PlantController';
import FireWalkerController from '~/scripts/FireWalkerController';
import CrabController from '../scripts/CrabController';
import BirdController from '../scripts/BirdController';
import BatController from '../scripts/BatController';
import DragonController from '../scripts/DragonController';
import BombController from '../scripts/BombController';
import * as SceneFactory from '../scripts/SceneFactory';
import * as AlignmentHelper from '../scripts/AlignmentHelper';
import ZeppelinController from '~/scripts/ZeppelinController';
import TNTController from '~/scripts/TNTController';
import BearController from '~/scripts/BearController';
import CrowController from '~/scripts/CrowController';
import FlyController from '~/scripts/FlyController';
import SawController from '~/scripts/SawController';
import { sharedInstance as events } from '../scripts/EventManager';
import BaseScene from './BaseScene';
import LavaController from '~/scripts/LavaController';
import NeonController from '~/scripts/NeonController';
import { PlayerStats } from './PlayerStats';

export default class WarpLevel extends BaseScene {

    private info!: PlayerStats;
    private map!: Phaser.Tilemaps.Tilemap;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private player?: Phaser.Physics.Matter.Sprite;
    private playerController?: PlayerController;
    private obstaclesController!: ObstaclesController;
    private playerX = -1;
    private playerY = -1;
    private objects: Phaser.Physics.Matter.Sprite[] = [];
    private sounds!: Map<string, Phaser.Sound.BaseSound>;
    
    private ground1!: Phaser.Tilemaps.TilemapLayer;
    private layer1!: Phaser.Tilemaps.TilemapLayer;

    constructor() {
        super('warp');
    }

    init() {

        super.init();

        this.cursors = this.input.keyboard?.createCursorKeys();

        this.obstaclesController = new ObstaclesController();
        this.objects = [];
        this.sounds = new Map<string, Phaser.Sound.BaseSound>();

        this.info = {
            'lastHealth': 100,
            'highScorePoints': 0,
            'coinsCollected': 0,
            'carrotsCollected': 0,
            'currLevel': 99,
            'scorePoints': 0,
            'livesRemaining': 3,
            'invincibility': false,
            'speedUp': false,
            'powerUp': false,
            'throw': false,
            'pokeBall': false,
            'voice': false,
        };

        const data = window.localStorage.getItem('ra8bit.stats');
        if (data != null) {
            const obj = JSON.parse(data);
            this.info = obj as PlayerStats;
        }

        this.info.currLevel = 99;

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.destroy();
        });

    }

    preload() {
        
        SceneFactory.preload(this);
        
        this.load.image('clouds2', 'assets/clouds2.webp');
        this.load.atlas('neon', 'assets/neon2.webp', 'assets/neon2.json');
        this.load.tilemapTiledJSON('tilemap8', 'assets/map8.json');
    }

    create() {

        super.create();

        this.sounds = SceneFactory.setupSounds(this);

        SceneFactory.playRandomMusic(this);

        this.scene.launch('ui');

        this.events.on('player-jumped', this.playerJumped, this);

        const { width, height } = this.scale;
        const totalWidth = 55 * 64;
        const hei = 24 * 64;
        const s = 1;

        AlignmentHelper.createAligned(this, totalWidth, hei,"clouds2", 0.5 / s,s); //mountain

        this.map = this.make.tilemap({ key: 'tilemap8', tileWidth: 64, tileHeight: 64 });
        const groundTiles = this.map.addTilesetImage('ground', 'groundTiles', 64, 64, 0, 2);
        const propTiles = this.map.addTilesetImage('props', 'propTiles', 64, 64, 0, 2);
        const grasTiles = this.map.addTilesetImage('gras-purple', 'grasPurpleTiles', 64, 64, 0, 2);
        
        this.ground1 = this.map.createLayer('ground', [groundTiles,grasTiles]);
        this.layer1 = this.map.createLayer('layer1', [groundTiles,grasTiles]);
     
        this.ground1.setCollisionByProperty({ collides: true, recalculateFaces: false });
       
        this.map.createLayer('obstacles', propTiles);
        this.layer1.setDepth(10);

        const playerCat = 2;
        const enemyCat = 4;

        const collideWith = [1, playerCat];
        super.initManager(this.map);

        this.playerX = -1;
        this.playerY = -1;

        const objectsLayer = this.map.getObjectLayer('objects');
        objectsLayer?.objects.forEach(objData => {

            const { x = 0, y = 0, name, width = 0, height = 0 } = objData;
        
            switch (name) {
                case 'player1-spawn':
                case 'player2-spawn':
                case 'player-spawn': {
                    this.player = SceneFactory.createPlayer(this,
                        (this.playerX == -1 ? x : this.playerX),
                        (this.playerY == -1 ? y : this.playerY),
                        width, height, playerCat);

                    this.playerController = new PlayerController(
                        this,
                        this.player,
                        this.cursors,
                        this.obstaclesController,
                        this.sounds,
                        this.map,
                        this.info
                    );
                    this.playerController.setCollideWith(playerCat);
                    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
                    this.cameras.main.startFollow(this.player, true);
                    this.cameras.main.setAlpha(1);
                    this.cameras.main.setViewport(0, 0, 1280, 640);
                    this.cameras.main.setZoom(1.0);
                    this.cameras.main.roundPixels = true;

                    break;
                }
                default:
                    break;
            }
        });

        
        this.matter.world.convertTilemapLayer(this.ground1, { label: 'ground', friction: 0, frictionStatic: 0 });
        this.matter.world.setBounds(0,0,this.map.widthInPixels, this.map.heightInPixels, 1, true, true,false, false);

        objectsLayer?.objects.forEach(objData => {
            const { x = 0, y = 0, name, width = 0, height = 0, rotation = 0 } = objData;
            switch (name) {
                default:
                    super.push( SceneFactory.basicCreateCreature(this, name, x, y, width, height, rotation, enemyCat, collideWith, this.obstaclesController, objData, this.playerController, this.map) );
                    
                    SceneFactory.basicCreate(this, name, x, y, width, height, rotation, enemyCat, collideWith, this.obstaclesController, objData, this.playerController, this.map);

                    break;
            }
        });
        this.emitCollisionEvents();

        this.playerController?.setJoystick(this, width);

    }

    preDestroy() {
        this.obstaclesController.destroy(this);
    }
    
    destroy() {

        super.destroy();

        this.events.off('player-jumped', this.playerJumped, this);

        this.playerController?.destroy();

        this.objects.forEach(obj => obj.destroy());
        
        this.ground1.destroy();
        this.layer1.destroy();
        this.map.destroy();
        
        this.sounds.clear();
    }

    update(time: number, deltaTime: number) {

        super.update(time,deltaTime);

        if(!super.doStep(time,deltaTime))
            return;
    
        this.playerController?.update(deltaTime);

        SceneFactory.cullSprites(this);
    }

    playerJumped() {
        SceneFactory.playSound(this.sounds, 'jump');
    }

}