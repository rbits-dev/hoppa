export default class Manager {
    private controllers: Controller[] = [];
    private creatures: Creature[] = [];
    private objects: StaticObject[] = [];

    private map!: Phaser.Tilemaps.Tilemap;

    constructor(map: Phaser.Tilemaps.Tilemap) {
        this.map = map;
    }

    push<T>(obj: T): void {
        if (this.isController(obj)) {
            this.controllers.push(obj);
        } else if (this.isCreature(obj)) {
            this.creatures.push(obj);
        } else if(this.isStaticObject(obj)) {
            this.objects.push(obj);
        } else {
            throw new Error('Object type not supported');
        }
    }

    private isController(obj: any): obj is Controller {
        return obj.update !== undefined && obj.destroy !== undefined && obj.getSprite !== undefined && obj.lookahead === undefined;
    }

    private isCreature(obj: any): obj is Creature {
        return obj.update !== undefined && obj.destroy !== undefined && obj.getSprite !== undefined && obj.lookahead !== undefined && obj.keepObject !== undefined;
    }

    private isStaticObject(obj: any): obj is StaticObject {
        return obj.update === undefined && obj.destroy !== undefined && obj.getSprite !== undefined;
    }

    update(time: number, deltaTime: number) {
        
        this.controllers.forEach(controller => controller.update(deltaTime));

        this.creatures = this.creatures.filter(creature=>creature.keepObject());
        this.creatures.forEach(creature => {
             creature.update(deltaTime);
             creature.lookahead(this.map);
        });


    }

    destroy() {
        this.controllers.forEach(controller => controller.destroy());
        this.creatures.forEach(creature => creature.destroy());
        this.objects.forEach(obj=>obj.destroy());
    }
}
