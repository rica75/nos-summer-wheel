import Phaser from 'phaser';

type SpawnKind = 'collectible' | 'hazard';
type CollectibleType = 'ball' | 'icecream' | 'sun' | 'float';
type HazardType = 'triangle' | 'wave';

interface WheelEntity {
  sprite: Phaser.GameObjects.Image;
  angle: number;
  kind: SpawnKind;
  collectibleType?: CollectibleType;
  hazardType?: HazardType;
  resolved?: boolean;
}

export class MainScene extends Phaser.Scene {
  private readonly wheelRadius = 520;
  private readonly wheelCenter = new Phaser.Math.Vector2(450, 1280);
  private readonly playerPosition = new Phaser.Math.Vector2(450, 1415);
  private readonly hitZoneMin = 258;
  private readonly hitZoneMax = 282;

  private wheelContainer!: Phaser.GameObjects.Container;
  private spokesContainer!: Phaser.GameObjects.Container;
  private entities: WheelEntity[] = [];
  private player!: Phaser.Physics.Arcade.Sprite;
  private ground!: Phaser.Physics.Arcade.StaticBody;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  private score = 0;
  private wave = 1;
  private combo = 0;
  private gameSeconds = 0;
  private rotationSpeed = 0.55;
  private lastSpawnAt = 0;
  private spawnEveryMs = 900;

  private scoreText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;

  constructor() {
    super('MainScene');
  }

  preload(): void {
    this.createSvgTextures();
  }

  create(): void {
    this.createBackground();
    this.createWheelArena();
    this.createPlayer();
    this.createHud();

    this.cursors = this.input.keyboard?.createCursorKeys() ?? ({} as Phaser.Types.Input.Keyboard.CursorKeys);
    this.input.on('pointerdown', () => this.jump());
    this.time.addEvent({ delay: 1000, loop: true, callback: () => { this.gameSeconds += 1; } });
  }

  update(time: number, delta: number): void {
    const dt = delta / 1000;
    this.animateWater(time);

    this.wheelContainer.rotation += this.rotationSpeed * dt;
    this.updateEntities();

    if (time - this.lastSpawnAt > this.spawnEveryMs) {
      this.lastSpawnAt = time;
      this.spawnEntity();
    }

    this.updateWaveProgress();
    this.updateHud();

    if (Phaser.Input.Keyboard.JustDown(this.cursors.space!)) {
      this.jump();
    }
  }

  private createSvgTextures(): void {
    const svg = (content: string, w: number, h: number) =>
      `data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>${content}</svg>`)}`;

    this.textures.addBase64('player', svg("<circle cx='60' cy='60' r='50' fill='#ffde59'/><circle cx='44' cy='52' r='6'/><circle cx='76' cy='52' r='6'/><path d='M35 78 Q60 98 85 78' stroke='#222' stroke-width='6' fill='none' stroke-linecap='round'/>", 120, 120));
    this.textures.addBase64('ball', svg("<circle cx='50' cy='50' r='42' fill='#fff'/><path d='M8 50h84M50 8v84' stroke='#ff4f81' stroke-width='10'/><path d='M20 20q30 20 60 0' stroke='#4fc3ff' stroke-width='8' fill='none'/>",100,100));
    this.textures.addBase64('icecream', svg("<polygon points='50,95 20,40 80,40' fill='#d89244'/><circle cx='50' cy='32' r='24' fill='#ff9bc4'/>",100,100));
    this.textures.addBase64('sun', svg("<circle cx='50' cy='50' r='24' fill='#ffd54f'/><g stroke='#ffb300' stroke-width='8'><line x1='50' y1='4' x2='50' y2='20'/><line x1='50' y1='80' x2='50' y2='96'/><line x1='4' y1='50' x2='20' y2='50'/><line x1='80' y1='50' x2='96' y2='50'/></g>",100,100));
    this.textures.addBase64('float', svg("<circle cx='50' cy='50' r='35' fill='none' stroke='#ffd166' stroke-width='18'/>",100,100));
    this.textures.addBase64('hazard_triangle', svg("<polygon points='50,8 94,90 6,90' fill='#ff5c5c'/><text x='50' y='72' font-size='52' text-anchor='middle' fill='white' font-family='Arial'>!</text>",100,100));
    this.textures.addBase64('hazard_wave', svg("<path d='M5 60 q15-30 30 0 t30 0 t30 0' stroke='#008ecf' stroke-width='16' fill='none'/><path d='M5 80 q15-30 30 0 t30 0 t30 0' stroke='#21c1ff' stroke-width='12' fill='none'/>",100,100));
  }

  private createBackground(): void {
    this.add.rectangle(450, 800, 900, 1600, 0x7be0ff);
    const title = this.add.text(450, 70, 'NOS SUMMER WHEEL', { fontSize: '56px', color: '#ffffff', fontStyle: '900', stroke: '#0070a8', strokeThickness: 8 }).setOrigin(0.5);
    title.setShadow(0, 6, '#005d88', 4);
    this.add.rectangle(450, 1500, 900, 200, 0x0a7dbd, 0.9).setData('water', true);
    this.add.rectangle(450, 1450, 900, 90, 0x2db9ff, 0.75).setData('water', true);
    for (let i = 0; i < 7; i++) {
      this.add.circle(100 + i * 120, 220 + (i % 2) * 28, 36, 0xffffff, 0.3);
    }
  }

  private createWheelArena(): void {
    this.wheelContainer = this.add.container(this.wheelCenter.x, this.wheelCenter.y);
    const colors = [0xff6b6b, 0xffb347, 0xffe066, 0x4ecdc4, 0x5dade2, 0xa569bd, 0xec87c0, 0x7ed957];
    const arena = this.add.graphics();
    colors.forEach((c, i) => {
      arena.fillStyle(c, 0.95);
      arena.slice(0, 0, this.wheelRadius, Phaser.Math.DegToRad(i * 45), Phaser.Math.DegToRad((i + 1) * 45), false);
      arena.fillPath();
    });
    arena.fillStyle(0xffffff, 0.22);
    arena.fillCircle(0, 0, 170);
    this.wheelContainer.add(arena);

    this.spokesContainer = this.add.container(0, 0);
    for (let i = 0; i < 8; i++) {
      const ang = Phaser.Math.DegToRad(i * 45);
      const color = Phaser.Display.Color.GetColor(255 - i * 20, 130 + i * 12, 190 - i * 10);
      const face = this.add.circle(Math.cos(ang) * 220, Math.sin(ang) * 220, 35, color, 1);
      const eyeL = this.add.circle(face.x - 12, face.y - 6, 4, 0x1d1d1d);
      const eyeR = this.add.circle(face.x + 12, face.y - 6, 4, 0x1d1d1d);
      const smile = this.add.arc(face.x, face.y + 7, 16, 10, 170, false, 0x1d1d1d).setLineWidth(3,3);
      this.spokesContainer.add([face, eyeL, eyeR, smile]);
    }
    this.wheelContainer.add(this.spokesContainer);

    const hitZone = this.add.rectangle(450, 760, 320, 110, 0xffe066, 0.35).setStrokeStyle(4, 0xffd100, 1);
    hitZone.setAngle(0);
  }

  private createPlayer(): void {
    this.player = this.physics.add.sprite(this.playerPosition.x, this.playerPosition.y, 'player').setScale(0.95);
    this.player.setBounce(0);
    this.player.setCollideWorldBounds(true);

    const groundRect = this.add.rectangle(this.playerPosition.x, 1498, 260, 20, 0x000000, 0);
    this.physics.add.existing(groundRect, true);
    this.ground = groundRect.body as Phaser.Physics.Arcade.StaticBody;
    this.physics.add.collider(this.player, this.ground);
  }

  private createHud(): void {
    const style: Phaser.Types.GameObjects.Text.TextStyle = { color: '#003049', fontSize: '34px', fontStyle: '700' };
    this.scoreText = this.add.text(40, 130, 'Pontos: 0', style);
    this.waveText = this.add.text(40, 175, 'Onda: 1', style);
    this.timeText = this.add.text(40, 220, 'Tempo: 0s', style);
    this.comboText = this.add.text(40, 265, 'Combo: x0', style);
  }

  private spawnEntity(): void {
    const isHazard = Math.random() < 0.33;
    const angle = Phaser.Math.DegToRad(Phaser.Math.Between(40, 120));

    if (isHazard) {
      const hazardType: HazardType = Math.random() < 0.5 ? 'triangle' : 'wave';
      const key = hazardType === 'triangle' ? 'hazard_triangle' : 'hazard_wave';
      const sprite = this.add.image(0, 0, key).setScale(0.65);
      this.wheelContainer.add(sprite);
      this.entities.push({ sprite, angle, kind: 'hazard', hazardType });
      return;
    }

    const pool: CollectibleType[] = ['ball', 'icecream', 'sun', 'float'];
    const collectibleType = Phaser.Utils.Array.GetRandom(pool);
    const sprite = this.add.image(0, 0, collectibleType).setScale(0.6);
    this.wheelContainer.add(sprite);
    this.entities.push({ sprite, angle, kind: 'collectible', collectibleType });
  }

  private updateEntities(): void {
    for (const entity of this.entities) {
      entity.angle += this.rotationSpeed * (1 / 60);
      entity.sprite.x = Math.cos(entity.angle) * this.wheelRadius;
      entity.sprite.y = Math.sin(entity.angle) * this.wheelRadius;

      const angleDeg = Phaser.Math.Wrap(Phaser.Math.RadToDeg(entity.angle), 0, 360);
      const inHitZone = angleDeg >= this.hitZoneMin && angleDeg <= this.hitZoneMax;

      if (!entity.resolved && inHitZone) {
        if (entity.kind === 'collectible') {
          this.collect(entity);
        } else {
          this.resolveHazard(entity);
        }
      }

      if (angleDeg > 300 && entity.resolved) {
        entity.sprite.destroy();
      }
    }
    this.entities = this.entities.filter((e) => e.sprite.active);
  }

  private collect(entity: WheelEntity): void {
    entity.resolved = true;
    this.score += 10 + this.combo * 2;
    this.combo += 1;
    this.spawnCollectParticles(entity.sprite.x + this.wheelCenter.x, entity.sprite.y + this.wheelCenter.y);
  }

  private resolveHazard(entity: WheelEntity): void {
    entity.resolved = true;
    const jumped = this.player.y < this.playerPosition.y - 30;
    if (jumped) {
      this.score += 15;
      this.combo += 1;
    } else {
      this.combo = 0;
      this.score = Math.max(0, this.score - 20);
      this.cameras.main.shake(250, 0.01);
    }
  }

  private jump(): void {
    const onGround = Math.abs(this.player.body.velocity.y) < 0.1 && this.player.y >= this.playerPosition.y - 2;
    if (onGround) this.player.setVelocityY(-820);
  }

  private updateWaveProgress(): void {
    const nextWave = Math.floor(this.score / 220) + 1;
    if (nextWave > this.wave) {
      this.wave = nextWave;
      this.rotationSpeed += 0.08;
      this.spawnEveryMs = Math.max(450, this.spawnEveryMs - 50);
    }
  }

  private updateHud(): void {
    this.scoreText.setText(`Pontos: ${this.score}`);
    this.waveText.setText(`Onda: ${this.wave}`);
    this.timeText.setText(`Tempo: ${this.gameSeconds}s`);
    this.comboText.setText(`Combo: x${this.combo}`);
  }

  private spawnCollectParticles(x: number, y: number): void {
    const particles = this.add.particles(0, 0, 'sun', {
      x,
      y,
      speed: { min: 40, max: 170 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.2, end: 0 },
      lifespan: 450,
      quantity: 8
    });
    this.time.delayedCall(500, () => particles.destroy());
  }

  private animateWater(time: number): void {
    this.children.list.forEach((obj) => {
      if (obj.getData && obj.getData('water')) {
        obj.y += Math.sin((time / 300) + obj.x / 140) * 0.1;
      }
    });
  }
}
