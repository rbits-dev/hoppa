import Phaser from 'phaser'
import ObstaclesController from '../scripts/ObstaclesController';
import PlayerController from '../scripts/PlayerController';
import * as SceneFactory from '../scripts/SceneFactory';
import { PlayerStats } from './PlayerStats';
import BaseScene from './BaseScene';


export default class TestRoom extends BaseScene {

    private info!: PlayerStats;
    private map!: Phaser.Tilemaps.Tilemap;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private player?: Phaser.Physics.Matter.Sprite;
    private playerController?: PlayerController;
    private obstaclesController!: ObstaclesController;
    private objects: Phaser.Physics.Matter.Sprite[] = [];
    private ground!: Phaser.Tilemaps.TilemapLayer;
    private layer1!: Phaser.Tilemaps.TilemapLayer;
    private introMusic!: Phaser.Sound.BaseSound;
    private playerX = -1;
    private playerY = -1;

    private sounds!: Map<string, Phaser.Sound.BaseSound>;

    constructor() {
        super('testroom');
    }

    init() {

        this.cursors = this.input.keyboard?.createCursorKeys();

        this.obstaclesController = new ObstaclesController();

        this.sounds = new Map<string, Phaser.Sound.BaseSound>();
        this.objects = [];
        this.info = {
            'lastHealth': 100,
            'coinsCollected': 0,
            'carrotsCollected': 0,
            'currLevel': 100,
            'scorePoints': 0,
            'highScorePoints': 0,
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

        this.info.currLevel = 100;
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.destroy();
        });

        globalThis.rabbitSpriteSheet = 'choclate';
    }

    preload() {
        SceneFactory.preload(this);
        this.load.image('ra8bittiles128-bg', 'assets/ra8bittiles128-bg.webp');
        this.load.tilemapTiledJSON('tilemap-bonus', 'assets/testroom.json');
        this.load.image('ra8bits-64-tiles', 'assets/ra8bittiles64.webp');
        this.load.atlas('neon', 'assets/neon2.webp', 'assets/neon2.json');
    }

    create() {
        super.create();

        this.lights.enable().setAmbientColor(0x333333);

        this.sounds = SceneFactory.setupSounds(this);

        this.scene.launch('ui');
        SceneFactory.playRandomMusic(this);

        this.events.on('player-jumped', this.playerJumped, this);

        const { width, height } = this.scale;

        this.map = this.make.tilemap({ key: 'tilemap-bonus', tileWidth: 64, tileHeight: 64 });

        const totalWidth = this.map.widthInPixels;
        const s = 1;
        const bg = this.add
            .image(totalWidth / 2, 0, "ra8bittiles128-bg")
            .setOrigin(0.5, 0)
            .setScale(s)
            .setAlpha(0.5);

        bg.setPipeline('Light2D');

        const groundTiles = this.map.addTilesetImage('ground', 'groundTiles', 64, 64, 0, 2);
        const propTiles = this.map.addTilesetImage('props', 'propTiles', 64, 64, 0, 2);
        const ra8bitTiles = this.map.addTilesetImage('ra8bits-64', 'ra8bits-64-tiles', 64, 64, 0, 0);
        this.ground = this.map.createLayer('ground', [groundTiles, ra8bitTiles]);
        this.layer1 = this.map.createLayer('layer1', [groundTiles, ra8bitTiles]);
        this.ground.setCollisionByProperty({ collides: true, recalculateFaces: false });

        this.map.createLayer('obstacles', propTiles);
        this.layer1.setDepth(10);

        const playerCat = 2;
        const enemyCat = 4;
        
        const collideWith = [1, playerCat];
        super.initManager(this.map);

        this.playerX = this.game.registry.get('playerX') || -1;
        this.playerY = this.game.registry.get('playerY') || -1;

        const objectsLayer = this.map.getObjectLayer('objects');
        objectsLayer?.objects.forEach(objData => {

            const { x = 0, y = 0, name, width = 0, height = 0, rotation = 0 } = objData;
           

            switch (name) {
                case 'player1-spawn':
                case 'player2-spawn':
                case 'player-spawn':
                    {
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

                        this.cameras.main.setViewport(0, 0, 1280, 640);
                        this.cameras.main.setZoom(1.0);
                        this.cameras.main.roundPixels = true;
                        break;
                    }
                default:
                    break;
            }

        });

        this.matter.world.convertTilemapLayer(this.ground, { label: 'ground', friction: 0, frictionStatic: 0 });
        this.matter.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

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

        this.introMusic?.destroy();
        this.events.off('player-jumped', this.playerJumped, this);

        this.playerController?.destroy();
        this.objects.forEach(obj => obj.destroy());

        this.ground.destroy();
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
