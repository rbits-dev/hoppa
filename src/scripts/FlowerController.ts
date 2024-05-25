import StateMachine from "./StateMachine";
import { sharedInstance as events } from './EventManager';

export default class FlowerController implements Creature {
    private sprite: Phaser.Physics.Matter.Sprite;
    private stateMachine: StateMachine;
    private name;
    private isGarbage: boolean = false;

    constructor(
        scene: Phaser.Scene,
        sprite: Phaser.Physics.Matter.Sprite,
        name: string
    ) {
        this.sprite = sprite;
        this.name = name;
        this.createAnims();

        this.stateMachine = new StateMachine(this);

        this.stateMachine.addState('idle', {
            onEnter: this.idleOnEnter
        })
            .addState('dead', {
            })
            .setState('idle');

        events.on(this.name + '-stomped', this.handleStomped, this);
    }

    destroy() {
        events.off(this.name + '-stomped', this.handleStomped, this);

        this.cleanup();
    }

    update(deltaTime: number) {
        this.stateMachine.update(deltaTime);
    }

    public getSprite() {
        return this.sprite;
    }

    private idleOnEnter() {
        this.sprite.play('idle');
    }

    keepObject(): boolean {
        return !this.isGarbage;
    }

    private handleStomped(flower: Phaser.Physics.Matter.Sprite) {
        if (this.sprite !== flower) {
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
        this.isGarbage = true;
    }

    private createAnims() {
        this.sprite.anims.create({
            key: 'idle',
            frameRate: Phaser.Math.Between(2,4),
            repeat: -1,
            frames: this.sprite.anims.generateFrameNames('flower', {
                start: 1,
                end: 4,
                prefix: '0_Idle',
                suffix: '.webp'
            })
        });
        this.sprite.anims.create({
            key: 'dead',
            frameRate: 15,
            repeat: 0,
            frames: this.sprite.anims.generateFrameNames('flower', {
                start: 1,
                end: 3,
                prefix: '1_Dead',
                suffix: '.webp'
            })
        });
    }

}