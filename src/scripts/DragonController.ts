import StateMachine from "./StateMachine";
import { sharedInstance as events } from './EventManager';
import * as CreatureLogic from './CreatureLogic';
import PlayerController from "./PlayerController";

export default class DragonController implements Creature {
    private scene: Phaser.Scene;
    private sprite: Phaser.Physics.Matter.Sprite;
    private stateMachine: StateMachine;
    private player: PlayerController;

    private moveTime = 0;
    private velocityX = 3.5;
    private name;
    private garbage: boolean = false;
    private myMoveTime = 0;
    private collideWith: number[] = [];
    private collisionCat: number = 0;
    private castFireAt: number;
    private fireballActiveTime : number = 3;

    constructor(
        scene: Phaser.Scene,
        sprite: Phaser.Physics.Matter.Sprite,
        player: PlayerController,
        name: string,
        collisionCat: number,
        collideWith: number[],

    ) {
        this.scene = scene;
        this.sprite = sprite;
        this.name = name;
        this.garbage = false;
        this.player = player;
        this.castFireAt = 0;
        this.collideWith = collideWith;
        this.collisionCat = collisionCat;
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

        this.myMoveTime = Phaser.Math.Between(5500, 7500);

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
        this.slumber();
    }

    public getSprite() {
        return this.sprite;
    }
    private handleBlocked(dragon: Phaser.Physics.Matter.Sprite) {
        if (this.sprite !== dragon) {
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

    private moveLeftOnEnter() {
        this.moveTime = 0;
    }

    private moveLeftOnUpdate(deltaTime: number) {
        this.moveTime += deltaTime;
        this.sprite.flipX = false;
        this.sprite.setVelocityX(-1 * this.velocityX);

        if (this.moveTime > this.myMoveTime) {
            this.myMoveTime = Phaser.Math.Between(5500, 7500);
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
            this.myMoveTime = Phaser.Math.Between(5500, 7500);
            this.stateMachine.setState('move-left');
        }
    }

    public lookahead(map: Phaser.Tilemaps.Tilemap): boolean {
        if (this.sprite.active == false)
            return false;

        let floorAhead = CreatureLogic.hasTileAhead(map, this.scene.cameras.main, this.sprite, true, 0);
        let wallAhead = CreatureLogic.hasTileInFront(map, this.scene.cameras.main, this.sprite, true, 0);

        if (!floorAhead || wallAhead ) {
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
        
        if (this.sprite.flipX)
            this.stateMachine.setState("move-right");
        else
            this.stateMachine.setState("move-left");
    }

    private handleStomped(dragon: Phaser.Physics.Matter.Sprite) {
        if (this.sprite !== dragon && !this.garbage) {
            return;
        }

        events.off(this.name + '-stomped', this.handleStomped, this);
        this.sprite.play('dead');
        this.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            this.cleanup();
        });
        this.stateMachine.setState('dead');
    }

    public keepObject() {
        return !this.garbage;
    }


    private cleanup() {
        if(this.sprite !== undefined) {
           this.sprite.destroy();
           this.stateMachine.destroy();
        }
        this.sprite = undefined;
        this.garbage = true;
    }


    private castFireball(dir: number) {

        if (this.castFireAt > this.scene.game.loop.frame)
            return;

        const facingDir = this.player.getSprite().body.position.x - this.sprite.body.position.x > 0 ? 1 : -1;
        if ((dir === 1 && !this.sprite.flipX && facingDir !== -1) || (dir === -1 && this.sprite.flipX && facingDir !== 1))
            return;


        let fireball = this.scene.matter.add.sprite(
            this.sprite.body.position.x - 12,
            this.sprite.body.position.y - 15,
            'fireball', undefined, {
            vertices: [{ x: 0, y: 0 }, { x: 24, y: 0 }, { x: 24, y: 24 }, { x: 0, y: 24 }],
            label: 'fireball',
            restitution: 0.0,
        });

        fireball.setCollidesWith(this.collideWith);
        fireball.setCollisionCategory(this.collisionCat);
        fireball.setVelocityX(dir * 11);

        fireball.setDepth(10);
        fireball.setIgnoreGravity(true);
        fireball.setFriction(0.0);
        fireball.setData('ttl', this.scene.game.loop.frame + 200);
        fireball.setOnCollide((data: MatterJS.ICollisionPair) => {
            const a = data.bodyB as MatterJS.BodyType;
            const b = data.bodyA as MatterJS.BodyType;

            if (b.label === 'player') {
                this.player.takeDamage(25, 'lava');
            }

            if (a.label === 'fireball') {
                a.gameObject?.destroy();
            }
            if (b.label === 'fireball') {
                b.gameObject?.destroy();
            }

        });

        fireball.anims.create({
            key: 'fireball',
            frameRate: 15,
            frames:  fireball.anims.generateFrameNumbers('fireball', { start: 0, end: 3 }),
            repeat: -1
        });
        fireball.play({key: 'fireball', startFrame: Phaser.Math.Between(0,3) }, true);
       
        this.fireballActiveTime = Phaser.Math.Between(1500, 2500 );
        this.scene.time.delayedCall( this.fireballActiveTime, () => {
            fireball.destroy();
        });


        const castDelay = Phaser.Math.Between(30,200);
        this.castFireAt = this.scene.game.loop.frame + castDelay;

        this.sprite.play('fire');
        this.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            this.stateMachine.setState('idle');
        });
    }

    private slumber() {
        if (this.player === undefined)
            return;

        let d = Phaser.Math.Distance.BetweenPoints(this.player.getSprite(), this.sprite);
        if (d < (8 * 64)) {
            let dir = (this.player.getSprite().body.position.x - this.sprite.body.position.x) < 0 ? -1 : 1;
            this.castFireball(dir);
        }

    }

    private createAnims() {
        this.sprite.anims.create({
            key: 'idle',
            frameRate: 5 ,
            repeat: -1,
            frames: this.sprite.anims.generateFrameNames('dragon', {
                start: 0,
                end: 1,
                prefix: '0_Idle',
                suffix: '.webp'
            })
        });

        this.sprite.anims.create({
            key: 'fire',
            frameRate: 10,
            repeat: 1,
            frames: this.sprite.anims.generateFrameNames('dragon', {
                start: 2,
                end: 2,
                prefix: '0_Idle',
                suffix: '.webp'
            })
        });

        this.sprite.anims.create({
            key: 'dead',
            frameRate: 10,
            repeat: 0,
            frames: this.sprite.anims.generateFrameNames('dragon', {
                start: 0,
                end: 2,
                prefix: '1_Dead',
                suffix: '.webp'
            })
        });
    }

}