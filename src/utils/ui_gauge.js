/**
 * UI Utility for Radial SEO Gauge
 */

export function createGaugeSVG(container) {
  if (!container) return;
  
  const size = 140;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  container.innerHTML = `
    <svg class="seo-gauge-svg" viewBox="0 0 ${size} ${size}">
      <circle class="gauge-bg" cx="${size / 2}" cy="${size / 2}" r="${radius}" />
      <circle class="gauge-prog" 
              cx="${size / 2}" 
              cy="${size / 2}" 
              r="${radius}" 
              stroke-dasharray="${circumference}" 
              stroke-dashoffset="${circumference}" />
    </svg>
    <div class="seo-gauge-score">
      <span id="seoScoreValue">0</span>
      <small>/100</small>
    </div>
  `;

  return {
    circumference,
    progCircle: container.querySelector('.gauge-prog'),
    scoreText: container.querySelector('#seoScoreValue')
  };
}

export function updateGauge(gauge, score) {
  if (!gauge || !gauge.progCircle) return;
  
  const val = Math.min(100, Math.max(0, Number(score) || 0));
  const offset = gauge.circumference - (val / 100) * gauge.circumference;
  
  gauge.progCircle.style.strokeDashoffset = offset;
  
  if (gauge.scoreText) {
    // Animate count-up effect
    const start = parseInt(gauge.scoreText.textContent) || 0;
    const duration = 800;
    const startTime = performance.now();

    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const currentScore = Math.floor(start + (val - start) * progress);
      
      gauge.scoreText.textContent = currentScore;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }
    requestAnimationFrame(animate);
  }
}
