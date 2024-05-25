import StateMachine from "./StateMachine";
import { sharedInstance as events } from './EventManager';

export default class PlantController implements Creature {
    private sprite: Phaser.Physics.Matter.Sprite;
    private stateMachine: StateMachine;
    private touched: boolean;
    private dead: boolean;
    private name: string;
    private garbage: boolean = false;
   
    private enemyCat: number;
    private collidesWith: number[];

    constructor(
        scene: Phaser.Scene,
        sprite: Phaser.Physics.Matter.Sprite,
        name: string,
        enemycat: number,
        collidesWith: number[],

    ) {
        this.sprite = sprite;
        this.name = name;
        this.touched = false;
        this.dead = false;
        this.enemyCat = enemycat;
        this.collidesWith = collidesWith;

        this.createAnims(); 
         
        this.stateMachine = new StateMachine(this);

        this.stateMachine.addState('idle', {
            onEnter: this.idleOnEnter,
        })
        .addState('dead', {
            onEnter: this.deadOnEnter,
        })
        .setState('idle');

        events.on(this.name + '-stomped', this.handleStomped, this);
        events.on(this.name + '-touched', this.handleTouched, this);
    }

    lookahead(map: Phaser.Tilemaps.Tilemap): boolean {
        return false;
    }

    destroy() {
        events.off(this.name + '-stomped', this.handleStomped, this);
        events.off(this.name + '-touched', this.handleTouched, this);

        this.cleanup();
    }

    update(deltaTime: number) {
        this.stateMachine.update(deltaTime);
    }

    public getSprite() {
        return this.sprite;
    }

    private idleOnEnter() {

        if(!this.touched) {
            this.sprite.play('wait');
        }
        else {
            this.sprite.play('idle');
        }
    }    

    private deadOnEnter() {
        this.sprite.play('dead');
        this.sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            this.cleanup();
        });
    }

    private handleStomped(plant: Phaser.Physics.Matter.Sprite) {
        if (this.sprite !== plant) {
            return;
        }

        if(!this.touched) {
            this.touched = true;
            this.grow(true);
        }

        
        events.off(this.name + '-stomped', this.handleStomped, this);
        //this.sprite.setStatic(true);
        this.sprite.setCollisionCategory(0);
        
        this.stateMachine.setState('dead');
    }

    private handleTouched(plant: Phaser.Physics.Matter.Sprite) {
        if (this.sprite !== plant) {
            return;
        }
        if(this.touched == true || this.dead)
            return;

        this.grow(false);
        this.touched = true;
        events.off(this.name + '-touched', this.handleTouched, this);
      
    }

    private grow(dies: boolean) {
       
        this.sprite.play('grow').on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            this.stateMachine.setState( dies ? 'dead': 'idle');
        });
       /* .on( 'animationupdate', (anim,frame) => {
            const fh = [ 8,8, 16, 64, 96, 128,8,8 ];
            if(anim.key === 'grow' ) {
                const frameIndex = frame.index;
                const newHeight = fh[ frameIndex ];
                this.sprite.setBody({ height: newHeight });
                this.sprite.setFixedRotation();
                this.sprite.setStatic(true);
                this.sprite.setCollidesWith(this.collidesWith);
                this.sprite.setCollisionCategory(this.enemyCat);
            }
        }); */
    }


    private cleanup() {
        if(this.garbage)
            return;
        this.stateMachine.destroy();
        if(this.sprite !== undefined) {
           this.sprite.destroy();
        }
        this.sprite = undefined;
        this.garbage = true;
    }

    public keepObject(): boolean {
        return !this.garbage;
    }

    private createAnims() {
        this.sprite.anims.create({
            key: 'idle',
            frameRate: 0.5,
            repeat: -1,
            frames: this.sprite.anims.generateFrameNames('plant', {
                start: 4,
                end: 5,
                prefix: 'PlantTrap',
                suffix: '.webp'
            })
        });
        this.sprite.anims.create({
            key: 'wait',
            frameRate: 0.5,
            repeat: -1,
            frames: this.sprite.anims.generateFrameNames('plant', {
                start: 1,
                end: 1,
                prefix: 'PlantTrap',
                suffix: '.webp'
            })
        });
        this.sprite.anims.create({
            key: 'grow',
            frameRate: 10,
            repeat: 0,
            frames: this.sprite.anims.generateFrameNames('plant', {
                start: 2,
                end: 4,
                prefix: 'PlantTrap',
                suffix: '.webp'
            })
        });
        this.sprite.anims.create({
            key: 'dead',
            frameRate: 15,
            repeat: 0,
            frames: this.sprite.anims.generateFrameNames('plant', {
                start: 6,
                end: 8,
                prefix: 'PlantTrap',
                suffix: '.webp'
            })
        });
    }

}