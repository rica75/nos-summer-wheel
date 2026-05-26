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
  private readonly wheelRadius = 500;
  private readonly innerPoolRadius = 210;
  private readonly wheelCenter = new Phaser.Math.Vector2(450, 930);
  private readonly playerPosition = new Phaser.Math.Vector2(450, 1440);
  private readonly hitZoneMin = 258;
  private readonly hitZoneMax = 282;

  private wheelContainer!: Phaser.GameObjects.Container;
  private waterGraphics!: Phaser.GameObjects.Graphics;
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

    this.textures.addBase64('player', svg("<rect x='15' y='20' rx='24' width='90' height='130' fill='#ffd53d'/><rect x='18' y='24' rx='22' width='84' height='28' fill='#fff2a6' opacity='.7'/><circle cx='48' cy='72' r='8'/><circle cx='74' cy='72' r='8'/><path d='M41 103 Q61 122 82 103' stroke='#2d1630' stroke-width='8' fill='none' stroke-linecap='round'/><rect x='8' y='68' rx='6' width='11' height='30' fill='#ffd53d'/><rect x='102' y='68' rx='6' width='11' height='30' fill='#ffd53d'/>", 120, 170));
    this.textures.addBase64('ball', svg("<circle cx='50' cy='50' r='42' fill='#fff'/><path d='M8 50h84M50 8v84' stroke='#ff4f81' stroke-width='10'/><path d='M20 20q30 20 60 0' stroke='#4fc3ff' stroke-width='8' fill='none'/>",100,100));
    this.textures.addBase64('icecream', svg("<polygon points='50,95 20,40 80,40' fill='#d89244'/><circle cx='50' cy='32' r='24' fill='#ff9bc4'/><circle cx='40' cy='28' r='5' fill='#fff' opacity='.5'/>",100,100));
    this.textures.addBase64('sun', svg("<circle cx='50' cy='50' r='24' fill='#ffd54f'/><circle cx='43' cy='47' r='3'/><circle cx='57' cy='47' r='3'/><path d='M41 58 q9 9 18 0' stroke='#af6d00' stroke-width='4' fill='none'/><g stroke='#ffb300' stroke-width='8'><line x1='50' y1='4' x2='50' y2='20'/><line x1='50' y1='80' x2='50' y2='96'/><line x1='4' y1='50' x2='20' y2='50'/><line x1='80' y1='50' x2='96' y2='50'/></g>",100,100));
    this.textures.addBase64('float', svg("<circle cx='50' cy='50' r='35' fill='none' stroke='#ffd166' stroke-width='18'/><circle cx='50' cy='50' r='12' fill='#7dd9ff'/>",100,100));
    this.textures.addBase64('hazard_triangle', svg("<polygon points='50,8 94,90 6,90' fill='#ff5c5c'/><polygon points='50,18 85,84 15,84' fill='none' stroke='#ffb08c' stroke-width='4'/><text x='50' y='72' font-size='52' text-anchor='middle' fill='white' font-family='Arial Black'>!</text>",100,100));
    this.textures.addBase64('hazard_wave', svg("<path d='M5 60 q15-30 30 0 t30 0 t30 0' stroke='#ff7f50' stroke-width='16' fill='none'/><path d='M5 80 q15-30 30 0 t30 0 t30 0' stroke='#ff3f3f' stroke-width='12' fill='none'/>",100,100));
  }

  private createBackground(): void {
    this.add.rectangle(450, 800, 900, 1600, 0x7ed8ff);
    this.add.circle(450, -260, 700, 0xffffff, 0.2);
    this.add.circle(450, -260, 580, 0xffffff, 0.1);

    for (let i = 0; i < 10; i++) {
      this.add.rectangle(90 + i * 90, 340 + (i % 2) * 20, 14, 120, 0x7b5b3b).setAngle(i % 2 ? 7 : -7);
      this.add.circle(90 + i * 90, 290 + (i % 2) * 20, 34, 0x46b56b);
    }

    this.add.rectangle(450, 1160, 900, 390, 0xf7d894);
    this.add.rectangle(450, 430, 900, 450, 0x1da2dd, 0.5);

    const title = this.add.text(450, 90, 'NOS SUMMER WHEEL', {
      fontSize: '64px', fontFamily: 'Verdana, Arial Black, sans-serif', fontStyle: '900', color: '#ffffff', stroke: '#0a3f87', strokeThickness: 10
    }).setOrigin(0.5);
    title.setShadow(0, 6, '#072f69', 6);
  }

  private createWheelArena(): void {
    this.wheelContainer = this.add.container(this.wheelCenter.x, this.wheelCenter.y);
    const colors = [0xff5f67, 0xffa947, 0xffd84a, 0x68db87, 0x40c8db, 0x4d92ff, 0xb26dff, 0xff76cc, 0xff5f67, 0xffa947, 0xffd84a, 0x68db87, 0x40c8db, 0x4d92ff, 0xb26dff, 0xff76cc];

    const ring = this.add.graphics();
    ring.fillStyle(0xffffff, 0.92);
    ring.fillCircle(0, 0, this.wheelRadius + 40);
    ring.fillStyle(0xc6d6ea, 0.6);
    ring.fillCircle(0, 0, this.wheelRadius + 25);

    colors.forEach((c, i) => {
      const start = Phaser.Math.DegToRad(i * 22.5 + 2);
      const end = Phaser.Math.DegToRad((i + 1) * 22.5 - 2);
      ring.fillStyle(c, 1);
      ring.slice(0, 0, this.wheelRadius, start, end, false);
      ring.fillPath();
      ring.fillStyle(0xffffff, 0.18);
      ring.slice(0, 0, this.wheelRadius - 50, start, end, false);
      ring.fillPath();
    });

    this.wheelContainer.add(ring);

    this.waterGraphics = this.add.graphics();
    this.wheelContainer.add(this.waterGraphics);

    for (let i = 0; i < 16; i++) {
      const ang = Phaser.Math.DegToRad(i * 22.5 + 11);
      const r = 280;
      const x = Math.cos(ang) * r;
      const y = Math.sin(ang) * r;
      const npc = this.add.image(x, y, 'player').setScale(0.48).setRotation(ang + Math.PI / 2);
      if (i % 5 === 0) npc.setTint(0x8ce4ff);
      if (i % 7 === 0) npc.setTint(0xff79bd);
      this.wheelContainer.add(npc);
    }

    this.add.circle(this.wheelCenter.x, 765, 150, 0xffffff, 0.16);
    this.add.rectangle(450, 760, 325, 110, 0xffd556, 0.28).setStrokeStyle(5, 0xffa90a, 1);
  }

  private createPlayer(): void {
    this.player = this.physics.add.sprite(this.playerPosition.x, this.playerPosition.y, 'player').setScale(0.72);
    this.player.setTint(0x7bffd6);
    this.player.setBounce(0);
    this.player.setCollideWorldBounds(true);

    const groundRect = this.add.rectangle(this.playerPosition.x, 1518, 260, 20, 0x000000, 0);
    this.physics.add.existing(groundRect, true);
    this.ground = groundRect.body as Phaser.Physics.Arcade.StaticBody;
    this.physics.add.collider(this.player, this.ground);
  }

  private createHud(): void {
    const panel = this.add.graphics();
    panel.fillStyle(0x043f8c, 0.88);
    panel.fillRoundedRect(26, 30, 300, 112, 28);
    panel.fillRoundedRect(560, 30, 314, 112, 28);
    panel.fillRoundedRect(190, 1460, 520, 110, 34);
    panel.lineStyle(4, 0xb8e8ff, 0.9);
    panel.strokeRoundedRect(26, 30, 300, 112, 28);
    panel.strokeRoundedRect(560, 30, 314, 112, 28);
    panel.strokeRoundedRect(190, 1460, 520, 110, 34);

    const style = { color: '#ffffff', fontFamily: 'Verdana, Arial Black, sans-serif', fontStyle: '800' } as Phaser.Types.GameObjects.Text.TextStyle;
    this.add.text(52, 48, 'PONTOS', { ...style, fontSize: '30px' });
    this.scoreText = this.add.text(52, 84, '0', { ...style, fontSize: '46px' });

    this.add.text(586, 48, 'ONDA', { ...style, fontSize: '28px' });
    this.waveText = this.add.text(586, 82, '1', { ...style, fontSize: '42px' });
    this.add.text(706, 48, 'TEMPO', { ...style, fontSize: '28px' });
    this.timeText = this.add.text(706, 82, '00:00', { ...style, fontSize: '42px' });

    this.add.image(300, 1516, 'ball').setScale(0.46);
    this.add.image(390, 1516, 'float').setScale(0.46);
    this.add.image(480, 1516, 'sun').setScale(0.46);
    this.add.image(570, 1516, 'icecream').setScale(0.46);
  }

  private spawnEntity(): void {
    const isHazard = Math.random() < 0.33;
    const angle = Phaser.Math.DegToRad(Phaser.Math.Between(40, 120));

    if (isHazard) {
      const hazardType: HazardType = Math.random() < 0.5 ? 'triangle' : 'wave';
      const key = hazardType === 'triangle' ? 'hazard_triangle' : 'hazard_wave';
      const sprite = this.add.image(0, 0, key).setScale(0.7);
      this.wheelContainer.add(sprite);
      this.entities.push({ sprite, angle, kind: 'hazard', hazardType });
      return;
    }

    const pool: CollectibleType[] = ['ball', 'icecream', 'sun', 'float'];
    const collectibleType = Phaser.Utils.Array.GetRandom(pool);
    const sprite = this.add.image(0, 0, collectibleType).setScale(0.62);
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
        if (entity.kind === 'collectible') this.collect(entity);
        else this.resolveHazard(entity);
      }

      if (angleDeg > 300 && entity.resolved) entity.sprite.destroy();
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
      this.cameras.main.flash(120, 255, 60, 60);
    }
  }

  private jump(): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body | null;
    const onGround = body !== null && Math.abs(body.velocity.y) < 0.1 && this.player.y >= this.playerPosition.y - 2;
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
    this.scoreText.setText(`${this.score}`);
    this.waveText.setText(`${this.wave}`);
    const mm = String(Math.floor(this.gameSeconds / 60)).padStart(2, '0');
    const ss = String(this.gameSeconds % 60).padStart(2, '0');
    this.timeText.setText(`${mm}:${ss}`);
  }

  private spawnCollectParticles(x: number, y: number): void {
    const particles = this.add.particles(0, 0, 'sun', { x, y, speed: { min: 40, max: 170 }, angle: { min: 0, max: 360 }, scale: { start: 0.2, end: 0 }, lifespan: 450, quantity: 10 });
    this.time.delayedCall(500, () => particles.destroy());
  }

  private animateWater(time: number): void {
    const g = this.waterGraphics;
    g.clear();
    g.fillStyle(0x23b8ed, 0.95);
    g.fillCircle(0, 0, this.innerPoolRadius + 14);
    g.fillStyle(0x10a5db, 0.95);
    g.fillCircle(0, 0, this.innerPoolRadius);
    for (let i = 0; i < 6; i++) {
      const rad = this.innerPoolRadius - 20 - i * 26;
      g.lineStyle(2, 0x86e9ff, 0.45 - i * 0.05);
      g.strokeEllipse(0, Math.sin(time / 300 + i) * 5, rad * 1.6, rad * 1.2);
    }
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + time / 1300;
      g.fillStyle(0xffffff, 0.25);
      g.fillCircle(Math.cos(a) * (this.innerPoolRadius - 18), Math.sin(a) * (this.innerPoolRadius - 18), 3);
    }
  }
}
