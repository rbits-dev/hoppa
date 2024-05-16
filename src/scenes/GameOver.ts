import Phaser from "phaser";
import * as SceneFactory from '../scripts/SceneFactory';
import { PlayerStats } from "./PlayerStats";
import * as WalletHelper from '../scripts/WalletHelper';
import TextDemo from '../scripts/TextDemo';

export default class GameOver extends Phaser.Scene {
    constructor() {
        super('game-over')
    }

    private introMusic?: Phaser.Sound.BaseSound;
    private textDemo!: TextDemo;
    private anyKey?: Phaser.GameObjects.BitmapText;
    
    private info?: PlayerStats;

    preload() {
        SceneFactory.preload(this);
    }

    init() {
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.destroy();
        });
    }

    create() {
        const { width, height } = this.scale;
        
        globalThis.musicTune = false;
        
        this.introMusic = SceneFactory.addSound(this, 'gameover', false);

        this.textDemo = new TextDemo(this,'press_start','GAME OVER', 48, width * 0.5, height * 0.5, 0xff7300, 0.5);
        this.textDemo.letterBounce(500,800,true,32,-1);
        this.cameras.main.shake(500);

        this.time.delayedCall( 5000, () => {
            this.anyKey = this.add.bitmapText(width * 0.5, height * 0.5 + 96, 'press_start', 'PRESS ANY KEY', 24 )
                .setTint(0xffffff)
                .setOrigin(0.5);
        });

        this.input.on('pointerdown', () => { this.continueGame(); });
        this.input.keyboard?.on('keydown', () => { this.continueGame(); });
    }

    continueGame() {
        this.introMusic?.stop();
        SceneFactory.resetSpawnPoint(this);
        this.hasNewHighscore();
    }

    update() {
        if(SceneFactory.gamePadIsButton(this,-1)) {
            this.continueGame();
        }
    }

    destroy() {
        this.introMusic?.destroy();
        this.anyKey?.destroy();
        this.textDemo.destroy();

        this.input.off('pointerdown', () => { this.continueGame(); });
        this.input.keyboard?.off('keydown', () => { this.continueGame(); });
    }

    private hasNewHighscore() {
        const data = window.localStorage.getItem( 'ra8bit.stats' );
        if( data != null ) {
            const obj = JSON.parse(data);
            this.info = obj as PlayerStats;
        }

        if(globalThis.isValid && !globalThis.noWallet ) {
            let hs = this.info?.highScorePoints || 0;
            let score = this.info?.scorePoints || 0;
            if( hs > score )
                score = hs;

            const checkNewHighscore = async() => {
                const inTop10 = await WalletHelper.hasNewHighScore(score);
                if(inTop10) {
                    this.scene.stop();
                    this.scene.start('enter-hall');
                }
                else {
                    this.scene.stop();
                    this.scene.start('start');
                }
            };
            checkNewHighscore();
        }
        else {
            this.scene.stop();
            this.scene.start('start');
        }

    }

}