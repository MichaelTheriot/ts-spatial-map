class SpatialMap2D<T> {
  #cellSize: number;
  #rows = new Map<number, Map<number, Set<T>>>();
  #positions = new Map<T, [number, number]>();

  constructor(cellSize: number, iterable?: Iterable<Parameters<SpatialMap2D<T>['set']>>) {
    if (!isFinite(cellSize) || cellSize <= 0) {
      throw new TypeError("Cell size must be a positive finite number");
    }

    this.#cellSize = cellSize;

    if (iterable !== undefined) {
      for (const [key, x, y] of iterable) {
        this.set(key, x, y);
      }
    }
  }

  #addToCell(key: T, x: number, y: number): Set<T> {
    let cells = this.#rows.get(y);
    if (cells === undefined) {
      cells = new Map<number, Set<T>>();
      this.#rows.set(y, cells);
    }

    let cell = cells.get(x);
    if (cell === undefined) {
      cell = new Set<T>();
      cells.set(x, cell);
    }

    return cell.add(key);
  }

  #removeFromCell(key: T, x: number, y: number): boolean {
    let cells = this.#rows.get(y);
    if (cells === undefined) {
      return false;
    }

    let cell = cells.get(x);
    if (cell === undefined) {
      return false;
    }

    const deleted = cell.delete(key);
    if (deleted && cell.size === 0) {
      cells.delete(x);

      if (cells.size === 0) {
        this.#rows.delete(y);
      }
    }

    return deleted;
  }

  *#iterRows(
    min: number,
    max: number,
  ): Generator<[number, Map<number, Set<T>>]> {
    const total = max - min + 1;
    if (total > this.#rows.size) {
      yield* this.#rows;
    } else {
      for (let cur = max; cur >= min; cur--) {
        const cells = this.#rows.get(cur);
        if (cells !== undefined) {
          yield [cur, cells];
        }
      }
    }
  }

  *#iterCells(
    cells: Map<number, Set<T>>,
    min: number,
    max: number,
  ): Generator<[number, Set<T>]> {
    const total = max - min + 1;
    if (total > cells.size) {
      yield* cells;
    } else {
      for (let cur = min; cur <= max; cur++) {
        const cell = cells.get(cur);
        if (cell !== undefined) {
          yield [cur, cell];
        }
      }
    }
  }

  get(item: T): [number, number] | undefined {
    return this.#positions.get(item);
  }

  set(key: T, x: number, y: number): this {
    const s = this.#cellSize;
    const cellX = Math.floor(x / s);
    const cellY = Math.floor(y / s);

    const oldPos = this.#positions.get(key);
    if (oldPos !== undefined) {
      const [oldX, oldY] = oldPos;
      const oldCellX = Math.floor(oldX / s);
      const oldCellY = Math.floor(oldY / s);

      if (oldCellX === cellX && oldCellY === cellY) {
        return this;
      }

      this.#removeFromCell(key, oldCellX, oldCellY);
    }

    this.#positions.set(key, [x, y]);
    this.#addToCell(key, cellX, cellY);

    return this;
  }

  has(key: T): boolean {
    return this.#positions.has(key);
  }

  delete(key: T): boolean {
    const pos = this.#positions.get(key);

    if (pos === undefined) {
      return false;
    }

    this.#positions.delete(key);

    const s = this.#cellSize;
    const [x, y] = pos;
    const cellX = Math.floor(x / s);
    const cellY = Math.floor(y / s);

    return this.#removeFromCell(key, cellX, cellY);
  }

  clear(): void {
    this.#rows.clear();
    this.#positions.clear();
  }

  entries(): MapIterator<[T, [number, number]]> {
    return this.#positions.entries();
  }

  forEach(
    callbackfn: (value: [number, number], key: T, map: this) => void,
    thisArg?: any,
  ): void {
    this.#positions.forEach(
      (value, key) => callbackfn(value, key, this),
      thisArg,
    );
  }

  keys(): MapIterator<T> {
    return this.#positions.keys();
  }

  get size(): number {
    return this.#positions.size;
  }

  values(): MapIterator<[number, number]> {
    return this.#positions.values();
  }

  *query(x: number, y: number, r: number): Generator<T> {
    if (isNaN(r) || r < 0) {
      throw new TypeError("Radius must be a non-negative number");
    }

    const s = this.#cellSize;
    const r2 = r * r;

    const maxY = y + r;
    const minY = y - r;
    const maxRow = Math.floor(maxY / s);
    const minRow = Math.floor(minY / s);
    const midRow = Math.floor(y / s);

    for (const [row, cells] of this.#iterRows(minRow, maxRow)) {
      const minRowY = row * s;
      const maxRowY = (row + 1) * s;

      const outY = row > midRow ? minRowY : row < midRow ? maxRowY : y;
      const ym = y - outY;
      const offX = Math.sqrt(r2 - ym * ym);

      const minCol = Math.floor((x - offX) / s);
      const maxCol = Math.ceil((x + offX) / s);

      const yt = y - maxRowY;
      const yb = y - minRowY;
      const yt2 = yt * yt;
      const yb2 = yb * yb;
      const dyFar2 = yt2 > yb2 ? yt2 : yb2;

      for (const [col, cell] of this.#iterCells(cells, minCol, maxCol)) {
        const leftX = col * s;
        const rightX = leftX + s;
        const xl = x - leftX;
        const xr = rightX - x;
        const dx = xl > xr ? xl : xr;
        if (dx * dx + dyFar2 <= r2) {
          yield* cell;
        } else {
          for (const item of cell) {
            const [cellX, cellY] = this.#positions.get(item)!;
            if (r2 >= (x - cellX) ** 2 + (y - cellY) ** 2) {
              yield item;
            }
          }
        }
      }
    }
  }

  get [Symbol.toStringTag](): string {
    return "SpatialMap2D";
  }
}

SpatialMap2D.prototype[Symbol.iterator] = SpatialMap2D.prototype.entries;

interface SpatialMap2D<T> {
  [Symbol.iterator](): ReturnType<SpatialMap2D<T>["entries"]>;
}

export default SpatialMap2D;
