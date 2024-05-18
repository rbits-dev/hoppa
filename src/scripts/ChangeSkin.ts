import Phaser from 'phaser'
import PlayerController from './PlayerController';
import { sharedInstance as events } from './EventManager';

export default class ChangeSkin implements StaticObject {

    private sprite: Phaser.Physics.Matter.Sprite;
    private name: string;

    constructor(scene: Phaser.Scene, sprite: Phaser.Physics.Matter.Sprite, name: string) {
        this.sprite = sprite;
        this.sprite.setData('type', 'changeskin');
        this.sprite.setName('changeskin');
        this.name = name;

        events.on(this.name + '-touched', this.handleTouched, this);
    }

    destroy() {
        events.off(this.name + '-touched', this.handleTouched, this);
    }

    public getSprite() {
        return this.sprite;
    }

    private handleTouched(lightswitch: Phaser.Physics.Matter.Sprite, player: PlayerController) {
        if (this.sprite !== lightswitch) {
            return;
        }

        player.toggle();
    }

}