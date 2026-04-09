/**
 * Button Component
 * Reusable button with variants and states
 */
export class Button {
  constructor({ text, variant = 'primary', size = 'md', icon, onClick, disabled = false, ...props }) {
    this.text = text;
    this.variant = variant;
    this.size = size;
    this.icon = icon;
    this.onClick = onClick;
    this.disabled = disabled;
    this.props = props;
  }

  render() {
    const btn = document.createElement('button');
    btn.className = `btn btn--${this.variant} btn--${this.size}`;
    btn.disabled = this.disabled;

    if (this.icon) {
      const iconSpan = document.createElement('span');
      iconSpan.textContent = this.icon;
      btn.appendChild(iconSpan);
    }

    if (this.text) {
      const textSpan = document.createElement('span');
      textSpan.textContent = this.text;
      btn.appendChild(textSpan);
    }

    Object.entries(this.props).forEach(([key, value]) => {
      btn[key] = value;
    });

    if (this.onClick) {
      btn.addEventListener('click', this.onClick);
    }

    return btn;
  }

  static createLoading(text = 'Loading...') {
    const btn = new Button({
      text: '⏳ ' + text,
      variant: 'primary',
      disabled: true
    });
    return btn.render();
  }

  static createIcon(icon, onClick, ariaLabel) {
    const btn = new Button({
      icon,
      onClick,
      ...ariaLabel && { 'aria-label': ariaLabel }
    });
    return btn.render();
  }
}
