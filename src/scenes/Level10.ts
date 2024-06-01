import Phaser from 'phaser'
import ObstaclesController from '../scripts/ObstaclesController';
import PlayerController from '../scripts/PlayerController';
import * as SceneFactory from '../scripts/SceneFactory';
import BaseScene from './BaseScene';
import { PlayerStats } from './PlayerStats';

export default class Level10 extends BaseScene {

    private info!: PlayerStats;
    private map!: Phaser.Tilemaps.Tilemap;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private player?: Phaser.Physics.Matter.Sprite;
    private playerController?: PlayerController;
    private obstaclesController!: ObstaclesController;
    private playerX = -1;
    private playerY = -1;
    private spotlight!: Phaser.GameObjects.Light;
    private objects: Phaser.Physics.Matter.Sprite[] = [];
    private sounds!: Map<string, Phaser.Sound.BaseSound>;
    
    private ground1!: Phaser.Tilemaps.TilemapLayer;
    private layer1!: Phaser.Tilemaps.TilemapLayer;

    constructor() {
        super('level10');
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
            'currLevel': 10,
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
        this.info.currLevel = 10;

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.destroy();
        });

    }

    preload() {
        this.load.tilemapTiledJSON('tilemap4', 'assets/map4.json');
        
        this.load.atlas('boss', 'assets/boss.webp', 'assets/boss.json');
        this.load.atlas('money', 'assets/money.webp', 'assets/money.json');
        this.load.json( 'money-emitter', 'assets/money-emitter.json' );
        this.load.atlas( 'plof', 'assets/plof.webp', 'assets/plof.json');

        this.load.image('backboss', 'assets/backboss.webp');
        this.load.image('bar', 'assets/bar.webp');
        this.load.image('key', 'assets/key.webp');
        this.load.atlas('stoplight', 'assets/stoplight.webp', 'assets/stoplight.json');
        this.load.atlas('doors', 'assets/doors.webp', 'assets/doors.json');

        this.load.spritesheet('family', 'assets/ra8bittiles128-bg.webp', { frameWidth: 128, frameHeight: 128, startFrame: 0, endFrame: 299 });
        
        this.load.atlas('neon', 'assets/neon2.webp', 'assets/neon2.json');

        this.load.audio('demon1', [ 'assets/demon_1.mp3', 'assets/demon_1.m4a']);
        this.load.audio('demon2', [ 'assets/demon_2.mp3', 'assets/demon_2.m4a']);
        this.load.audio('demon3', [ 'assets/demon_3.mp3', 'assets/demon_3.m4a']);
        this.load.audio('demon4', [ 'assets/demon_4.mp3', 'assets/demon_4.m4a']);
        
        this.load.image('trashcan', 'assets/trashcan.webp');
        this.load.image('ra8bits-64-tiles', 'assets/ra8bittiles64.webp');

        SceneFactory.preload(this);
    }

    create() {

        super.create();

        this.sounds = SceneFactory.setupSounds(this);

        this.scene.launch('ui');

        SceneFactory.playRepeatMusic(this, "boss6");

        this.events.on('player-jumped', this.playerJumped, this);

        const { width, height } = this.scale;

        this.scene.scene.add
            .image(0, 128, 'backboss')
            .setOrigin(0, 0)
            .setScrollFactor(1.0)
      
        this.map = this.make.tilemap({ key: 'tilemap4', tileWidth: 64, tileHeight: 64 });
        const groundTiles = this.map.addTilesetImage('ground', 'groundTiles', 64, 64, 0, 2);
        const stonesTiles = this.map.addTilesetImage( 'stones', 'stonesTiles', 64,64,0 ,0);
        const propTiles = this.map.addTilesetImage('props', 'propTiles', 64, 64, 0, 2);
        const ra8bitTiles = this.map.addTilesetImage('ra8bits-64', 'ra8bits-64-tiles', 64, 64, 0, 0);
        
        this.map.createLayer('obstacles', propTiles);
        this.layer1 = this.map.createLayer('layer1', [groundTiles, ra8bitTiles,stonesTiles,propTiles]);
        this.ground1 = this.map.createLayer('ground', [groundTiles, ra8bitTiles,stonesTiles,propTiles]);
        
        this.ground1.setCollisionByProperty({ collides: true, recalculateFaces: false });
       
        this.layer1.setDepth(10);

        const playerCat = 2;
        const enemyCat = 4;

        const collideWith = [1, playerCat];
        super.initManager(this.map);

        this.playerX = this.game.registry.get('playerX') || -1;
        this.playerY = this.game.registry.get('playerY') || -1;

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

        this.spotlight = this.scene.scene.lights
            .addLight(0, 0, 200)
            .setColor(0xFFC0CB)
            .setIntensity(1.5)
            .setVisible(true);

        this.spotlight.x = this.playerController?.getX() || 0;
        this.spotlight.y = this.playerController?.getY() || 0;
    }

    preDestroy() {
        this.obstaclesController.destroy(this);
    }
    
    destroy() {

        super.destroy();

        this.events.off('player-jumped', this.playerJumped, this);

        this.playerController?.destroy();
        
        this.objects.forEach(obj => obj.destroy());
        
        this.layer1.destroy();
        this.ground1.destroy();
        this.map.destroy();
        
        this.sounds.clear();
    }

    update(time: number, deltaTime: number) {

        super.update(time,deltaTime);

        if(!super.doStep(time,deltaTime))
            return;
            
        this.playerController?.update(deltaTime);
        SceneFactory.cullSprites(this);

        this.spotlight.x = this.playerController?.getX() || 0;
        this.spotlight.y = this.playerController?.getY() || 0;
        
    }

    playerJumped() {
        SceneFactory.playSound(this.sounds, 'jump');
    }

}