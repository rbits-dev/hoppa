import StateMachine from "./StateMachine";
import { sharedInstance as events } from './EventManager';
import * as CreatureLogic from './CreatureLogic';
import PlayerController from "./PlayerController";

export default class CrabController {
    private scene: Phaser.Scene;
    private sprite: Phaser.Physics.Matter.Sprite;
    private stateMachine: StateMachine;

    private moveTime = 0;
    private name: string;
    private garbage = false;
    private myMoveTime = 0;

    private pauseTime: number = 0;
    private pauseDuration: number = 0;

    private dashTime: number = 0;
    private dashDuration: number = 0;

    private player: PlayerController;
    private tilemap: Phaser.Tilemaps.Tilemap;

    constructor(
        scene: Phaser.Scene,
        sprite: Phaser.Physics.Matter.Sprite,
        name: string, 
        player: PlayerController,
        tilemap: Phaser.Tilemaps.Tilemap
    ) {
        this.scene = scene;
        this.sprite = sprite;
        this.name = name;
        this.garbage = false;
        this.player = player;
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
            .addState('paused', {
                onEnter: this.pauseOnEnter,
                onUpdate: this.pauseOnUpdate,
            })
            .addState('dash', {
                onEnter: this.dashOnEnter,
                onUpdate: this.dashOnUpdate,
            })
            .addState('dead', {
            })
            .setState('idle');

        this.myMoveTime = Phaser.Math.Between(2500, 3500);


        events.on(this.name + '-stomped', this.handleStomped, this);
        events.on(this.name + '-blocked', this.handleBlocked, this);
    }

    destroy() {
        events.off(this.name + '-stomped', this.handleStomped, this);
        events.off(this.name + '-blocked', this.handleBlocked, this);

        this.cleanup();
    }

    update(deltaTime: number) {

        // set to 50% alpha when in water
        const currentTile = this.tilemap.getTileAtWorldXY(this.sprite.x, this.sprite.y);
        if (currentTile && currentTile.index == 66) {
            this.sprite.setAlpha(0.5);
        } else {
            this.sprite.setAlpha(1);
        }

        this.stateMachine.update(deltaTime);
    }

    public getSprite() {
        return this.sprite;
    }

    private dashOnEnter() {
        this.dashTime = 0;
        this.dashDuration = Phaser.Math.Between(500, 1000);
        this.sprite.play('dash');
    }

    private dashOnUpdate(deltaTime: number) {
        this.dashTime += deltaTime;

        const dashSpeed = 4;
        if(this.sprite.flipX) {
            this.sprite.setVelocityX(-dashSpeed);
        }
        else {
            this.sprite.setVelocityX(dashSpeed);
        }

        if(this.dashTime > this.dashDuration) {
            if(this.sprite.flipX) {
                this.stateMachine.setState('move-left');
            }
            else {
                this.stateMachine.setState('move-right');
            }
        }
    }

    private pauseOnEnter() {
        this.pauseTime = 0;
        this.pauseDuration = Phaser.Math.Between(500, 3000);
        this.sprite.play('paused');
    }
    private pauseOnUpdate(deltaTime: number) {
        this.pauseTime += deltaTime;
        if( this.pauseTime > this.pauseDuration ) {
            if( this.sprite.flipX ){
                this.stateMachine.setState('move-left');
            }
            else {
                this.stateMachine.setState('move-right');
            }
        }
    }

    private moveLeftOnEnter() {
        this.moveTime = 0;
        this.sprite.play('idle');
    }

    private moveLeftOnUpdate(deltaTime: number) {
        this.moveTime += deltaTime;
        this.sprite.flipX = false;
        this.sprite.setVelocityX(-2);

        if (this.moveTime > this.myMoveTime) {
            this.slumber();
        }
    }

    private slumber() {
        let d = Phaser.Math.Between(1,5);
        if( d < 4 ) {
            this.stateMachine.setState('paused');
        }
        else {
            this.stateMachine.setState('dash');
        }
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

    private moveRightOnEnter() {
        this.moveTime = 0;
        this.sprite.play('idle');
    }

    private moveRightOnUPdate(deltaTime: number) {
        this.moveTime += deltaTime;
        this.sprite.flipX = true;
        this.sprite.setVelocityX(2);

        if (this.moveTime > this.myMoveTime) {
            this.slumber();
        }
    }

    private idleOnEnter() {
        this.sprite.play('idle');
        this.stateMachine.setState('move-left');
    }

    private handleBlocked(crab: Phaser.Physics.Matter.Sprite) {
        if (this.sprite !== crab) {
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

    private handleStomped(bird: Phaser.Physics.Matter.Sprite) {
        if (this.sprite !== bird && !this.garbage) {
            return;
        }
        this.garbage = true;
        events.off(this.name + '-stomped', this.handleStomped, this);
        this.sprite.play('dead');
        this.sprite.setStatic(true);
        this.sprite.setCollisionCategory(0);
        this.sprite.on('animationcomplete', () => {
            this.cleanup();
        });
        this.stateMachine.setState('dead');
    }

    private cleanup() {
        if(this.sprite !== undefined) {
           this.sprite.destroy();
           this.stateMachine.destroy();
        }
        this.sprite = undefined;
    }

    public keepObject() {
        return !this.garbage;
    }

    private createAnims() {
        this.sprite.anims.create({
            key: 'idle',
            frameRate: 10,
            repeat: -1,
            frames: this.sprite.anims.generateFrameNames('crab', {
                start: 0,
                end: 1,
                prefix: '0_Idle',
                suffix: '.webp'
            })
        });

        this.sprite.anims.create({
            key: 'dash',
            frameRate: 3,
            repeat: -1,
            frames: this.sprite.anims.generateFrameNames('crab', {
                start: 0,
                end: 0,
                prefix: '0_Idle',
                suffix: '.webp'
            })
        });

        this.sprite.anims.create({
            key: 'paused',
            frameRate: 5,
            repeat: -1,
            frames: this.sprite.anims.generateFrameNames('crab', {
                start: 0,
                end: 1,
                prefix: '0_Idle',
                suffix: '.webp'
            })
        });

        this.sprite.anims.create({
            key: 'dead',
            frameRate: 10,
            repeat: 0,
            frames: this.sprite.anims.generateFrameNames('crab', {
                start: 0,
                end: 2,
                prefix: '1_Dead',
                suffix: '.webp'
            })
        });
    }

}