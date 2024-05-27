import StateMachine from "./StateMachine";
import { sharedInstance as events } from './EventManager';
import * as CreatureLogic from './CreatureLogic';
import PlayerController from "./PlayerController";

export default class CrabController implements Creature {
    private scene: Phaser.Scene;
    private sprite: Phaser.Physics.Matter.Sprite;
    private heart?: Phaser.GameObjects.Image;
    private stateMachine: StateMachine;

    private moveTime = 0;
    private name: string;
    private garbage = false;
    private myMoveTime = 0;
    private strength: number = 1;

    private pauseTime: number = 0;
    private pauseDuration: number = 0;

    private dashTime: number = 0;
    private dashDuration: number = 0;

    private attackDuration: number = 0;
    private attackPower: number = 3;

    private aggroTime: number = 0;
    private aggroDuration: number = 400;

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
            .addState('attack', {
                onEnter: this.attackOnEnter,
                onUpdate: this.attackOnUpdate,
                onExit: this.attackOnExit,
            })
            .addState('follow', {
                onEnter: this.followOnEnter,
                onUpdate: this.followOnUpdate,
                onExit: this.followOnExit,
            })
            .addState('evade', {
                onEnter: this.evadeOnEnter,
                onUpdate: this.evadeOnUpdate,
                onExit: this.evadeOnExit,
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
        
        this.stateMachine.update(deltaTime);

        this.aggroTime += deltaTime;
        if(this.aggroTime > this.aggroDuration) {
            this.aggro();
            this.aggroTime = 0;
        }
    }

    private destroyCreatureIcon() {
        if( this.heart !== undefined) {
            const fadeOutTweenConfig = {
                targets: this.heart,
                alpha: 0,
                duration: 200,
                onComplete: () => {
                    this.heart?.destroy();
                    this.heart = undefined;
                }
            };
            this.scene.tweens.add(fadeOutTweenConfig);
        }
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

    private attackOnEnter() {
        this.moveTime = 0;
        this.strength = this.attackPower;
        this.attackDuration = Phaser.Math.Between(2000,5500); 
        if(this.heart === undefined) {
            this.heart = this.scene.add.image( this.sprite.x, this.sprite.y - this.sprite.height + 32, 'beware',3).setScale(0.75,0.75);
            const tweenConfig = {
                targets: this.heart,
                scaleX: 1.25,
                scaleY: 1.25,
                duration: 1500,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: 99,
                onComplete: () => {
                    this.destroyCreatureIcon();
                }
            };
            this.scene.tweens.add( tweenConfig );
        }
    }
    private attackOnUpdate(deltaTime: number) {
         const dx = this.player.getSprite().x - this.sprite.body?.position.x;
         const dy = this.player.getSprite().y - this.sprite.body?.position.y;
         const magnitude = Math.sqrt(dx * dx + dy * dy);
         const directionX = dx / magnitude;
         this.sprite.setVelocityX(directionX * 3.55);
         this.heart?.setPosition(this.sprite.x, this.sprite.y - this.sprite.height + 32);

        this.moveTime += deltaTime;
        if(this.moveTime > this.attackDuration ) {
            this.stateMachine.setState('idle');
        }
    }
    
    private attackOnExit() {
        this.destroyCreatureIcon();
    }

    private evadeOnExit() {
    }

    private evadeOnEnter() {
        this.moveTime = 0;
        this.sprite.play('idle');
    }

    private followOnExit() {
        this.destroyCreatureIcon();
    }

    private followOnEnter() {
        this.moveTime = 0;
        this.sprite.play('calm');

        if(this.heart === undefined) {
            this.heart = this.scene.add.image( this.sprite.x, this.sprite.y - this.sprite.height + 32, 'star',4).setScale(0.33,0.33);
            const tweenConfig = {
                targets: this.heart,
                scaleX: 0.65,
                scaleY: 0.65,
                duration: 1500,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: 99,
                onComplete: () => {
                    this.destroyCreatureIcon();
                }
            };
            this.scene.tweens.add( tweenConfig );
        }
    }
    
    private evadeOnUpdate() {
        const playerX = this.player.getSprite().x;
        const enemyX = this.sprite.x;
        const playerY = this.player.getSprite().y;
        const enemyY = this.sprite.y
        
        const dY = Math.abs( playerY - enemyY);
        if( dY > 16 ) {
            //this.stateMachine.setState('idle');
            return;
        }

        const distance = Phaser.Math.Distance.Between(enemyX, enemyY, playerX, playerY);
    
        let directionX = (enemyX < playerX) ? -1 : 1;
    
        let velocityMagnitude = 2; 
        if (distance < 256) {
            velocityMagnitude = Phaser.Math.Linear(0, 7, distance / 256);
        }
        else {
             this.stateMachine.setState('follow');
        } 

        if(distance < 96){
            this.stateMachine.setState('attack');
        }

        this.sprite.setVelocityX(directionX * velocityMagnitude);
    }

    private followOnUpdate(deltaTime: number) {
        if (this.player === undefined || this.sprite.body === undefined)
            return;
    
        this.heart?.setPosition(this.sprite.x, this.sprite.y - this.sprite.height + 32);
    
        const playerX = this.player.getSprite().x;
        const enemyX = this.sprite.x;
        const playerY = this.player.getSprite().y;
        const enemyY = this.sprite.y
        
        const dY = Math.abs( playerY - enemyY);

        this.moveTime += deltaTime;

        if( dY > 16 ) {
            this.sprite.play('dash');
            if( this.moveTime > 4000) {
                this.stateMachine.setState('idle');
            }
            return;
        }

        const distance = Phaser.Math.Distance.Between(enemyX, enemyY, playerX, playerY);
    
        let directionX = (enemyX < playerX) ? 1 : -1;
    
        let velocityMagnitude = 1.5; 
        const minDistance = 150; 
            
        if (distance <= minDistance) {
            velocityMagnitude = Phaser.Math.Linear(3, 0, distance / minDistance);
            if(velocityMagnitude < 1)
                this.sprite.play('dash');
        }
        else if ( distance > 256 ) {
            this.stateMachine.setState('idle');
        }

        this.sprite.setVelocityX(directionX * velocityMagnitude);
     
        if(distance < 128) {
            this.stateMachine.setState('evade');
        }

        if(distance < 96){
            this.stateMachine.setState('attack');
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
            this.slumber(true);
        }
    }

    private aggro() {
        if(this.player !== undefined ) {
            const cur = this.stateMachine.getCurrentState();
            if( cur !== 'attack' && cur !== 'follow' && cur !== 'evade' && cur !== 'dead') {
                const distance = Phaser.Math.Distance.Between( this.sprite.body?.position.x,
                    this.sprite.body?.position.y,
                    this.player.getSprite().x,
                    this.player.getSprite().y );
                
                if( distance < (3 * 64 ) ) {
                    const currentSpeed = Math.abs(this.player.getSprite().body.velocity.x);
                    const dY = Math.abs(  this.player.getSprite().y - this.sprite.y);
                                        
                    if(currentSpeed > 3 ) {
                        this.stateMachine.setState('attack');
                    }
                    else {
                        this.stateMachine.setState( dY > 16 ? 'idle' : 'follow');
                    }
                    return true;
                }
            }
        }
        return false;
    }

    private slumber(changeDirection: boolean) {

        if (this.sprite.active == false)
            return;

        if( this.aggro() )
            return;
        
        let state = 'dash';
        let d = Phaser.Math.Between(1,5);
        if( d < 3 ) {
            state = 'paused';
        }
        
        if( changeDirection ) {
            if (this.sprite.flipX)
                state = "move-left";
            else
                state = "move-right";
        }

        this.stateMachine.setState(state);
        this.myMoveTime = Phaser.Math.Between(1500, 3350);

        this.destroyCreatureIcon();
    }

    public lookahead(map: Phaser.Tilemaps.Tilemap): boolean {
        if (this.sprite.active == false)
            return false;

        if (!CreatureLogic.hasTileAhead(map, this.scene.cameras.main, this.sprite, true, 0) && this.sprite.body?.velocity.y == 0) {
            this.slumber(true);
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
            this.slumber(true);
        }
    }

    private idleOnEnter() {
        this.sprite.play('idle');
        if( this.sprite.flipX ){
            this.stateMachine.setState('move-left');
        }
        else {
            this.stateMachine.setState('move-right');
        }
    }

    private handleBlocked(crab: Phaser.Physics.Matter.Sprite) {
        if (this.sprite !== crab) {
            return;
        }

        this.slumber(true);
    }

    private handleStomped(crab: Phaser.Physics.Matter.Sprite) {
        if (this.sprite !== crab && !this.garbage) {
            return;
        }

        if( this.attackPower > 0 ) {
            this.attackPower --;
        }
        if( this.strength > 0 ) {
            this.strength --;
        }

        if(this.strength > 0)
            return;

        this.stateMachine.setState('dead');

        events.off(this.name + '-stomped', this.handleStomped, this);

        this.heart?.setVisible(false);

        this.sprite.play('dead');
       // this.sprite.setStatic(true);
       // this.sprite.setCollisionCategory(0);
        this.sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            this.cleanup();
        });

    }

    private cleanup() {
        if(this.garbage)
            return;
        this.stateMachine.destroy();
        if(this.sprite !== undefined) {
           this.sprite.destroy();
        }
        this.heart?.destroy();
        this.heart = undefined;
        this.sprite = undefined;
        this.garbage = true;
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
            frameRate: 10,
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

        this.sprite.anims.create({
            key: 'calm',
            frameRate: 5,
            repeat: -1,
            frames: this.sprite.anims.generateFrameNames('crab', {
                start: 0,
                end: 1,
                prefix: '0_Idle',
                suffix: '.webp'
            })
        });
    }

}