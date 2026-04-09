/**
 * Input Component
 * Reusable form inputs with labels and help text
 */
export class Input {
  constructor({
    id,
    label,
    type = 'text',
    placeholder = '',
    value = '',
    help = '',
    required = false,
    ...props
  }) {
    this.id = id;
    this.label = label;
    this.type = type;
    this.placeholder = placeholder;
    this.value = value;
    this.help = help;
    this.required = required;
    this.props = props;
    this.element = null;
  }

  render() {
    const container = document.createElement('div');
    container.className = 'form-group';

    if (this.label) {
      const labelEl = document.createElement('label');
      labelEl.htmlFor = this.id;
      labelEl.className = 'form-label';
      labelEl.textContent = this.label + (this.required ? ' *' : '');
      container.appendChild(labelEl);
    }

    const input = document.createElement('input');
    input.type = this.type;
    input.id = this.id;
    input.name = this.id;
    input.className = 'form-input';
    input.placeholder = this.placeholder;
    input.value = this.value;
    input.required = this.required;

    Object.entries(this.props).forEach(([key, value]) => {
      input[key] = value;
    });

    container.appendChild(input);
    this.element = input;

    if (this.help) {
      const helpEl = document.createElement('small');
      helpEl.className = 'form-help';
      helpEl.textContent = this.help;
      container.appendChild(helpEl);
    }

    return container;
  }

  getValue() {
    return this.element ? this.element.value : '';
  }

  setValue(value) {
    if (this.element) {
      this.element.value = value;
    }
  }

  focus() {
    if (this.element) {
      this.element.focus();
    }
  }

  on(event, handler) {
    if (this.element) {
      this.element.addEventListener(event, handler);
    }
  }
}

export class Textarea extends Input {
  constructor({ rows = 4, ...props }) {
    super({ ...props, type: 'textarea' });
    this.rows = rows;
  }

  render() {
    const container = document.createElement('div');
    container.className = 'form-group';

    if (this.label) {
      const labelEl = document.createElement('label');
      labelEl.htmlFor = this.id;
      labelEl.className = 'form-label';
      labelEl.textContent = this.label + (this.required ? ' *' : '');
      container.appendChild(labelEl);
    }

    const textarea = document.createElement('textarea');
    textarea.id = this.id;
    textarea.name = this.id;
    textarea.className = 'form-textarea';
    textarea.placeholder = this.placeholder;
    textarea.value = this.value;
    textarea.rows = this.rows;
    textarea.required = this.required;

    Object.entries(this.props).forEach(([key, value]) => {
      textarea[key] = value;
    });

    container.appendChild(textarea);
    this.element = textarea;

    if (this.help) {
      const helpEl = document.createElement('small');
      helpEl.className = 'form-help';
      helpEl.textContent = this.help;
      container.appendChild(helpEl);
    }

    return container;
  }
}

export class Select extends Input {
  constructor({ options = [], ...props }) {
    super({ ...props, type: 'select' });
    this.options = options;
  }

  render() {
    const container = document.createElement('div');
    container.className = 'form-group';

    if (this.label) {
      const labelEl = document.createElement('label');
      labelEl.htmlFor = this.id;
      labelEl.className = 'form-label';
      labelEl.textContent = this.label + (this.required ? ' *' : '');
      container.appendChild(labelEl);
    }

    const select = document.createElement('select');
    select.id = this.id;
    select.name = this.id;
    select.className = 'form-select';
    select.required = this.required;

    this.options.forEach(option => {
      const opt = document.createElement('option');
      opt.value = option.value;
      opt.textContent = option.label;
      opt.selected = this.value === option.value;
      select.appendChild(opt);
    });

    container.appendChild(select);
    this.element = select;

    if (this.help) {
      const helpEl = document.createElement('small');
      helpEl.className = 'form-help';
      helpEl.textContent = this.help;
      container.appendChild(helpEl);
    }

    return container;
  }
}
