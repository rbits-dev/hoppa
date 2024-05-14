import StateMachine from "./StateMachine";
import { sharedInstance as events } from './EventManager';
import * as SceneFactory from '../scripts/SceneFactory';
import * as CreatureLogic from './CreatureLogic';

export default class BombController {
    private scene: Phaser.Scene;
    private sprite: Phaser.Physics.Matter.Sprite;
    private stateMachine: StateMachine;
    private tilemap: Phaser.Tilemaps.Tilemap;

    private moveTime = 0;
    private name = "";
    private garbage = false;
    private myMoveTime = 0;

    private fakeDetonationTimer = 0;
    private fakeDetonator = 0;

    constructor(
        scene: Phaser.Scene,
        sprite: Phaser.Physics.Matter.Sprite,
        name: string,
        tilemap: Phaser.Tilemaps.Tilemap,
    ) {
        this.scene = scene;
        this.sprite = sprite;
        this.name = name;
        this.garbage = false;
        this.tilemap = tilemap;
        this.createAnims();

        this.stateMachine = new StateMachine(this);

        this.stateMachine.addState('idle', {
            onEnter: this.idleOnEnter
        })
            .addState('move-left', {
                onEnter: this.moveLeftOnEnter,
                onUpdate: this.moveLeftOnUpdate
            })
            .addState('move-right', {
                onEnter: this.moveRightOnEnter,
                onUpdate: this.moveRightOnUPdate
            })
            .addState('dead', {
                onEnter: this.deadOnEnter,
            })
            .setState('idle');

        this.myMoveTime = Phaser.Math.Between(1500, 2500);
        this.fakeDetonationTimer = Phaser.Math.Between(3, 60);

        events.on(this.name + '-stomped', this.handleStomped, this);
        events.on(this.name + '-blocked', this.handleBlocked, this);
    }

    destroy() {
        events.off(this.name + '-stomped', this.handleStomped, this);
        events.off(this.name + '-blocked', this.handleBlocked, this);

        this.cleanup();
    }

    update(deltaTime: number) {
        this.stateMachine.update(deltaTime);

        this.fakeDetonator += deltaTime;
        if( this.fakeDetonator > this.fakeDetonationTimer ) {
            this.sprite.play('count');
            this.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
                this.stateMachine.setState('idle');
             });
             this.fakeDetonationTimer = Phaser.Math.Between(3000, 30000);
             this.fakeDetonator = 0;
        }
    }

    public getSprite() {
        return this.sprite;
    }

    private moveLeftOnEnter() {
        this.moveTime = 0;
    }

    private moveLeftOnUpdate(deltaTime: number) {
        this.moveTime += deltaTime;
        this.sprite.flipX = false;
        this.sprite.setVelocityX(-3);

        if (this.moveTime > this.myMoveTime) {
            this.stateMachine.setState('move-right');
        }
    }

    private moveRightOnEnter() {
        this.moveTime = 0;
    }

    private moveRightOnUPdate(deltaTime: number) {
        this.moveTime += deltaTime;
        this.sprite.flipX = true;
        this.sprite.setVelocityX(3);

        if (this.moveTime > this.myMoveTime) {
            this.stateMachine.setState('move-left');
        }
    }

    private deadOnEnter() {
        this.moveTime = 0;
        
        this.sprite.setOrigin(0.5,0.5);
        this.sprite.setScale(3.0,3.0);
        
        this.sprite.play('dead');

        const ex = this.sprite.body?.position.x - 64;
        const ey = this.sprite.body?.position.y;
        const tiles: Phaser.Tilemaps.Tile[] = this.tilemap.getTilesWithinWorldXY(ex, ey, 3 * 64, 3 * 64 );
        SceneFactory.addSound(this.scene, "explosion3", false, true );
        tiles?.forEach( tile => {
            this.tilemap.removeTileAt(tile.x, tile.y, false, true);
            tile.setVisible(false); // in playercontroller , tilebodies that are not visible are destroyed on collision
        });
        
        this.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            this.garbage = true;
            this.cleanup();
        });
    }

    public lookahead(map: Phaser.Tilemaps.Tilemap): boolean {
        if (this.sprite.active == false)
            return false;

        if (!CreatureLogic.hasTileAhead(map, this.scene.cameras.main, this.sprite, true, 0) && this.sprite.body?.velocity.y == 0) {
            if (this.sprite.flipX)
                this.stateMachine.setState("move-left");
            else
                this.stateMachine.setState("move-right");
            return true;
        }

        return false;
    }
    private idleOnEnter() {
        this.sprite.play('idle');

        if (Math.random() > 0.5) {
            this.stateMachine.setState('move-left');
        }
        else {
            this.stateMachine.setState('move-right');
        }
    }

    private handleStomped(bomb: Phaser.Physics.Matter.Sprite) {
        if (this.sprite !== bomb && !this.garbage) {
            return;
        }
        //this.garbage = true;
        events.off(this.name + '-stomped', this.handleStomped, this);
        //this.sprite.flipX = false;
        this.sprite.play('count');
        this.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            this.stateMachine.setState('dead');
            //this.cleanup();
        });

    }
    private cleanup() {
        if(this.sprite !== undefined) {
           this.sprite.destroy();
           this.stateMachine.destroy();
        }
        this.sprite = undefined;
    }

    private handleBlocked(fire: Phaser.Physics.Matter.Sprite) {
        if (this.sprite !== fire) {
            return;
        }

        this.moveTime = 0;

        if (this.sprite.flipX) {
            this.stateMachine.setState('move-left');
        }
        else {
            this.stateMachine.setState('move-right');
        }
    }

    public getEvent() {
        return this.name + '-stomped';
    }

    public keepObject() {
        return !this.garbage;
    }

    private createAnims() {
        this.sprite.anims.create({
            repeat: -1,
            key: 'idle',
            frameRate: 5,
            frames: this.sprite.anims.generateFrameNames('bomb', {
                start: 0,
                end: 1,
                prefix: '0_Idle',
                suffix: '.webp'
            })
        });
        this.sprite.anims.create({
            key: 'move',
            repeat: -1,
            frameRate: 5,
            frames: this.sprite.anims.generateFrameNames('bomb', {
                start: 0,
                end: 0,
                prefix: '1_Move',
                suffix: '.webp'
            })
        });
        this.sprite.anims.create({
            key: 'count',
            repeat: 0,
            frameRate: 5,
            frames: this.sprite.anims.generateFrameNames('bomb', {
                start: 0,
                end: 2,
                prefix: '2_Count',
                suffix: '.webp'
            })
        });
        this.sprite.anims.create({
            key: 'dead',
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