import StateMachine from "./StateMachine";
import { sharedInstance as events } from './EventManager';

export default class BatController implements Controller {
    private scene: Phaser.Scene;
    private sprite: Phaser.Physics.Matter.Sprite;
    private stateMachine: StateMachine;
    private garbage = false;
    private moveTime = 0;
    private name;
    private velocityX = 7;

    private verticalSpeed: number;
    private verticalRange: number;
    private verticalTimer: number = 0;
    private verticalDuration: number = 200;
    private verticalDirection: number = -1;

    constructor(
        scene: Phaser.Scene,
        sprite: Phaser.Physics.Matter.Sprite,
        name: string
    ) {
        this.scene = scene;
        this.sprite = sprite;
        this.name = name;
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

        events.on(this.name + '-stomped', this.handleStomped, this);
        events.on(this.name + '-blocked', this.handleBlocked, this);

        this.velocityX = Phaser.Math.FloatBetween(5.0, 8.0);
    
        this.verticalSpeed = 0.3;
        this.verticalRange = 10;
    }

    destroy() {
        events.off(this.name + '-stomped', this.handleStomped, this);
        events.off(this.name + '-blocked', this.handleBlocked, this);

        this.cleanup();
    }

    update(deltaTime: number) {
        this.stateMachine.update(deltaTime);
    
        this.verticalTimer += deltaTime;

        if( this.verticalTimer >= this.verticalDuration ) {
            this.verticalDirection *= -1;
            this.verticalTimer = 0;
        }

        const verticalOffset = this.verticalRange * Math.sin(this.moveTime / 1000 * this.verticalSpeed);
        this.sprite.setVelocityY(this.verticalDirection * verticalOffset);
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
        this.sprite.setVelocityX(-1 * this.velocityX);

        if (this.moveTime > 2000) {
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

        if (this.moveTime > 2000) {
            this.stateMachine.setState('move-left');
        }
    }

    private idleOnEnter() {
        this.sprite.play('idle');
        this.stateMachine.setState('move-left');
    }

    private handleStomped(bat: Phaser.Physics.Matter.Sprite) {
        if (this.sprite !== bat && !this.garbage) {
            return;
        }

        events.off(this.name + '-stomped', this.handleStomped, this);
        this.sprite.setStatic(true);
        this.sprite.setCollisionCategory(0);
        this.sprite.play('dead');
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
        this.garbage = true;
    }

    private handleBlocked(bat: Phaser.Physics.Matter.Sprite) {
        if (this.sprite !== bat) {
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

    public keepObject() {
        return !this.garbage;
    }

    private createAnims() {
        const framerate = Phaser.Math.Between(8,12);
        this.sprite.anims.create({
            key: 'idle',
            frameRate: framerate,
            repeat: -1,
            frames: this.sprite.anims.generateFrameNames('bat', {
                start: 0,
                end: 3,
                prefix: '0_Idle',
                suffix: '.webp'
            })
        });
        this.sprite.anims.create({
            key: 'dead',
            frameRate: framerate,
            repeat: 0,
            frames: this.sprite.anims.generateFrameNames('bat', {
                start: 0,
                end: 1,
                prefix: '1_Dead',
                suffix: '.webp'
            })
        });
    }

}