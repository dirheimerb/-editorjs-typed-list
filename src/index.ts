import './index.css';
import '../assets/globals';
import OrderedListIcon from '../assets/ordered-list.svg';
import UnorderedListIcon from '../assets/unordered-list.svg';

export type ListStyle = string;
export enum KeyboardMap {
  ENTER = 'Enter',
  BACKSPACE = 'Backspace',
}
export interface ListData {
  style: string;
  items: string[];
}
export interface ConfigOptions {
  defaultStyle: string;
}
export interface ListCSSOptions {
  baseBlock: any;
  wrapper: string;
  wrapperOrdered: string;
  wrapperUnordered: string;
  item: string;
}

export interface Setting {
  name: 'unordered' | 'ordered';
  label: string;
  icon: string;
  default: boolean;
}

export default class List {
  settings: Setting[];
  readOnly: boolean;
  private readonly _elements: {
    wrapper: HTMLElement; // | null;
  };

  private readonly api: any; // This would be better with a specific type if available

  static get isReadOnlySupported(): boolean {
    return true;
  }

  static get enableLineBreaks(): boolean {
    return true;
  }

  static get toolbox(): { icon: string; title: string } {
    return {
      icon: UnorderedListIcon,
      title: 'List',
    };
  }

  constructor({
    data,
    config,
    api,
    readOnly,
  }: {
    data: ListData;
    config: ConfigOptions;
    api: any;
    readOnly: boolean;
  }) {
    this.data = data;
    this.api = api;
    this.readOnly = readOnly;
    this._elements = {
      wrapper: this.makeMainTag(this.data.style),
    };

    this.settings = [
      {
        name: 'unordered',
        label: this.api.i18n.t('Unordered'),
        icon: UnorderedListIcon,
        default: config.defaultStyle === 'unordered' || false,
      },
      {
        name: 'ordered',
        label: this.api.i18n.t('Ordered'),
        icon: OrderedListIcon,
        default: config.defaultStyle === 'ordered' || true,
      },
    ];
  }

  render(): HTMLElement {
    this._elements.wrapper = this.makeMainTag(this.data.style);
    if (this.data.items.length) {
      this.data.items.forEach((item) => {
        this._elements.wrapper.appendChild(
          this.makeElement('li', this.CSS.item, {
            innerHTML: item,
          }),
        );
      });
    } else {
      this._elements.wrapper.appendChild(this.makeElement('li', this.CSS.item));
    }

    if (!this.readOnly) {
      // detect keydown on the last item to escape List
      this._elements.wrapper.addEventListener(
        'keydown',
        (event: KeyboardEvent) => {
          switch (event.key) {
            case KeyboardMap.ENTER:
              this.exitListOnEmptyItem(event);
              break;
            case KeyboardMap.BACKSPACE:
              this.backspace(event);
              break;
          }
        },
        false,
      );
    }

    return this._elements.wrapper;
  }

  save(): ListData {
    return this.data;
  }

  static get conversionConfig() {
    return {
      /**
       * To create exported string from list, concatenate items by dot-symbol.
       *
       * @param {ListData} data - list data to create a string from thats
       * @returns {string}
       */
      export: (data: ListData): string => {
        return data.items.join('. ');
      },
      /**
       * To create a list from other block's string, just put it at the first item
       *
       * @param {string} string - string to create list tool data from that
       * @returns {ListData}
       */
      import: (string: string): ListData => {
        return {
          items: [string],
          style: 'unordered',
        };
      },
    };
  }

  static get sanitize(): { [key: string]: any } {
    return {
      style: {},
      items: {
        br: true,
      },
    };
  }

  renderSettings() {
    return this.settings.map((setting: Setting) => ({
      ...setting,
      isActive: this.data.style === setting.name,
      closeOnActivate: true,
      onActivate: () => this.toggleTune(setting.name),
    }));
  }

  pastHandler(
    element: HTMLUListElement | HTMLOListElement | HTMLLIElement,
  ): ListData {
    const { tagName: tag } = element;
    let style = '';

    switch (tag) {
      case 'OL':
        style = 'ordered';
        break;
      case 'UL':
      case 'LI':
        style = 'unordered';
        break;
    }

    const data: ListData = {
      style,
      items: [],
    };

    if (tag === 'LI') {
      data.items = [element.innerHTML];
    } else {
      const items = Array.from(element.querySelectorAll('LI'));
      data.items = items
        .map((li) => li.innerHTML)
        .filter((item) => item.trim());
    }

    return data;
  }

  static get pasteConfig() {
    return {
      tags: ['OL', 'UL', 'LI'],
    };
  }

  makeMainTag(style: ListStyle): HTMLOListElement | HTMLUListElement {
    const styleClass =
      style === 'ordered' ? this.CSS.wrapperOrdered : this.CSS.wrapperUnordered;
    const tag = style === 'ordered' ? 'ol' : 'ul';

    return this.makeElement(
      tag,
      [this.CSS.baseBlock, this.CSS.wrapper, styleClass],
      {
        contentEditable: !this.readOnly,
      },
    );
  }

  toggleTune(style: ListStyle): void {
    const newTag = this.makeMainTag(style);

    while (this._elements.wrapper.firstChild) {
      // Checking for firstChild's existence before using it
      newTag.appendChild(this._elements.wrapper.firstChild);
    }

    this._elements.wrapper.replaceWith(newTag);
    this._elements.wrapper = newTag as HTMLElement; // Assuming _elements.wrapper is of type HTMLElement
    this.data.style = style;
  }

  private get CSS(): ListCSSOptions {
    return {
      baseBlock: this.api.styles.block,
      wrapper: 'cdx-list',
      wrapperOrdered: 'cdx-list--ordered',
      wrapperUnordered: 'cdx-list--unordered',
      item: 'cdx-list__item',
    };
  }

  set data(listData: ListData) {
    if (
      listData !== undefined &&
      listData.style !== undefined &&
      listData.items !== undefined
    ) {
      listData = {
        style: this.settings?.find((tune) => tune.default)?.name || '',
        items: [],
      };
    }

    this.data.style = listData.style;
    this.data.items = listData.items;

    const oldView = this._elements.wrapper;
    if (oldView) {
      oldView.parentNode?.replaceChild(this.render(), oldView);
    }
  }

  get data(): ListData {
    const items = Array.from(
      this._elements.wrapper.querySelectorAll(`.${this.CSS.item}`),
    );
    return {
      style: this.data.style,
      items: items.map((item) => item.innerHTML).filter((item) => item.trim()),
    };
  }

  // Adjust the makeElement method to make it more generic in its return type
  private makeElement<T extends keyof HTMLElementTagNameMap>(
    tagName: T,
    classNames: string | string[] | null = null,
    attributes: Record<string, any> = {},
  ): HTMLElementTagNameMap[T] {
    const el = document.createElement(tagName);

    if (classNames) {
      if (Array.isArray(classNames)) {
        el.classList.add(...classNames);
      } else {
        el.classList.add(classNames);
      }
    }

    Object.entries(attributes).forEach(([key, value]) => {
      el.setAttribute(key, value);
    });

    return el;
  }

  get currentItem(): Element | null {
    const selection = window.getSelection();
    let currentNode = selection?.anchorNode;

    if (currentNode && currentNode.nodeType !== Node.ELEMENT_NODE) {
      currentNode = currentNode.parentNode;
    }

    return currentNode instanceof Element
      ? currentNode.closest(`.${this.CSS.item}`)
      : null;
  }

  exitListOnEmptyItem(event: KeyboardEvent): void {
    const listItems = Array.from(
      this._elements.wrapper.querySelectorAll(`.${this.CSS.item}`),
    );
    if (listItems.length < 2) return;

    const lastItem = listItems[listItems.length - 1];
    const currentItem = this.currentItem;

    if (currentItem === lastItem && !lastItem.textContent?.trim()) {
      currentItem?.remove();
      this.api.blocks.insert();
      this.api.caret.setToBlock(this.api.blocks.getCurrentBlockIndex());
      event.preventDefault();
      event.stopPropagation();
    }
  }

  backspace(event: KeyboardEvent): void {
    const items = Array.from(
      this._elements.wrapper.querySelectorAll(`.${this.CSS.item}`),
    );
    const firstItem = items[0];
    if (!firstItem) return;

    if (items.length < 2 && !firstItem.innerHTML.replace('<br>', ' ').trim()) {
      event.preventDefault();
    }
  }

  selectListItemContent(event: KeyboardEvent): void {
    event.preventDefault();

    const selection = window.getSelection();
    if (!selection) return;

    const currentNode = selection.anchorNode?.parentNode;
    if (!(currentNode instanceof Element)) return;

    const currentItem = currentNode.closest(`.${this.CSS.item}`);
    if (!currentItem) return;

    const range = new Range();
    range.selectNodeContents(currentItem);

    selection.removeAllRanges();
    selection.addRange(range);
  }

  pasteHandler(
    element: HTMLUListElement | HTMLOListElement | HTMLLIElement,
  ): ListData {
    const { tagName: tag } = element;
    let style = '';

    switch (tag) {
      case 'OL':
        style = 'ordered';
        break;
      case 'UL':
      case 'LI':
        style = 'unordered';
    }

    const data: ListData = {
      style,
      items: [] as string[],
    };

    if (tag === 'LI') {
      data.items = [element.innerHTML];
    } else {
      const items = Array.from(element.querySelectorAll('LI'));

      data.items = items
        .map((li) => li.innerHTML)
        .filter((item) => !!item.trim());
    }

    return data;
  }
}
