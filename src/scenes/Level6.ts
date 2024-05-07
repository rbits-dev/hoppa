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

export default class Level6 extends BaseScene {

    private info!: PlayerStats;
    private map!: Phaser.Tilemaps.Tilemap;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private player?: Phaser.Physics.Matter.Sprite;
    private playerController?: PlayerController;
    private obstaclesController!: ObstaclesController;
    private flowers: FlowerController[] = [];
    private monsters: MonsterController[] = [];
    private fires: FireController[] = [];
    private plants: PlantController[] = [];
    private firewalkers: FireWalkerController[] = [];
    private crabs: CrabController[] = [];
    private birds: BirdController[] = [];
    private bats: BatController[] = [];
    private bombs: BombController[] = [];
    private dragons: DragonController[] = [];
    private zeps: ZeppelinController[] = [];
    private tnts: TNTController[] = [];
    private bears: BearController[] = [];
    private flies: FlyController[] = [];
    private crows: CrowController[] = [];
    private saws: SawController[] = [];
    private lava: LavaController[] = [];
    private neon: NeonController[] = [];
    private playerX = -1;
    private playerY = -1;
    private objects: Phaser.Physics.Matter.Sprite[] = [];
    private sounds!: Map<string, Phaser.Sound.BaseSound>;
    
    private ground1!: Phaser.Tilemaps.TilemapLayer;
    private layer1!: Phaser.Tilemaps.TilemapLayer;

    constructor() {
        super('level6');
    }

    init() {

        super.init();

        this.cursors = this.input.keyboard?.createCursorKeys();

        this.obstaclesController = new ObstaclesController();
        this.monsters = [];
        this.fires = [];
        this.flowers = [];
        this.plants = [];
        this.firewalkers = [];
        this.crabs = [];
        this.birds = [];
        this.bats = [];
        this.dragons = [];
        this.bombs = [];
        this.zeps = [];
        this.bears = [];
        this.tnts = [];
        this.flies = [];
        this.crows = [];
        this.saws = [];
        this.neon = [];
        this.lava = [];
        this.objects = [];
        this.sounds = new Map<string, Phaser.Sound.BaseSound>();

        this.info = {
            'lastHealth': 100,
            'highScorePoints': 0,
            'coinsCollected': 0,
            'carrotsCollected': 0,
            'currLevel': 6,
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
        this.info.currLevel = 6;

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.destroy();
        });

    }

    preload() {
        
        SceneFactory.preload(this);
        
        this.load.image('clouds', 'assets/clouds.webp');
        this.load.atlas('neon', 'assets/neon2.webp', 'assets/neon2.json');
        this.load.tilemapTiledJSON('tilemap7', 'assets/map7.json');
    }

    create() {

        super.create();

        this.sounds = SceneFactory.setupSounds(this);

        SceneFactory.playRandomMusic(this);

        this.scene.launch('ui');

        this.events.on('player-jumped', this.playerJumped, this);

        const { width, height } = this.scale;
        const tint = 0xde1ed0;// 0x9800ff;
        const totalWidth = 336 * 64;
        const hei = 20 * 64;
        const s = 2;

        AlignmentHelper.createAligned2(this, totalWidth, hei,"clouds", 0.5 / s,s); //mountain

        this.map = this.make.tilemap({ key: 'tilemap7', tileWidth: 64, tileHeight: 64 });
        const groundTiles = this.map.addTilesetImage('ground', 'groundTiles', 64, 64, 0, 2);
        const propTiles = this.map.addTilesetImage('props', 'propTiles', 64, 64, 0, 2);
        const grasTiles = this.map.addTilesetImage('gras-purple', 'grasPurpleTiles', 64, 64, 0, 2);
        
        this.map.createLayer('obstacles', propTiles);
        this.layer1 = this.map.createLayer('layer1', [groundTiles,grasTiles,propTiles]);
        this.ground1 = this.map.createLayer('ground', [groundTiles,grasTiles,propTiles]);
        
        this.ground1.setCollisionByProperty({ collides: true, recalculateFaces: false });
       
        this.layer1.setDepth(10);

        const playerCat = 2;
        const enemyCat = 4;

        const collideWith = [1, playerCat];

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

        objectsLayer?.objects.forEach(objData => {
            const { x = 0, y = 0, name, width = 0, height = 0, rotation = 0 } = objData;
            switch (name) {
                default:
                    SceneFactory.basicCreate(this, name, x, y, width, height, rotation, enemyCat, collideWith, this.obstaclesController, objData, this.playerController, this.map);
                    break;
            }
        });

        this.matter.world.convertTilemapLayer(this.ground1, { label: 'ground', friction: 0, frictionStatic: 0 });
        this.matter.world.setBounds(0,0,this.map.widthInPixels, this.map.heightInPixels, 1, true, true,false, false);

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

        this.monsters.forEach(monster => monster.destroy());
        this.fires.forEach(fire => fire.destroy());
        this.plants.forEach(plant => plant.destroy());
        this.flowers.forEach(flower => flower.destroy());
        this.crabs.forEach(crab => crab.destroy());
        this.birds.forEach(bird => bird.destroy());
        this.firewalkers.forEach(firewalker => firewalker.destroy());
        this.bats.forEach(bat => bat.destroy());
        this.dragons.forEach(dragon => dragon.destroy());
        this.bombs.forEach(bomb => bomb.destroy());
        this.zeps.forEach(zep => zep.destroy());
        this.bears.forEach(bear => bear.destroy());
        this.tnts.forEach(tnt => tnt.destroy());
        this.flies.forEach(fly => fly.destroy());
        this.crows.forEach(crow => crow.destroy());
        this.saws.forEach(saw => saw.destroy());
        this.lava.forEach(lava=>lava.destroy());
        this.neon.forEach(n=>n.destroy());

        
        this.ground1.destroy();
        this.layer1.destroy();
        this.map.destroy();

        this.objects.forEach(obj=>obj.destroy());
        
        this.sounds.clear();
    }

    update(time: number, deltaTime: number) {

        super.update(time,deltaTime);

        if(!super.doStep())
            return;
        
        this.bombs = this.bombs.filter(e => e.keepObject());
        this.monsters = this.monsters.filter(e => e.keepObject());
        this.crabs = this.crabs.filter(e => e.keepObject());
        this.birds = this.birds.filter(e => e.keepObject());
        this.firewalkers = this.firewalkers.filter(e => e.keepObject());
        this.bats = this.bats.filter(e => e.keepObject());
        this.dragons = this.dragons.filter(e => e.keepObject());
        this.bears = this.bears.filter(e => e.keepObject());
        this.crows = this.crows.filter(e => e.keepObject());
        this.flies = this.flies.filter(e=>e.keepObject());
        
        this.lava.forEach(lava => {
            lava.update(deltaTime);
        });
        
        this.monsters.forEach(monster => {
            monster.update(deltaTime);
            monster.lookahead(this.map);
        });
        this.fires.forEach(fire => {
            fire.update(deltaTime);
            fire.lookahead(this.map)
        });
        this.firewalkers.forEach(firewalker => {
            firewalker.update(deltaTime);
            firewalker.lookahead(this.map);
        });
        this.zeps.forEach(zep => { 
            zep.update(deltaTime); 
            zep.lookahead(this.map);
        });
        this.flies.forEach(fly => {
            fly.update(deltaTime); 
            fly.lookahead(this.map);
        });
        this.crabs.forEach(crab => {
            crab.update(deltaTime);
            crab.lookahead(this.map);
        });
        this.dragons.forEach(dragon => {
            dragon.update(deltaTime);
            dragon.lookahead(this.map);
        });
        this.crows.forEach(crow => {
            crow.update(deltaTime);
            crow.lookahead(this.map);
        });

        this.flowers.forEach(flower => flower.update(deltaTime));
        this.plants.forEach(plant => plant.update(deltaTime));
        this.birds.forEach(bird => {
            bird.update(deltaTime); 
            bird.lookahead(this.map);
        });
        this.bats.forEach(bat => bat.update(deltaTime));
        this.bombs.forEach(bomb => bomb.update(deltaTime));
        this.bears.forEach(bear => bear.update(deltaTime));
        this.tnts.forEach(tnt => tnt.update(deltaTime));
        this.crows.forEach(crow => crow.update(deltaTime));
                this.saws.forEach(saw => {
            saw.update(deltaTime);
            saw.lookahead(this.map);
        });

        this.neon.forEach(n=>n.update(deltaTime));
        
        this.playerController?.update(deltaTime);


        SceneFactory.cullSprites(this);
        
    }

    playerJumped() {
        SceneFactory.playSound(this.sounds, 'jump');
    }

}