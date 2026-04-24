'use strict';

/**
 * Haulage Logic - Price Estimator
 */

var rates = { van: 2.6, '7.5t': 4.0, '18t': 5.5, artic: 8.0, ltl: 17 };
var smul = { standard: 1, express: 1.45, same: 1.9, temp: 1.35 };

function calcEst() {
    var vehicleEl = document.getElementById('est-vehicle');
    var milesEl = document.getElementById('est-miles');
    var serviceEl = document.getElementById('est-service');
    var resultEl = document.getElementById('estResult');

    if (!vehicleEl || !milesEl || !serviceEl || !resultEl) return;

    var v = vehicleEl.value;
    var m = parseFloat(milesEl.value) || 0;
    var s = serviceEl.value;

    if (m <= 0) {
        resultEl.style.display = 'none';
        return;
    }

    var base = v === 'ltl' ? rates[v] * Math.ceil(m / 50) : rates[v] * m;
    var uplift = base * (smul[s] - 1);
    var fuel = base * 0.12;
    var total = base + uplift + fuel;

    var baseRes = document.getElementById('er-base');
    var upliftRes = document.getElementById('er-uplift');
    var fuelRes = document.getElementById('er-fuel');
    var totalRes = document.getElementById('er-total');

    if (baseRes) baseRes.textContent = '£' + base.toFixed(2);
    if (upliftRes) upliftRes.textContent = uplift > 0 ? '+£' + uplift.toFixed(2) : 'Included';
    if (fuelRes) fuelRes.textContent = '+£' + fuel.toFixed(2);
    if (totalRes) totalRes.textContent = '£' + total.toFixed(2);
    
    resultEl.style.display = 'block';
}

// Attach to window
window.calcEst = calcEst;

document.addEventListener('DOMContentLoaded', function() {
    var milesInput = document.getElementById('est-miles');
    var serviceSelect = document.getElementById('est-service');
    var calcBtn = document.querySelector('.btn-calc');

    var vehicleSelect = document.getElementById('est-vehicle');
    if (vehicleSelect) vehicleSelect.addEventListener('change', calcEst);

    if (milesInput) milesInput.addEventListener('input', calcEst);
    if (serviceSelect) serviceSelect.addEventListener('change', calcEst);
    if (calcBtn) calcBtn.addEventListener('click', calcEst);
});
