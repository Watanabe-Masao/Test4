/**
 * @file Chart Base Class
 * @description Canvas-based chart rendering foundation
 * @version 1.0.0
 */

/**
 * Chart configuration
 * @typedef {Object} ChartConfig
 * @property {string} type - Chart type (line, bar, area, mixed)
 * @property {Object} data - Chart data {labels, datasets}
 * @property {Object} options - Chart options
 */

/**
 * Base Chart Class
 * Foundation for all canvas-based charts
 */
export class ChartBase {
  constructor(canvasId, config = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      throw new Error(`Canvas element with id "${canvasId}" not found`);
    }

    this.ctx = this.canvas.getContext('2d');
    this.config = this._mergeConfig(config);
    this.data = config.data || { labels: [], datasets: [] };
    this.animationFrame = null;
    this.hoveredPoint = null;
    this.tooltip = null;

    this._setupCanvas();
    this._setupEventListeners();
  }

  /**
   * Merge default config with user config
   * @private
   */
  _mergeConfig(userConfig) {
    const defaults = {
      type: 'line',
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 2,
      padding: {
        top: 40,
        right: 40,
        bottom: 60,
        left: 80
      },
      grid: {
        show: true,
        color: 'rgba(100, 116, 139, 0.2)',
        lineWidth: 1,
        xLines: true,
        yLines: true
      },
      axes: {
        x: {
          show: true,
          label: '',
          color: '#94A3B8',
          fontSize: 11,
          fontFamily: "'Noto Sans JP', sans-serif"
        },
        y: {
          show: true,
          label: '',
          color: '#94A3B8',
          fontSize: 11,
          fontFamily: "'Noto Sans JP', sans-serif",
          ticks: 5,
          format: (value) => value.toLocaleString('ja-JP')
        }
      },
      legend: {
        show: true,
        position: 'top',
        fontSize: 12,
        fontFamily: "'Noto Sans JP', sans-serif",
        color: '#CBD5E1'
      },
      animation: {
        enabled: true,
        duration: 600,
        easing: 'easeOutCubic'
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(30, 41, 59, 0.95)',
        borderColor: '#4F46E5',
        borderWidth: 2,
        borderRadius: 8,
        padding: 12,
        fontSize: 13,
        fontFamily: "'Noto Sans JP', sans-serif",
        color: '#F1F5F9'
      },
      colors: [
        '#4F46E5', // Indigo
        '#10B981', // Emerald
        '#F59E0B', // Amber
        '#EF4444', // Red
        '#8B5CF6', // Violet
        '#06B6D4', // Cyan
        '#F472B6', // Pink
        '#84CC16'  // Lime
      ]
    };

    return this._deepMerge(defaults, userConfig);
  }

  /**
   * Deep merge objects
   * @private
   */
  _deepMerge(target, source) {
    const output = { ...target };
    if (this._isObject(target) && this._isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this._isObject(source[key])) {
          if (!(key in target)) {
            output[key] = source[key];
          } else {
            output[key] = this._deepMerge(target[key], source[key]);
          }
        } else {
          output[key] = source[key];
        }
      });
    }
    return output;
  }

  /**
   * Check if value is object
   * @private
   */
  _isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  /**
   * Setup canvas for high DPI displays
   * @private
   */
  _setupCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;

    this.ctx.scale(dpr, dpr);

    // Set display size
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';

    // Store dimensions
    this.width = rect.width;
    this.height = rect.height;
  }

  /**
   * Setup event listeners
   * @private
   */
  _setupEventListeners() {
    if (this.config.tooltip.enabled) {
      this.canvas.addEventListener('mousemove', this._handleMouseMove.bind(this));
      this.canvas.addEventListener('mouseleave', this._handleMouseLeave.bind(this));
    }

    // Handle window resize
    if (this.config.responsive) {
      const resizeObserver = new ResizeObserver(() => {
        this._setupCanvas();
        this.render();
      });
      resizeObserver.observe(this.canvas.parentElement);
    }
  }

  /**
   * Handle mouse move for tooltips
   * @private
   */
  _handleMouseMove(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const point = this._getPointAtPosition(x, y);

    if (point) {
      this.hoveredPoint = point;
      this.canvas.style.cursor = 'pointer';
      this._showTooltip(x, y, point);
    } else {
      this.hoveredPoint = null;
      this.canvas.style.cursor = 'default';
      this._hideTooltip();
    }

    this.render();
  }

  /**
   * Handle mouse leave
   * @private
   */
  _handleMouseLeave() {
    this.hoveredPoint = null;
    this._hideTooltip();
    this.render();
  }

  /**
   * Get data point at position (to be overridden)
   * @private
   */
  _getPointAtPosition(x, y) {
    return null;
  }

  /**
   * Show tooltip
   * @private
   */
  _showTooltip(x, y, point) {
    if (!this.tooltip) {
      this.tooltip = document.createElement('div');
      this.tooltip.className = 'chart-tooltip';
      this.tooltip.style.cssText = `
        position: absolute;
        pointer-events: none;
        z-index: 1000;
        background: ${this.config.tooltip.backgroundColor};
        border: ${this.config.tooltip.borderWidth}px solid ${this.config.tooltip.borderColor};
        border-radius: ${this.config.tooltip.borderRadius}px;
        padding: ${this.config.tooltip.padding}px;
        font-size: ${this.config.tooltip.fontSize}px;
        font-family: ${this.config.tooltip.fontFamily};
        color: ${this.config.tooltip.color};
        white-space: nowrap;
        opacity: 0;
        transition: opacity 0.2s;
      `;
      document.body.appendChild(this.tooltip);
    }

    // Update tooltip content
    this.tooltip.innerHTML = this._formatTooltip(point);

    // Position tooltip
    const rect = this.canvas.getBoundingClientRect();
    const tooltipRect = this.tooltip.getBoundingClientRect();

    let left = rect.left + x + 10;
    let top = rect.top + y - tooltipRect.height / 2;

    // Keep tooltip in viewport
    if (left + tooltipRect.width > window.innerWidth) {
      left = rect.left + x - tooltipRect.width - 10;
    }
    if (top < 0) top = 10;
    if (top + tooltipRect.height > window.innerHeight) {
      top = window.innerHeight - tooltipRect.height - 10;
    }

    this.tooltip.style.left = left + 'px';
    this.tooltip.style.top = top + 'px';
    this.tooltip.style.opacity = '1';
  }

  /**
   * Hide tooltip
   * @private
   */
  _hideTooltip() {
    if (this.tooltip) {
      this.tooltip.style.opacity = '0';
      setTimeout(() => {
        if (this.tooltip && this.tooltip.style.opacity === '0') {
          this.tooltip.remove();
          this.tooltip = null;
        }
      }, 200);
    }
  }

  /**
   * Format tooltip content (to be overridden)
   * @private
   */
  _formatTooltip(point) {
    return `
      <div><strong>${point.label}</strong></div>
      <div>${point.dataset}: ${point.value.toLocaleString('ja-JP')}</div>
    `;
  }

  /**
   * Calculate chart area dimensions
   * @protected
   */
  _getChartArea() {
    const { padding } = this.config;
    return {
      x: padding.left,
      y: padding.top,
      width: this.width - padding.left - padding.right,
      height: this.height - padding.top - padding.bottom
    };
  }

  /**
   * Draw grid lines
   * @protected
   */
  _drawGrid() {
    if (!this.config.grid.show) return;

    const area = this._getChartArea();
    const { ctx } = this;
    const { grid, axes } = this.config;

    ctx.strokeStyle = grid.color;
    ctx.lineWidth = grid.lineWidth;

    // Vertical grid lines
    if (grid.xLines && this.data.labels) {
      const xStep = area.width / (this.data.labels.length - 1 || 1);
      this.data.labels.forEach((_, i) => {
        const x = area.x + i * xStep;
        ctx.beginPath();
        ctx.moveTo(x, area.y);
        ctx.lineTo(x, area.y + area.height);
        ctx.stroke();
      });
    }

    // Horizontal grid lines
    if (grid.yLines) {
      const yTicks = axes.y.ticks || 5;
      for (let i = 0; i <= yTicks; i++) {
        const y = area.y + (area.height / yTicks) * i;
        ctx.beginPath();
        ctx.moveTo(area.x, y);
        ctx.lineTo(area.x + area.width, y);
        ctx.stroke();
      }
    }
  }

  /**
   * Draw axes
   * @protected
   */
  _drawAxes() {
    const area = this._getChartArea();
    const { ctx } = this;
    const { axes } = this.config;

    // Draw X axis
    if (axes.x.show) {
      ctx.strokeStyle = axes.x.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(area.x, area.y + area.height);
      ctx.lineTo(area.x + area.width, area.y + area.height);
      ctx.stroke();

      // Draw X labels
      if (this.data.labels) {
        ctx.fillStyle = axes.x.color;
        ctx.font = `${axes.x.fontSize}px ${axes.x.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        const xStep = area.width / (this.data.labels.length - 1 || 1);
        this.data.labels.forEach((label, i) => {
          const x = area.x + i * xStep;
          const y = area.y + area.height + 10;
          ctx.fillText(label, x, y);
        });
      }
    }

    // Draw Y axis
    if (axes.y.show) {
      ctx.strokeStyle = axes.y.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(area.x, area.y);
      ctx.lineTo(area.x, area.y + area.height);
      ctx.stroke();

      // Draw Y labels
      const { min, max } = this._getDataRange();
      const yTicks = axes.y.ticks || 5;

      ctx.fillStyle = axes.y.color;
      ctx.font = `${axes.y.fontSize}px ${axes.y.fontFamily}`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      for (let i = 0; i <= yTicks; i++) {
        const value = max - (max - min) * (i / yTicks);
        const y = area.y + (area.height / yTicks) * i;
        const x = area.x - 10;
        ctx.fillText(axes.y.format(value), x, y);
      }
    }
  }

  /**
   * Draw legend
   * @protected
   */
  _drawLegend() {
    if (!this.config.legend.show || !this.data.datasets) return;

    const { ctx } = this;
    const { legend, colors } = this.config;

    ctx.font = `${legend.fontSize}px ${legend.fontFamily}`;
    ctx.textBaseline = 'middle';

    let x = this.width / 2 - this._getLegendWidth() / 2;
    const y = 20;

    this.data.datasets.forEach((dataset, i) => {
      // Draw color box
      ctx.fillStyle = dataset.color || colors[i % colors.length];
      ctx.fillRect(x, y - 6, 12, 12);

      // Draw label
      x += 18;
      ctx.fillStyle = legend.color;
      ctx.textAlign = 'left';
      ctx.fillText(dataset.label, x, y);

      x += ctx.measureText(dataset.label).width + 20;
    });
  }

  /**
   * Get legend width
   * @private
   */
  _getLegendWidth() {
    if (!this.data.datasets) return 0;

    const { ctx } = this;
    const { legend } = this.config;

    ctx.font = `${legend.fontSize}px ${legend.fontFamily}`;

    let totalWidth = 0;
    this.data.datasets.forEach(dataset => {
      totalWidth += 18 + ctx.measureText(dataset.label).width + 20;
    });

    return totalWidth;
  }

  /**
   * Get data range (min/max values)
   * @protected
   */
  _getDataRange() {
    if (!this.data.datasets || this.data.datasets.length === 0) {
      return { min: 0, max: 100 };
    }

    let min = Infinity;
    let max = -Infinity;

    this.data.datasets.forEach(dataset => {
      dataset.data.forEach(value => {
        if (value < min) min = value;
        if (value > max) max = value;
      });
    });

    // Add padding
    const padding = (max - min) * 0.1;
    min = Math.max(0, min - padding);
    max = max + padding;

    // Round to nice numbers
    min = Math.floor(min / 10) * 10;
    max = Math.ceil(max / 10) * 10;

    return { min, max };
  }

  /**
   * Map value to Y coordinate
   * @protected
   */
  _valueToY(value) {
    const area = this._getChartArea();
    const { min, max } = this._getDataRange();
    const range = max - min;
    return area.y + area.height - ((value - min) / range) * area.height;
  }

  /**
   * Map index to X coordinate
   * @protected
   */
  _indexToX(index) {
    const area = this._getChartArea();
    const xStep = area.width / (this.data.labels.length - 1 || 1);
    return area.x + index * xStep;
  }

  /**
   * Clear canvas
   * @protected
   */
  _clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  /**
   * Render chart (to be overridden)
   */
  render() {
    this._clear();
    this._drawGrid();
    this._drawAxes();
    this._drawLegend();
  }

  /**
   * Update chart data
   * @param {Object} newData - New data
   */
  updateData(newData) {
    this.data = newData;
    this.render();
  }

  /**
   * Update chart config
   * @param {Object} newConfig - New configuration
   */
  updateConfig(newConfig) {
    this.config = this._mergeConfig(newConfig);
    this.render();
  }

  /**
   * Destroy chart
   */
  destroy() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    if (this.tooltip) {
      this.tooltip.remove();
    }
    this.canvas.removeEventListener('mousemove', this._handleMouseMove);
    this.canvas.removeEventListener('mouseleave', this._handleMouseLeave);
  }
}

/**
 * Line Chart Class
 */
export class LineChart extends ChartBase {
  constructor(canvasId, config = {}) {
    super(canvasId, { ...config, type: 'line' });
  }

  render() {
    super.render();
    this._drawLines();
    this._drawPoints();
  }

  _drawLines() {
    if (!this.data.datasets) return;

    const { ctx, config } = this;
    const area = this._getChartArea();

    this.data.datasets.forEach((dataset, datasetIndex) => {
      const color = dataset.color || config.colors[datasetIndex % config.colors.length];

      ctx.strokeStyle = color;
      ctx.lineWidth = dataset.lineWidth || 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();

      dataset.data.forEach((value, i) => {
        const x = this._indexToX(i);
        const y = this._valueToY(value);

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();
    });
  }

  _drawPoints() {
    if (!this.data.datasets) return;

    const { ctx, config } = this;

    this.data.datasets.forEach((dataset, datasetIndex) => {
      const color = dataset.color || config.colors[datasetIndex % config.colors.length];

      dataset.data.forEach((value, i) => {
        const x = this._indexToX(i);
        const y = this._valueToY(value);

        // Draw point
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();

        // Highlight hovered point
        if (this.hoveredPoint &&
            this.hoveredPoint.datasetIndex === datasetIndex &&
            this.hoveredPoint.index === i) {
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });
    });
  }

  _getPointAtPosition(x, y) {
    const threshold = 10;

    for (let di = 0; di < this.data.datasets.length; di++) {
      const dataset = this.data.datasets[di];

      for (let i = 0; i < dataset.data.length; i++) {
        const px = this._indexToX(i);
        const py = this._valueToY(dataset.data[i]);

        const distance = Math.sqrt((x - px) ** 2 + (y - py) ** 2);

        if (distance < threshold) {
          return {
            datasetIndex: di,
            index: i,
            label: this.data.labels[i],
            dataset: dataset.label,
            value: dataset.data[i]
          };
        }
      }
    }

    return null;
  }
}

/**
 * Bar Chart Class
 */
export class BarChart extends ChartBase {
  constructor(canvasId, config = {}) {
    super(canvasId, { ...config, type: 'bar' });
  }

  render() {
    super.render();
    this._drawBars();
  }

  _drawBars() {
    if (!this.data.datasets || !this.data.labels) return;

    const { ctx, config } = this;
    const area = this._getChartArea();

    const groupWidth = area.width / this.data.labels.length;
    const barWidth = groupWidth / this.data.datasets.length * 0.8;
    const gap = barWidth * 0.1;

    this.data.datasets.forEach((dataset, datasetIndex) => {
      const color = dataset.color || config.colors[datasetIndex % config.colors.length];

      dataset.data.forEach((value, i) => {
        const groupX = area.x + i * groupWidth;
        const barX = groupX + datasetIndex * barWidth + gap;
        const barHeight = (value / this._getDataRange().max) * area.height;
        const barY = area.y + area.height - barHeight;

        ctx.fillStyle = color;
        ctx.fillRect(barX, barY, barWidth - gap, barHeight);
      });
    });
  }

  _getPointAtPosition(x, y) {
    const area = this._getChartArea();
    const groupWidth = area.width / this.data.labels.length;
    const barWidth = groupWidth / this.data.datasets.length * 0.8;
    const gap = barWidth * 0.1;

    for (let i = 0; i < this.data.labels.length; i++) {
      const groupX = area.x + i * groupWidth;

      for (let di = 0; di < this.data.datasets.length; di++) {
        const barX = groupX + di * barWidth + gap;
        const value = this.data.datasets[di].data[i];
        const barHeight = (value / this._getDataRange().max) * area.height;
        const barY = area.y + area.height - barHeight;

        if (x >= barX && x <= barX + barWidth - gap && y >= barY && y <= barY + barHeight) {
          return {
            datasetIndex: di,
            index: i,
            label: this.data.labels[i],
            dataset: this.data.datasets[di].label,
            value
          };
        }
      }
    }

    return null;
  }
}

/**
 * Area Chart Class
 */
export class AreaChart extends LineChart {
  constructor(canvasId, config = {}) {
    super(canvasId, { ...config, type: 'area' });
  }

  _drawLines() {
    if (!this.data.datasets) return;

    const { ctx, config } = this;
    const area = this._getChartArea();

    this.data.datasets.forEach((dataset, datasetIndex) => {
      const color = dataset.color || config.colors[datasetIndex % config.colors.length];

      // Fill area
      ctx.fillStyle = color.replace(')', ', 0.2)').replace('rgb', 'rgba');
      ctx.beginPath();

      dataset.data.forEach((value, i) => {
        const x = this._indexToX(i);
        const y = this._valueToY(value);

        if (i === 0) {
          ctx.moveTo(x, area.y + area.height);
          ctx.lineTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.lineTo(this._indexToX(dataset.data.length - 1), area.y + area.height);
      ctx.closePath();
      ctx.fill();

      // Draw line
      super._drawLines();
    });
  }
}
