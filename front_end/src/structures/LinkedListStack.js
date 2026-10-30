class StackNode {
  constructor(value) {
    this.value = value;
    this.next = null;
  }
}

/** LIFO stack backed by a singly linked list. Push and pop are O(1). */
export class LinkedListStack {
  constructor() {
    this.top = null;
    this._size = 0;
  }

  push(value) {
    const node = new StackNode(value);
    node.next = this.top;
    this.top = node;
    this._size += 1;
    return this._size;
  }

  pop() {
    if (this.isEmpty()) return null;
    const node = this.top;
    this.top = node.next;
    this._size -= 1;
    return node.value;
  }

  peek() {
    return this.top ? this.top.value : null;
  }

  isEmpty() {
    return this._size === 0;
  }

  size() {
    return this._size;
  }
}
