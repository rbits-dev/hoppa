import StateMachine from "./StateMachine";
import { sharedInstance as events } from './EventManager';
import * as CreatureLogic from './CreatureLogic';
import PlayerController from "./PlayerController";

export default class FireWalkerController {
    private scene: Phaser.Scene;
    private sprite: Phaser.Physics.Matter.Sprite;
    private stateMachine: StateMachine;
    private player: PlayerController;
    private garbage = false;
    private moveTime = 0;
    private velocityX;
    private startVelocityX;
    private prevVelocityX;
    private name;
    private myMoveTime = 0;

    private hasBoosted: boolean = false;
    private boostCooldown: number = 0;
    private speed: number = 0;

    constructor(
        scene: Phaser.Scene,
        sprite: Phaser.Physics.Matter.Sprite,
        name: string,
        player: PlayerController
    ) {
        this.scene = scene;
        this.sprite = sprite;
        this.name = name;
        this.player = player;
        this.garbage = false;
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
            })
            .setState('idle');

        this.myMoveTime = Phaser.Math.Between(12000, 18000);
        this.velocityX = Phaser.Math.FloatBetween( 3.45 , 4.55 );
        this.startVelocityX = this.velocityX;

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

        if(this.player === undefined)
            return;

        const playerSprite = this.player.getSprite();

        const enemyTileX = Math.floor(this.sprite.x / 64);
        const playerTileX = Math.floor(playerSprite.x / 64); 
        
        const inLine = (this.sprite.flipX && enemyTileX < playerTileX) || 
                       (!this.sprite.flipX && enemyTileX > playerTileX);

        const dY = Math.abs( playerSprite.y - this.sprite.y);
       

        if( inLine && dY < 32 ) {
            const distance = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, playerSprite.x, playerSprite.y);
            
            if (!this.hasBoosted && this.boostCooldown <= 0 && distance < (5 * 64) && 
                ((this.sprite.flipX && this.sprite.x < playerSprite.x) || 
                (!this.sprite.flipX && this.sprite.x > playerSprite.x))) {

                if(this.speed == 0) {
                    let cv = this.velocityX * 0.8;
                    this.velocityX += cv;
                    this.speed = cv;
                }

                this.hasBoosted = true;
                this.boostCooldown = 1000;
            }
        }
        
        this.boostCooldown = Math.max(0, this.boostCooldown - deltaTime );
        if(this.boostCooldown <= 0) {
            this.hasBoosted = false;
            this.velocityX -= this.speed;
            this.speed = 0;
        }

        this.velocityChange();
    }

    public getSprite() {
        return this.sprite;
    }

    private moveLeftOnEnter() {
        this.moveTime = 0;
    }

    private velocityChange() {
        if(this.prevVelocityX != this.velocityX ) {

            const v = Math.abs( this.sprite.body?.velocity.x );
            if( v > this.startVelocityX ) {
                this.sprite.play('fast');
            }
            else {
                this.sprite.play('idle');
            }

            this.prevVelocityX = this.velocityX
        }
    }

    private moveLeftOnUpdate(deltaTime: number) {
        this.moveTime += deltaTime;
        this.sprite.flipX = false;
        this.sprite.setVelocityX(-1 * this.velocityX);
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
        this.sprite.setVelocityX(this.velocityX);

        if (this.moveTime > this.myMoveTime) {
            this.stateMachine.setState('move-left');
        }
    }

    public lookahead(map: Phaser.Tilemaps.Tilemap): boolean {
        if (this.sprite.active == false)
            return false;

        if (!CreatureLogic.hasTileAhead(map, this.scene.cameras.main, this.sprite, true, 0) && this.sprite.body?.velocity.y == 0) {
            if (this.sprite.flipX) {
                this.stateMachine.setState("move-left");
            }
            else {
                this.stateMachine.setState("move-right");
            }
            return true;
        }

        return false;
    }

    private idleOnEnter() {
        this.sprite.play('idle');
        this.stateMachine.setState(this.sprite.flipX ? 'move-right' : 'move-left');
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

    private handleStomped(fire: Phaser.Physics.Matter.Sprite) {
        if (this.sprite !== fire && !this.garbage) {
            return;
        }
        this.garbage = true;
        events.off(this.name + '-stomped', this.handleStomped, this);
        this.sprite.play('dead');
        this.sprite.setStatic(true);
        this.sprite.setCollisionCategory(0);
        this.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
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
            key: 'fast',
            frameRate: 10,
            repeat: -1,
            frames: this.sprite.anims.generateFrameNames('firewalker', {
                start: 0,
                end: 1,
                prefix: '0_Idle',
                suffix: '.webp'
            })
        });

        this.sprite.anims.create({
            key: 'idle',
            frameRate: 5,
            repeat: -1,
            frames: this.sprite.anims.generateFrameNames('firewalker', {
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
            frames: this.sprite.anims.generateFrameNames('firewalker', {
                start: 0,
                end: 2,
                prefix: '1_Dead',
                suffix: '.webp'
            })
        });
    }

}