// Minimal Chart shim supporting a simple line chart used by the app.
// Not a full Chart.js replacement — implements just enough for our MVP.
(function(global){
  function drawLineChart(canvas, config){
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.clientWidth || 600;
    const height = canvas.height = canvas.clientHeight || 300;
    ctx.clearRect(0,0,width,height);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0,0,width,height);

    const labels = (config.data && config.data.labels) || [];
    const dataset = (config.data && config.data.datasets && config.data.datasets[0]) || { data: [] };
    const data = dataset.data || [];

    // padding
    const pad = 10;
    const plotW = width - pad*2;
    const plotH = height - pad*2;

    // draw axes
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, pad);
    ctx.lineTo(pad, pad+plotH);
    ctx.lineTo(pad+plotW, pad+plotH);
    ctx.stroke();

    if (data.length === 0) return;

    const max = Math.max.apply(null, data);
    const min = Math.min.apply(null, data);
    const range = (max - min) || 1;

    // draw y grid and labels
    ctx.fillStyle = '#666';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    for (let i=0;i<=4;i++){
      const y = pad + (plotH * i/4);
      ctx.strokeStyle = '#f0f0f0';
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(pad+plotW, y);
      ctx.stroke();
      const val = (max - (range * i/4));
      ctx.fillText(val.toFixed(2), pad-8, y+4);
    }

    // draw x labels
    ctx.textAlign = 'center';
    const stepX = plotW / Math.max(1, (labels.length-1));
    labels.forEach((lab, idx)=>{
      const x = pad + idx * stepX;
      ctx.fillStyle = '#666';
      ctx.fillText(lab, x, pad+plotH+18);
    });

    // plot line
    ctx.beginPath();
    data.forEach((v, idx)=>{
      const x = pad + idx * stepX;
      const y = pad + ((max - v) / range) * plotH;
      if (idx===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.strokeStyle = (dataset.borderColor) || '#667eea';
    ctx.lineWidth = 2;
    ctx.stroke();

    // fill under curve
    if (dataset.fill){
      ctx.lineTo(pad+plotW, pad+plotH);
      ctx.lineTo(pad, pad+plotH);
      ctx.closePath();
      ctx.fillStyle = (dataset.backgroundColor) || 'rgba(102,126,234,0.1)';
      ctx.fill();
    }

    // draw points
    ctx.fillStyle = (dataset.pointBackgroundColor) || '#667eea';
    data.forEach((v, idx)=>{
      const x = pad + idx * stepX;
      const y = pad + ((max - v) / range) * plotH;
      ctx.beginPath();
      ctx.arc(x,y,3,0,Math.PI*2);
      ctx.fill();
    });
  }

  function Chart(canvas, config){
    if (!(this instanceof Chart)) return new Chart(canvas, config);
    // accept either canvas element or canvas context
    const el = canvas && canvas.getContext ? canvas : (canvas && canvas.canvas ? canvas.canvas : null);
    if (!el) throw new Error('Invalid canvas provided to Chart shim');
    this._el = el;
    this._config = config || {};
    drawLineChart(el, this._config);
  }

  Chart.prototype.destroy = function(){
    const ctx = this._el.getContext('2d');
    ctx.clearRect(0,0,this._el.width,this._el.height);
    this._el.width = this._el.width; // reset
    this._config = null;
  };

  global.Chart = Chart;
})(window);
