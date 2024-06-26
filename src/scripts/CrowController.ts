import StateMachine from "./StateMachine";
import { sharedInstance as events } from './EventManager';

export default class CrowController implements Creature {
    private scene: Phaser.Scene;
    private sprite: Phaser.Physics.Matter.Sprite;
    private stateMachine: StateMachine;

    private moveTime = 0;
    private name;

    private garbage = false;

    constructor(
        scene: Phaser.Scene,
        sprite: Phaser.Physics.Matter.Sprite,
        name: string
    ) {
        this.scene = scene;
        this.sprite = sprite;
        this.name = name;
        this.createAnims();
        this.garbage = false;
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
    }

    destroy() {
        events.off(this.name + '-stomped', this.handleStomped, this);
        events.off(this.name + '-blocked', this.handleBlocked, this);

        this.cleanup();
    }

    update(deltaTime: number) {
        this.stateMachine.update(deltaTime);
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

        if (this.moveTime > 45000) {
            this.stateMachine.setState('move-right');
        }
    }

    public lookahead(map: Phaser.Tilemaps.Tilemap): boolean {
        if (this.sprite.active == false)
            return false;

            const x = this.sprite.x;
            const y = this.sprite.y;
            const sw = map.widthInPixels;
            if( x >= sw - this.sprite.width ) {
                this.stateMachine.setState("move-left");
            }
            if( x <= this.sprite.width/2 ) {
                this.stateMachine.setState("move-right");
            }

        return false;
    }
    private moveRightOnEnter() {
        this.moveTime = 0;
    }

    private moveRightOnUPdate(deltaTime: number) {
        this.moveTime += deltaTime;
        this.sprite.flipX = true;
        this.sprite.setVelocityX(3);

        if (this.moveTime > 45000) {
            this.stateMachine.setState('move-left');
        }
    }

    private idleOnEnter() {
        this.sprite.play('idle');
        this.stateMachine.setState('move-left');
    }

    private handleStomped(crow: Phaser.Physics.Matter.Sprite) {
        if (this.sprite !== crow && !this.garbage) {
            return;
        }
        
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
        this.garbage = true;
    }

    private handleBlocked(crow: Phaser.Physics.Matter.Sprite) {
        if (this.sprite !== crow) {
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
        this.sprite.anims.create({
            key: 'idle',
            frameRate: 5,
            repeat: -1,
            frames: this.sprite.anims.generateFrameNames('crow', {
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
            frames: this.sprite.anims.generateFrameNames('crow', {
                start: 0,
                end: 2,
                prefix: '1_Dead',
                suffix: '.webp'
            })
        });
    }

}