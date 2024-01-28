import Phaser from "phaser";
import * as SceneFactory from '../scripts/SceneFactory';
import * as WalletHelper from '../scripts/WalletHelper'

declare global {
    var dramaticIntro: boolean;
}

export default class HoppaSelect extends Phaser.Scene {

    private rotate!: Phaser.GameObjects.BitmapText;

    private startSinglePlayerLabel!: Phaser.GameObjects.BitmapText;
    private disconnectLabel!: Phaser.GameObjects.BitmapText;
    private text!:Phaser.GameObjects.BitmapText;
    private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
    private arrow?:Phaser.GameObjects.Image;
    private activeItem: number = 0;

    private arrowY: number = 460;
    private arrowX: number = 300;

    private lastUpdate: number = 0;

    constructor() {
        super('hoppa-select');
    }

    init() {
        this.cursors = this.input.keyboard?.createCursorKeys();

        
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.destroy();
        });
    }

    preload() {
        SceneFactory.preload(this);
    
        this.load.image('arrow', 'assets/arrow.webp');

        globalThis.adReturn = "hoppa-select";
    }

    create() {
        const { width, height } = this.scale;

        
        this.add.image(width / 2, height / 2 - 172, 'logo').setDisplaySize(460, 196).setOrigin(0.5, 0.5);

        this.text = this.add.bitmapText(width * 0.5, height / 2, 'press_start', 'A RBITS Production', 48)
            .setTint(0xc0c0c0)
            .setOrigin(0.5);

        this.input.setDefaultCursor('url(assets/hand.cur), pointer');


        this.createArrow();

        this.startSinglePlayerLabel = this.add.bitmapText(width * 0.5, height / 2 + 108, 'press_start', 'Start', 48)
            .setTint(0xffffff)
            .setOrigin(0.5);


        this.disconnectLabel = this.add.bitmapText(width * 0.5, height / 2 + 176, 'press_start', 'Disconnect', 48)
            .setTint(0xffffff)
            .setOrigin(0.5);

        this.startSinglePlayerLabel.setInteractive({ cursor: 'pointer' })
            .on('pointerup', () => {
                this.continueGame();
            }).on('pointerdown', () => {
                this.highlightActive(0);
             });

        this.disconnectLabel.setInteractive({ cursor: 'pointer' })
            .on('pointerup', () => {
                this.scene.stop();
                this.scene.start('hoppa');
            }).on('pointerdown', () => {
                this.highlightActive(2);
             });
            
            
        if (this.scale.width < this.scale.height) {
            this.printWarning(width, height);
        }

        if( globalThis.noWallet ) {
            this.disconnectLabel.setText("Quit");
        }

        this.time.delayedCall( 10000, () => {
            this.scene.stop();
            const n = Phaser.Math.Between(0,5);
            let scene = 'ad';
            if( !globalThis.noWallet && globalThis.chainId == 56 && n < 2 ) {
                scene = 'halloffame';
            }
            this.scene.start(scene);
        });

    }

    createArrow() {
        this.arrow = this.add.image(this.arrowX, this.arrowY, 'arrow' );
        this.arrow.setRotation(30);
        this.arrow.setVisible(false);
    }

    private highlightActive(active) {
        switch(active) {
            case 0:
                this.startSinglePlayerLabel?.setTint(0xff7300);
                this.disconnectLabel?.setTint(0xffffff);
                break;
            case 1:
                this.startSinglePlayerLabel?.setTint(0xffffff);
                this.disconnectLabel?.setTint(0xffffff);
                break;
            case 2:
                this.startSinglePlayerLabel?.setTint(0xffffff);
                this.disconnectLabel?.setTint(0xff7300);
                break;
        }
                this.activeItem = active;
    }

    update(time: number, deltaTime: number) {

        if( time < this.lastUpdate ) 
            return;

        let haveArrow = false;

        if( SceneFactory.isGamePadActive(this) ) {
            haveArrow = true;
        }

        this.lastUpdate = time + 120; 

        if(this.cursors?.down.isDown || SceneFactory.isGamePadUp(this)) {
            this.activeItem --;
        }
        else if(this.cursors?.up.isDown || SceneFactory.isGamePadDown(this)) {
            this.activeItem ++;
        }
        else if(this.cursors?.shift.isDown || this.cursors?.space.isDown || SceneFactory.gamePadIsButton(this,-1) ) { 
            switch(this.activeItem) {
                case 0:
                    this.continueGame();
                    break;    
                case 1:
                    this.scene.stop();
                    this.scene.start('hoppa-select');
                    break;
            }
        }

        if( this.activeItem < 0 ) { 
            this.activeItem = 2;
        } else if (this.activeItem > 2 ) {
            this.activeItem = 0;
        }

        this.highlightActive(this.activeItem);
        
        if(haveArrow) {
            this.arrow?.setVisible(true);
            this.arrow?.setPosition( this.arrowX, this.arrowY + (64 * this.activeItem) );
        }
        else {
            this.arrow?.setVisible(false);
        }
    
    }

    destroy() {
        this.startSinglePlayerLabel.destroy();
        this.rotate?.destroy();
        this.text.destroy();
        this.disconnectLabel.destroy(); 
        this.arrow?.destroy();

        SceneFactory.stopSound(this);
        SceneFactory.removeAllSounds(this);
    }

    private printWarning(width, height) {
        this.rotate = this.add.bitmapText(width * 0.5, height / 2 + 348, 'press_start', '!rotate your device!', 18)
            .setTint(0xff7300)
            .setOrigin(0.5);
    }

    private continueGame() {
        WalletHelper.init();
        WalletHelper.getCurrentAccount();
        WalletHelper.getMyNFTCollections();
        this.scene.stop();
        this.scene.start('story');
    }

}