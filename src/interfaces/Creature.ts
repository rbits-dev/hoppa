interface Creature {
    update(deltaTime: number): void;
    destroy(): void;
    getSprite(): Phaser.Physics.Matter.Sprite;
    lookahead(map: Phaser.Tilemaps.Tilemap): boolean;
    keepObject(): boolean;

}