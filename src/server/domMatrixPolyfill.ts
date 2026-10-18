/**
 * Headless serverless polyfill for DOMMatrix, ImageData, and Path2D.
 * Prevents ReferenceError: DOMMatrix is not defined in Node/Vercel serverless functions.
 */
if (typeof (globalThis as any).DOMMatrix === 'undefined') {
  (globalThis as any).DOMMatrix = class DOMMatrix {
    a = 1;
    b = 0;
    c = 0;
    d = 1;
    e = 0;
    f = 0;
    m11 = 1;
    m12 = 0;
    m13 = 0;
    m14 = 0;
    m21 = 0;
    m22 = 1;
    m23 = 0;
    m24 = 0;
    m31 = 0;
    m32 = 0;
    m33 = 1;
    m34 = 0;
    m41 = 0;
    m42 = 0;
    m43 = 0;
    m44 = 1;
    is2D = true;
    isIdentity = true;

    constructor(_init?: any) {}
    translate(_x = 0, _y = 0) {
      return this;
    }
    scale(_x = 1, _y = 1) {
      return this;
    }
    multiply(_m?: any) {
      return this;
    }
    multiplySelf(_m?: any) {
      return this;
    }
    preMultiplySelf(_m?: any) {
      return this;
    }
    invertSelf() {
      return this;
    }
    transformPoint(p: any) {
      return p;
    }
  };
}

if (typeof (globalThis as any).ImageData === 'undefined') {
  (globalThis as any).ImageData = class ImageData {
    width: number;
    height: number;
    data: Uint8ClampedArray;
    constructor(w = 0, h = 0) {
      this.width = w;
      this.height = h;
      this.data = new Uint8ClampedArray(w * h * 4);
    }
  };
}

if (typeof (globalThis as any).Path2D === 'undefined') {
  (globalThis as any).Path2D = class Path2D {
    addPath(_path?: any, _transform?: any) {}
    closePath() {}
    moveTo(_x = 0, _y = 0) {}
    lineTo(_x = 0, _y = 0) {}
    bezierCurveTo(_cp1x = 0, _cp1y = 0, _cp2x = 0, _cp2y = 0, _x = 0, _y = 0) {}
    quadraticCurveTo(_cpx = 0, _cpy = 0, _x = 0, _y = 0) {}
    arc(_x = 0, _y = 0, _r = 0, _s = 0, _e = 0, _ccw = false) {}
    arcTo(_x1 = 0, _y1 = 0, _x2 = 0, _y2 = 0, _r = 0) {}
    ellipse(_x = 0, _y = 0, _rx = 0, _ry = 0, _rot = 0, _s = 0, _e = 0, _ccw = false) {}
    rect(_x = 0, _y = 0, _w = 0, _h = 0) {}
  };
}

export {};
