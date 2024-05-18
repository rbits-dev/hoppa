interface Controller {
    update(deltaTime: number): void;
    destroy(): void;
    getSprite(): Phaser.Physics.Matter.Sprite;
}