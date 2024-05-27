import StateMachine from "./StateMachine";
import { sharedInstance as events } from './EventManager';
import PlayerController from "./PlayerController";
import * as SceneFactory from '../scripts/SceneFactory';

export default class TNTController implements Controller {
    private sprite: Phaser.Physics.Matter.Sprite;
    private stateMachine: StateMachine;
    private dead: boolean = false;
    private player: PlayerController;
    private name: string;
    private tilemap: Phaser.Tilemaps.Tilemap;
    private scene: Phaser.Scene;

    private targetX: number;
    private targetY: number;

    constructor(
        scene: Phaser.Scene,
        sprite: Phaser.Physics.Matter.Sprite,
        name: string,
        player: PlayerController,
        tilemap: Phaser.Tilemaps.Tilemap,
        target_x: number,
        target_y: number,
    ) {
        this.sprite = sprite;
        this.name = name;
        this.scene = scene;
        this.createAnims();
        this.player = player;
        this.tilemap = tilemap;
        this.stateMachine = new StateMachine(this);

        this.stateMachine.addState('idle', {
            onEnter: this.idleOnEnter
        })
            .addState('dead', {
                onEnter: this.deadOnEnter
            })
            .setState('idle');

        events.on(this.name + '-stomped', this.handleStomped, this);

        this.targetX = target_x;
        this.targetY = target_y;

    }

    destroy() {
        events.off(this.name + '-stomped', this.handleStomped, this);
    }

    update(deltaTime: number) {
        this.stateMachine.update(deltaTime);
    }

    public getSprite() {
        return this.sprite;
    }

    private idleOnEnter() {
        if(this.dead)
        return;
        this.sprite.play('idle');
    }

    private deadOnEnter() {

        this.sprite.play('dead');
        this.sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            this.cleanup();
        });
        
    }

    private cleanup() {
        this.sprite.destroy();
        this.stateMachine.destroy();
    }

    private handleStomped(tnt: Phaser.Physics.Matter.Sprite) {
        if (this.sprite !== tnt) {
            return;
        }
        this.dead = true;
        events.off(this.name + '-stomped', this.handleStomped, this);
        this.sprite.setStatic(true);
        this.sprite.setCollisionCategory(0);
        this.sprite.play('active');
        this.sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            const x = (this.targetX == -1 ? this.sprite.x : this.targetX);
            const y = (this.targetY == -1 ? this.sprite.y : this.targetY);
            this.explosiveRadius(x,y);
        });

        this.player?.changeVelocity();

    }

    private explosiveRadius(cx: number, cy: number) {
       
        
        if( cx == -1 && cy == -1) {
            this.sprite.play('boom');
            this.sprite.setOrigin(0.5,0.5);
            this.sprite.setScale(3.0,3.0);
        }
        else {
            let boom = this.scene.add.sprite(cx, cy, "tnt" );
            boom.setOrigin(0.5,0.5);
            boom.setScale(3.0,3.0);
            boom.anims.create({
                key: 'boom',
                repeat: 0,
                frameRate: 5,
                frames: this.sprite.anims.generateFrameNames('bomb', {
                    start: 0,
                    end: 2,
                    prefix: '3_Dead',
                    suffix: '.webp'
                })
            });
            boom.play('boom');          
            boom.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
                boom.destroy();
            });
        }


        const ex = cx - 128;
        const ey = cy;
        
        let tiles: Phaser.Tilemaps.Tile[] = this.tilemap.getTilesWithinWorldXY(ex, ey, 4 * 64, 3 * 64, undefined,undefined, 'ground' );
        tiles?.forEach( tile => {
            this.tilemap.removeTileAt(tile.x, tile.y, false, true);
            let snd = Phaser.Math.Between(1,6);
            SceneFactory.addSound(this.scene, "explosion" + snd.toString(), false, true );
        
            tile.setVisible(false); // in playercontroller , tilebodies that are not visible are destroyed on collision
            // objects in world map are not destroyed
        });
        tiles = this.tilemap.getTilesWithinWorldXY(ex - 64, ey, 64, 64, undefined,undefined, 'ground' );
        let snd = Phaser.Math.Between(1,6);
            SceneFactory.addSound(this.scene, "explosion" + snd.toString(), false, true );
        tiles?.forEach( tile => {
            this.tilemap.removeTileAt(tile.x, tile.y, false, true);
            tile.setVisible(false); // in playercontroller , tilebodies that are not visible are destroyed on collision
        });

        tiles = this.tilemap.getTilesWithinWorldXY(ex + 4 * 64, ey, 64, 64, undefined,undefined, 'ground' );
        snd = Phaser.Math.Between(1,6);
            SceneFactory.addSound(this.scene, "explosion" + snd.toString(), false, true );
        tiles?.forEach( tile => {
            this.tilemap.removeTileAt(tile.x, tile.y, false, true);
            tile.setVisible(false); // in playercontroller , tilebodies that are not visible are destroyed on collision
        });
        
        this.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            this.stateMachine.setState('dead');
        });
    }

    private createAnims() {
        this.sprite.anims.create({
            key: 'idle',
            frameRate: 1,
            repeat: -1,
            frames: this.sprite.anims.generateFrameNames('tnt', {
                start: 0,
                end: 0,
                prefix: '0_Idle',
                suffix: '.webp'
            })
        });
        this.sprite.anims.create({
            key: 'active',
            frameRate: 10,
            repeat: 0,
            frames: this.sprite.anims.generateFrameNames('tnt', {
                start: 0,
                end: 0,
                prefix: '1_Pressed',
                suffix: '.webp'
            })
        });
        this.sprite.anims.create({
            key: 'dead',
            frameRate: 10,
            repeat: 0,
            frames: this.sprite.anims.generateFrameNames('tnt', {
                start: 0,
                end: 1,
                prefix: '2_Dead',
                suffix: '.webp'
            })
        });

        this.sprite.anims.create({
            key: 'boom',
            repeat: 0,
            frameRate: 5,
            frames: this.sprite.anims.generateFrameNames('bomb', {
                start: 0,
                end: 2,
                prefix: '3_Dead',
                suffix: '.webp'
            })
        });
    }

}