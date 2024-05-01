import StateMachine from "./StateMachine";
import { sharedInstance as events } from './EventManager';
import PlayerController from "./PlayerController";
//import TestRoom from "~/scenes/TestRoom";
import * as CreatureLogic from './CreatureLogic';

export default class FlyController {
    private scene: Phaser.Scene;
    private sprite: Phaser.Physics.Matter.Sprite;
    private stateMachine: StateMachine;
    private player: PlayerController;

    private startingPosition: { x: number, y: number };
    private lastKnownPlayerPosition: { x: number, y: number };// Store the last known player position
    private lastKnownPlayerBounds
    private garbage = false;
    private direction = 0;
    private moveTime = 0;
    private collideWith: number[] = [];
    private collisionCat: number = 0;
    private moveTargetTime = 0;
    private name;
    private wingPower = 0;
    private droppingActiveTime: number = 0;
    private castDroppingAt: number = 0;

    constructor(
        scene: Phaser.Scene,
        sprite: Phaser.Physics.Matter.Sprite,
        name: string,
        player: PlayerController,
        collisionCat: number,
        collideWith: number[],
    ) {
        this.scene = scene;
        this.sprite = sprite;
        this.name = name;
        this.garbage = false;
        this.player = player;
        this.collideWith = collideWith;
        this.collisionCat = collisionCat;
        this.createAnims();
        this.startingPosition = { x: sprite.x, y: sprite.y };
        this.lastKnownPlayerPosition = { x: 0, y: 0 };
        this.lastKnownPlayerBounds = null;

        this.stateMachine = new StateMachine(this);

        this.stateMachine.addState('idle', {
            onEnter: this.idleOnEnter,
            onUpdate:  this.idleOnUpdate
        })
        .addState('move-to-player',{
            onEnter: this.moveToPlayerOnEnter,
            onUpdate: this.moveToPlayerOnUpdate
        })
        .addState('return-to-origin', {
            onEnter: this.returnToOriginOnEnter,
            onUpdate: this.returnToOriginOnUpdate
        })
        .addState('move-down', {
            onEnter: this.moveDownOnEnter,
            onUpdate: this.moveDownOnUpdate
        })
        .addState('move-up', {
            onEnter: this.moveUpOnEnter,
            onUpdate: this.moveUpOnUPdate
        })
        .addState('dead', {
        })
        .setState('move-down'); // down is actually up!

        events.on(this.name + '-stomped', this.handleStomped, this);
        events.on(this.name + '-blocked', this.handleBlocked, this);

        this.wingPower = 2//Phaser.Math.FloatBetween(2.0, 4.0);
        this.moveTargetTime = Phaser.Math.Between(300, 2500);

    }

    destroy() {
        events.off(this.name + '-stomped', this.handleStomped, this);
        events.off(this.name + '-blocked', this.handleBlocked, this);

        this.cleanup();
    }

    update(deltaTime: number) {
        this.stateMachine.update(deltaTime);

        if(this.player !== undefined)
            this.lastKnownPlayerPosition = { x: this.player.getSprite().x, y: this.player.getSprite().y }; 
    }

    public getSprite() {
        return this.sprite;
    }

    private calculateAttackAngle(lastKnownPlayerPosition: object){
        const dx = this.lastKnownPlayerPosition.x - this.sprite.body.position.x;
        const dy = this.lastKnownPlayerPosition.y - this.sprite.body.position.y;
        return Math.atan2(dy, dx);
    }

    public lookahead(map: Phaser.Tilemaps.Tilemap): boolean {
        if (this.sprite === undefined || this.sprite.active == false)
            return false;
            
        const direction = (this.sprite.body.velocity.y > 0) ? 1 : -1;
        let y = this.sprite.body.position.y;
        y += (direction * 64);
        
        const tile = map.getTileAtWorldXY(this.sprite.body.x, y, undefined, this.scene.cameras.main, 'ground');
            
        if (tile != null) {
            if (this.direction == 1 )
                this.stateMachine.setState("move-down");
            else
                this.stateMachine.setState("move-up");
        
                return true;
        }
        
        return false;
    }

    private lookahead1(map: Phaser.Tilemaps.Tilemap): boolean {
        if (this.player !== undefined) {
            if (this.sprite === undefined || this.sprite.active == false){
                return false;}
            const ray = new Phaser.Geom.Line(this.sprite.x, this.sprite.y, this.player.getSprite().x, this.player.getSprite().y);
            const obstaclesLayer = map.getLayer("ground").tilemapLayer;          
            const tiles = obstaclesLayer.getTilesWithinShape(ray);
            
            const nonEmptyTiles = tiles.filter(tile => tile.index !== -1);
            return (nonEmptyTiles.length === 0);
        }
        return false;
    }
    
    private moveToPlayerOnEnter() {
        this.moveTime = 0;
        this.direction = 0;
        if (this.player !== undefined) {
            this.lastKnownPlayerBounds = this.player.getSprite().getBounds();
        }
        this.sprite?.play('flying');
    }

    private moveToPlayerOnUpdate(deltaTime: number) {
        if (this.player !== undefined) {
            
            const canAttack = this.lookahead1(this.scene.map);
            console.log(canAttack);

            if (canAttack){
                var playerSprite  = this.player.getSprite();
                const angle = this.calculateAttackAngle(this.lastKnownPlayerPosition);//Math.atan2(dy, dx);
                // Adjust velocity to move towards the player
                this.sprite.setVelocityX(Math.cos(angle) * this.wingPower);
                this.sprite.setVelocityY(Math.sin(angle) * this.wingPower);

                const dx = this.lastKnownPlayerPosition.x - this.sprite.body.position.x;

                // Determine the direction of flight based on the change in X position
                const direction = dx > 0 ? 1 : -1;

                // Flip the sprite horizontally based on the direction of flight
                this.sprite.setFlipX(direction === 1);


                if (Phaser.Geom.Intersects.RectangleToRectangle(this.lastKnownPlayerBounds, this.sprite.getBounds()) || 
                    Phaser.Geom.Intersects.RectangleToRectangle(playerSprite.getBounds(), this.sprite.getBounds()))
                {
                    this.stateMachine.setState('return-to-origin');
                }

            } else {

                // If player is not in line of sight, move up or down depending on current velocity
                if (this.sprite?.body?.velocity.y == 0) {
                    this.stateMachine.setState('move-down');
                }
                else {
                    let d = Phaser.Math.Between(0,1);
                    if( d == 0 )
                        this.stateMachine.setState('move-down');
                    else
                        this.stateMachine.setState('move-up');
                }
                this.moveTargetTime = Phaser.Math.Between(200,1000);
            }
        }
    }

    private returnToOriginOnEnter() {
        this.sprite?.play('flying');
        this.moveTime = 0;
        if (this.player !== undefined) {
            this.lastKnownPlayerPosition = { x: this.player.getSprite().x, y: this.player.getSprite().y }; // Store the player's position
        }
    }

    private returnToOriginOnUpdate(deltaTime: number) {
        const dx = this.startingPosition.x - this.sprite.x;
        const dy = this.startingPosition.y - this.sprite.y;
        const angle = Math.atan2(dy, dx);

        const attackAngle = this.calculateAttackAngle(this.lastKnownPlayerPosition)
        this.castDropping(attackAngle);

        // Adjust velocity to move towards the starting position
        this.sprite.setVelocityX(Math.cos(angle) * this.wingPower);
        this.sprite.setVelocityY(Math.sin(angle) * this.wingPower);

        const direction = dx > 0 ? 1 : -1;

        // Flip the sprite horizontally based on the direction of flight
        this.sprite.setFlipX(direction === 1);
        
        // If the fly returns to its starting position, starting normal pattern
        const distanceToOrigin = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, this.startingPosition.x, this.startingPosition.y);
        if (distanceToOrigin < 32) {
            this.stateMachine.setState('move-up');
        }
    }
    
    private moveDownOnEnter() {
        this.sprite?.play('flying');
        this.moveTime = 0;
        this.direction = 0;
        this.sprite?.setVelocityY(-1 * this.wingPower);
    }

    private moveDownOnUpdate(deltaTime: number) { // this is up actually
        this.moveTime += deltaTime;

        let thinkingTime = this.moveTargetTime / 2;
/*
        if(this.sprite?.body?.velocity.y == 0 && thinkingTime < this.moveTime ) {
            this.stateMachine.setState('idle'); // fly has landed
            this.moveTargetTime = Phaser.Math.Between(300,1450);
            return;
        }
  */      
        this.sprite?.setVelocityY(-1 * this.wingPower);

        if( thinkingTime < this.moveTime && this.player !== undefined ) {
            let v = Phaser.Math.Between(0,3);
            if( v >= 2 ) {
                let d = Phaser.Math.Distance.BetweenPoints(this.player.getSprite(), this.sprite);
                if (d < (6 * 64)) {
                    this.stateMachine.setState('move-to-player');
                    return;
                }
            }
        }

        if (this.moveTime > this.moveTargetTime) {   
            this.stateMachine.setState('move-up');
            this.moveTargetTime = Phaser.Math.Between(1000,2200);
        }
    }

    private moveUpOnEnter() {
        this.sprite?.play('flying');
        this.moveTime = 0;
        this.direction = 1;
    }

    private moveUpOnUPdate(deltaTime: number) {
        this.moveTime += deltaTime;
        let thinkingTime = this.moveTargetTime / 2;

      /*  if(this.sprite?.body?.velocity.y == 0 && thinkingTime < this.moveTime ) {
            this.stateMachine.setState('idle'); // fly has landed
            this.moveTargetTime = Phaser.Math.Between(300,1450);
            return;
        } */

        this.sprite?.setVelocityY(4 * this.wingPower);

        if( thinkingTime < this.moveTime && this.player !== undefined ) {
            let v = Phaser.Math.Between(0,3);
            if( v >= 2 ) {
                let d = Phaser.Math.Distance.BetweenPoints(this.player.getSprite(), this.sprite);
                if (d < (6 * 64)) {
                    this.stateMachine.setState('move-to-player');
                    return;
                }
            }
        }

        if (this.moveTime > this.moveTargetTime) {
            this.stateMachine.setState('move-down');
            this.moveTargetTime = Phaser.Math.Between(1000,2500);
        }
    }

    private idleOnEnter() {
        this.sprite?.play('idle');
        this.direction = -1;
        this.moveTime = 0;
    }

    private idleOnUpdate(deltaTime: number){
        this.moveTime += deltaTime;
        
        let thinkingTime = this.moveTargetTime / 2;


        if (this.player !== undefined && thinkingTime < this.moveTime) {
            let d = Phaser.Math.Distance.BetweenPoints(this.player.getSprite(), this.sprite);
            if (d < (6 * 64)) {
                this.stateMachine.setState('move-to-player');
                return;
            }

            // too far away , but leave idle state
            this.stateMachine.setState('move-down');
        }

        if( this.moveTime > this.moveTargetTime ) {
            this.moveTargetTime = Phaser.Math.Between(300,1850);
            this.stateMachine.setState('move-down');
        }

    }

    private castDropping(angle: number) {

        if (this.castDroppingAt > this.scene.game.loop.frame)
            return;

        let facingDir = this.player.getSprite().body.position.x - this.sprite.body.position.x > 0 ? 1 : -1;
        if (this.sprite.flipX && facingDir != -1 && !this.sprite.flipX && facingDir != 1)
            return;

        let dropping = this.scene.matter.add.sprite(
            this.sprite.body.position.x - 12,
            this.sprite.body.position.y + 8,
            'dropping', undefined, {
            vertices: [{ x: 0, y: 0 }, { x: 24, y: 0 }, { x: 24, y: 24 }, { x: 0, y: 24 }],
            label: 'flydropping',
            restitution: 0.0
        });

        dropping.setCollidesWith(this.collideWith);
        dropping.setCollisionCategory(this.collisionCat);
        
        dropping.setVelocityX(Math.cos(angle) * this.wingPower * 5);
        dropping.setVelocityY(Math.sin(angle) * this.wingPower * 5);

        this.droppingActiveTime = Phaser.Math.Between(2500, 3500 );

        dropping.setScale(0.8,0.8);
        dropping.setDepth(10);
        dropping.setIgnoreGravity(true);
        dropping.setFriction(0.0);
        dropping.setData('ttl', this.scene.game.loop.frame + 200);
        dropping.setOnCollide((data: MatterJS.ICollisionPair) => {
            const a = data.bodyB as MatterJS.BodyType;
            const b = data.bodyA as MatterJS.BodyType;

            if (b.label === 'player') {
                this.player.takeDamage(25, 'lava');
            }

            if (a.label === 'flydropping') {
                a.gameObject?.destroy();
            }
            if (b.label === 'flydropping') {
                b.gameObject?.destroy();
            }

        });
        this.scene.time.delayedCall( this.droppingActiveTime, () => {
            dropping.destroy();
        });

        const castDelay = Phaser.Math.Between(20,100);
        this.castDroppingAt = this.scene.game.loop.frame + castDelay;

       // this.sprite?.play('dropping');
       /* this.sprite?.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            this.sprite?.play('idle');
        });*/
    }


    private handleStomped(fly: Phaser.Physics.Matter.Sprite) {
        if (this.sprite !== fly && !this.garbage) {
            return;
        }
        this.garbage = true;

        events.off(this.name + '-stomped', this.handleStomped, this);
        this.sprite.setStatic(true);
        this.sprite.setCollisionCategory(0);
        this.sprite.play('dead');
        this.scene.time.delayedCall( 20, () => {
            this.sprite.setVisible(false);
        });
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

    private handleBlocked(fly: Phaser.Physics.Matter.Sprite) {
        if (this.sprite !== fly || this.sprite === undefined) {
            return;
        }

        this.moveTime = 0;

        if (this.sprite?.body?.velocity.y > 0) {
            this.stateMachine.setState('move-down');
        }
        else {
            this.stateMachine.setState('move-up');
        }
    }
    
    public keepObject() {
        return !this.garbage;
    }

    private createAnims() {
        this.sprite.anims.create({
            key: 'idle',
            frameRate: 10,
            repeat: -1,
            frames: this.sprite.anims.generateFrameNames('fly', {
                start: 0,
                end: 0,
                prefix: '0_Idle',
                suffix: '.webp'
            })
        });

        this.sprite.anims.create({
            key: 'flying',
            frameRate: 10,
            repeat: -1,
            frames: this.sprite.anims.generateFrameNames('fly', {
                start: 0,
                end: 1,
                prefix: '0_Idle',
                suffix: '.webp'
            })
        });

     /*   this.sprite.anims.create({
            key: 'dropping',
            frameRate: 10,
            repeat: -1,
            frames: this.sprite.anims.generateFrameNames('fly', {
                start: 0,
                end: 1,
                prefix: '0_Idle',
                suffix: '.webp'
            })
        }); */

        this.sprite.anims.create({
            key: 'dead',
            frameRate: 10,
            repeat: 0,
            frames: this.sprite.anims.generateFrameNames('fly', {
                start: 2,
                end: 4,
                prefix: '1_Dead',
                suffix: '.webp'
            })
        });
    }

}