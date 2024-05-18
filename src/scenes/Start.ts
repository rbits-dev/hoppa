import Phaser from "phaser";
import ObstaclesController from "../scripts/ObstaclesController";
import * as SceneFactory from '../scripts/SceneFactory';

import { sharedInstance as events } from '../scripts/EventManager';

import * as WalletHelper from '../scripts/WalletHelper';
import BaseScene from "./BaseScene";

import * as AlignmentHelper from '../scripts/AlignmentHelper';


export default class Start extends BaseScene {
    constructor() {
        super({ key: 'start' });
    }

    private obstaclesController!: ObstaclesController;

    private index = 0;
    private hsv;
    private shoutout !: Phaser.GameObjects.BitmapText;
    private credits !: Phaser.GameObjects.BitmapText;
    private map!: Phaser.Tilemaps.Tilemap;
    private ground1!: Phaser.Tilemaps.TilemapLayer;
    private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
    
    private goFS = false;

    init() {

        super.init();

        this.cursors = this.input.keyboard?.createCursorKeys();
        
        if (this.sys.game.device.fullscreen.available) {
            this.goFS = true;
        }

        this.obstaclesController = new ObstaclesController();

        const info = {
            'lastHealth': 100,
            'coinsCollected': 0,
            'carrotsCollected': 0,
            'currLevel': 1,
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
        const data = JSON.stringify(info);
        window.localStorage.setItem('ra8bit.stats', data); 
    }

    preload() {
        SceneFactory.preload(this);

        this.load.image('wall', 'assets/wall.webp');

        this.load.tilemapTiledJSON('start', 'assets/start.json');
        this.load.atlas('neon', 'assets/neon2.webp', 'assets/neon2.json');
    }

    create() {

        super.create();

        this.hsv = Phaser.Display.Color.HSVColorWheel();

        const { width, height } = this.scale;
        const totalWidth = 105 * 64;
        const hei = 12 * 64;

        AlignmentHelper.createAligned(this, totalWidth, hei, "wall", 1, 1);

        this.map = this.make.tilemap({ key: 'start', tileWidth: 64, tileHeight: 64 });
        const groundTiles = this.map.addTilesetImage('ground', 'groundTiles', 64, 64, 0, 2);
        const ra8bitTiles = this.map.addTilesetImage('minira8bits', 'ra8bitTiles', 64, 64, 0, 2);
        this.ground1 = this.map.createLayer('ground', [groundTiles, ra8bitTiles]);

        this.ground1.setCollisionByProperty({ collides: true, recalculateFaces: false });

        const objectsLayer = this.map.getObjectLayer('objects');
        super.initManager(this.map);
        objectsLayer?.objects.forEach(objData => {
            const { x = 0, y = 0, name, width = 0, height = 0, rotation = 0 } = objData;
            switch (name) {
                default:
                    super.push( SceneFactory.basicCreateCreature(this, name, x, y, width, height, rotation, 4, [1], this.obstaclesController, objData, undefined, this.map) );
                    
                    SceneFactory.basicCreate(this, name, x, y, width, height, rotation, 4, [1], this.obstaclesController, objData, undefined, this.map);
                    
                    break;
            }
        })
        this.matter.world.convertTilemapLayer(this.ground1, { label: 'ground', friction: 0, frictionStatic: 0 });

        this.matter.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.setBounds(0, -308, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.setAlpha(1);
        this.cameras.main.setZoom(0.5);
        this.cameras.main.roundPixels = true;

        this.matter.world.on("collisionstart", (e: { pairs: any; }, o1: any, o2: any) => {
            const pairs = e.pairs;
            for (let i = 0; i < pairs.length; i++) {
                const bodyA = pairs[i].bodyA;
                const bodyB = pairs[i].bodyB;

                const dx = ~~(bodyB.position.x - bodyA.position.x);
                const dy = ~~(bodyB.position.y - bodyA.position.y);

                if (dy <= 32) {
                    events.emit(bodyA.gameObject?.name + '-blocked', bodyA.gameObject);
                }
            }
        });

        SceneFactory.playRepeatMusic(this, 'theme');
    
        this.tweens.chain({
            targets: this.cameras.main,
            tweens: [
                {
                scrollX: 80 * 64,
                delay: 0,
                ease: 'Sine.easeInOut',
                duration: 5000,
                yoyo: true,
                repeat: -1,
                loop: -1,
                repeatDelay: 0,
                hold: 500,
                }

            ],
            loop: -1
        });

        this.input.on('pointerdown', () => { this.continueGame(); });
        this.input.keyboard?.on('keydown', () => { this.continueGame(); });

        const cam = this.cameras.add(0, 0, width, 128);

        this.shoutout = this.add.bitmapText(width / 2, -400, 'press_start',
            'PRESS SPACE TO PLAY', 24).setTint(0xff7300).setOrigin(0.5, 0.5);

        this.credits = this.add.bitmapText(320 + 640, -350, 'press_start',
            'Written by c0ntrol zero, Artwork by Pixel8it, Storyline by Dandybanger, Copyleft 2022-2024', 12).setTint(0xff7300).setOrigin(0.5, 0.5);
        this.credits.setDropShadow(0, 2, 0xff0000, 0.5);

        cam.startFollow(this.shoutout);
     //   cam.setFollowOffset(0, -216);
     //   cam.setViewport(320, 0, 640, 512);

        cam.roundPixels = true;

        this.tweens.chain({
            targets: this.credits,
            tweens: [
                {
                    x: 320,
                    delay: 0,
                    ease: 'Sine.easeInOut',
                    duration: 3000,
                    repeat: -1,
                    yoyo: true,
                    offset: 0
                }

            ],
            loop: -1
        });


        localStorage.removeItem('player-position');
    }

    private continueGame() {
        this.game.sound.stopAll();
       
        if(WalletHelper.isNotEligible())
            this.scene.start('wallet');
        else
            this.scene.start('player-select');
    }
    preDestroy() {
        this.obstaclesController.destroy(this);
    }
    destroy() {

        super.destroy();

        this.input.off('pointerdown', () => { this.continueGame(); });
        this.input.keyboard?.off('keydown', () => { this.continueGame(); });

        this.shoutout.destroy();
        this.credits.destroy();

        this.tweens.destroy();
        this.ground1.destroy();
        this.map.destroy();
        
    }

    update(time: number, deltaTime: number) {

        super.update(time,deltaTime);

        if(!super.doStep(time,deltaTime))
            return;
        
    
        const top = this.hsv[this.index].color;
        const bottom = this.hsv[359 - this.index].color;

        this.shoutout.setTint(top, bottom, top, bottom);

        this.index++;
        if (this.index >= 360)
            this.index = 0;

        if(SceneFactory.gamePadIsButton(this,-1) || this.cursors?.space.isDown ) {
            this.continueGame();
        }

    }
}
