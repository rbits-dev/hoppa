import StateMachine from "./StateMachine";
import { sharedInstance as events } from './EventManager';


export default class ZeppelinController implements Creature {
    private scene: Phaser.Scene;
    private sprite: Phaser.Physics.Matter.Sprite;
    private stateMachine: StateMachine;

    private moveTime = 0;
    private name: string;
    private velocityX = 2;
    private turnAfter = 0;

    constructor(
        scene: Phaser.Scene,
        sprite: Phaser.Physics.Matter.Sprite,
        name: string
    ) {
        this.scene = scene;
        this.sprite = sprite;
        this.name = name;

        this.stateMachine = new StateMachine(this);

        this.velocityX = 0.5 + (Math.random() * this.velocityX);
        this.turnAfter = Phaser.Math.Between(4000,8000);

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

        events.on(this.name + '-blocked', this.handleBlocked, this);
    }

    keepObject() {
        return true;
    }

    destroy() {
        events.off(this.name + '-blocked', this.handleBlocked, this);

        this.sprite.destroy();
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
        this.sprite.setVelocityX(-1 * this.velocityX);

        if (this.moveTime > this.turnAfter) {
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

        if (this.moveTime > this.turnAfter) {
            this.stateMachine.setState('move-left');
        }
    }

    public lookahead(map: Phaser.Tilemaps.Tilemap): boolean {
        if (this.sprite.active == false)
            return false;

        const x = this.sprite.x;
        const y = this.sprite.y;
        const sw = map.widthInPixels;
        if( x >= sw - this.sprite.width/2 ) {
                this.stateMachine.setState("move-left");
        }
        if( x <= this.sprite.width/2 ) {
                this.stateMachine.setState("move-right");
        }
 
      
        return false;
    }

    private idleOnEnter() {
        this.stateMachine.setState('move-left');
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
}