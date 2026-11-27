import { Vector2, Vector3, type Camera, type PerspectiveCamera, type Sprite, type WebGLRenderer } from "three";

export type ScreenLabel = {
  sprite: Sprite;
  width: number;
  height: number;
  opacity: number;
  priority: number;
};

type Rect = { left: number; top: number; right: number; bottom: number };
const gap = 4;
const padding = 9;
const rowOffsets = [0, 1, -1, 2, -2, 3, -3];
const columnOffsets = [0, -1, 1, -2, 2];

function placeLabel(x: number, y: number, width: number, height: number, viewportWidth: number, viewportHeight: number, used: Rect[]) {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const clampX = (value: number) => Math.max(padding + halfWidth, Math.min(viewportWidth - padding - halfWidth, value));
  const clampY = (value: number) => Math.max(padding + halfHeight, Math.min(viewportHeight - padding - halfHeight, value));

  for (const row of rowOffsets) {
    for (const column of columnOffsets) {
      const cx = clampX(x + column * Math.min(38, width / 2 + gap));
      const cy = clampY(y + row * (height + gap));
      const left = cx - halfWidth;
      const top = cy - halfHeight;
      const right = cx + halfWidth;
      const bottom = cy + halfHeight;
      if (used.some((rect) => right + gap > rect.left && left - gap < rect.right && bottom + gap > rect.top && top - gap < rect.bottom)) continue;
      used.push({ left, top, right, bottom });
      return { x: cx, y: cy };
    }
  }
}

export function createLabelLayout() {
  const size = new Vector2();
  const world = new Vector3();
  const view = new Vector3();
  const projected = new Vector3();
  const placed: Rect[] = [];
  let lastTime = 0;

  return (renderer: WebGLRenderer, camera: Camera, labels: ScreenLabel[]) => {
    const perspective = camera as PerspectiveCamera;
    if (!perspective.isPerspectiveCamera) return;
    const { x: width, y: height } = renderer.getSize(size);
    if (width < 40 || height < 40) return;
    const now = performance.now();
    const smoothing = 1 - Math.exp(-Math.min(now - lastTime, 34) / 65);
    lastTime = now;
    placed.length = 0;
    labels.sort((first, second) => second.priority - first.priority);

    for (const label of labels) {
      const { sprite, opacity } = label;
      sprite.visible = false;
      if (!opacity) {
        sprite.material.opacity = 0;
        continue;
      }
      world.setFromMatrixPosition(sprite.matrixWorld);
      view.copy(world).applyMatrix4(camera.matrixWorldInverse);
      if (view.z >= -perspective.near) {
        sprite.material.opacity = 0;
        continue;
      }
      projected.copy(view).applyMatrix4(camera.projectionMatrix);
      if (Math.abs(projected.x) > 1.06 || Math.abs(projected.y) > 1.06 || projected.z > 1) {
        sprite.material.opacity = 0;
        continue;
      }
      const x = (projected.x + 1) * width / 2;
      const y = (1 - projected.y) * height / 2;
      const pixelsPerUnit = height * camera.projectionMatrix.elements[5] / (-2 * view.z);
      const shrink = Math.min(1, width * 0.76 / (pixelsPerUnit * label.width), 38 / (pixelsPerUnit * label.height));
      const labelWidth = label.width * shrink * pixelsPerUnit;
      const labelHeight = label.height * shrink * pixelsPerUnit;
      const position = placeLabel(x, y, labelWidth, labelHeight, width, height, placed);
      if (!position) {
        sprite.material.opacity = 0;
        continue;
      }
      const worldWidth = label.width * shrink;
      const worldHeight = label.height * shrink;
      if (sprite.scale.x !== worldWidth || sprite.scale.y !== worldHeight) {
        sprite.scale.set(worldWidth, worldHeight, 1);
        sprite.updateMatrixWorld();
      }
      // The sprite pivot offsets its billboard without changing the node's world position.
      sprite.center.set(0.5 + (x - position.x) / labelWidth, 0.5 + (position.y - y) / labelHeight);
      sprite.material.opacity += (opacity - sprite.material.opacity) * smoothing;
      sprite.visible = true;
    }
  };
}
