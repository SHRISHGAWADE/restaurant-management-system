class QueueNode {
  constructor(value) {
    this.value = value;
    this.next = null;
  }
}

/** FIFO queue backed by a singly linked list. Enqueue and dequeue are O(1). */
export class LinkedListQueue {
  constructor() {
    this.front = null;
    this.rear = null;
    this._size = 0;
  }

  enqueue(value) {
    const node = new QueueNode(value);
    if (this.isEmpty()) {
      this.front = node;
      this.rear = node;
    } else {
      this.rear.next = node;
      this.rear = node;
    }
    this._size += 1;
    return this._size;
  }

  dequeue() {
    if (this.isEmpty()) return null;
    const node = this.front;
    this.front = node.next;
    this._size -= 1;
    if (this.isEmpty()) this.rear = null;
    return node.value;
  }

  peek() {
    return this.front ? this.front.value : null;
  }

  isEmpty() {
    return this._size === 0;
  }

  size() {
    return this._size;
  }

  traverse(visitor) {
    const values = [];
    let node = this.front;
    while (node) {
      values.push(node.value);
      if (typeof visitor === 'function') visitor(node.value);
      node = node.next;
    }
    return values;
  }

  toArray() {
    return this.traverse();
  }
}
