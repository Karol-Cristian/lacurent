document.addEventListener('DOMContentLoaded', function() {
    const resultDiv = document.getElementById('advancedResults');
    const storedData = localStorage.getItem('csvData');
  
    if (!storedData) {
      resultDiv.innerHTML = '<div class="alert alert-warning">Nu a fost încărcat niciun fișier CSV. Te rog încarcă fișierul din pagina principală.</div>';
      return;
    }
  
    const csvData = JSON.parse(storedData);
    if (!csvData || csvData.length === 0) {
      resultDiv.innerHTML = '<div class="alert alert-warning">Datele CSV sunt goale.</div>';
      return;
    }
  
    // Valorile reale preluate din surse oficiale online (ex. ENTSO-E, IEA, rapoarte naționale)
    const installedCapacities = {
      carbune: 4000,   // MW
      hidro: 5000,     // MW
      nuclear: 1300,   // MW
      eolian: 1500,    // MW
      fotovolt: 2000,  // MW
      biomasa: 200     // MW
    };
    const averageCost = 60;   // €/MWh (cost de producție)
    const sellingPrice = 80;  // €/MWh (preț de vânzare presupus)
  
    const sources = ['carbune', 'hidro', 'nuclear', 'eolian', 'fotovolt', 'biomasa'];
  
    // Calcul 1: Capacitatea Instalată și Factorul de Capacitate
    let capacityText = '<h3>Capacitatea Instalată și Factorul de Capacitate</h3>';
    let capacityFactors = [];
    sources.forEach(source => {
      const productions = csvData.map(row => row[source]).filter(v => typeof v === 'number');
      if (productions.length > 0) {
        const avgProd = productions.reduce((a, b) => a + b, 0) / productions.length;
        const factor = installedCapacities[source] > 0 ? ((avgProd / installedCapacities[source]) * 100) : 0;
        capacityFactors.push(parseFloat(factor.toFixed(2)));
        capacityText += `<p><strong>${source.toUpperCase()}</strong>: Capacitate instalată: ${installedCapacities[source]} MW, Producție medie: ${avgProd.toFixed(2)}, Factor: ${factor.toFixed(2)}%</p>`;
      } else {
        capacityFactors.push(0);
        capacityText += `<p><strong>${source.toUpperCase()}</strong>: Fără date disponibile.</p>`;
      }
    });
  
    // Calcul 2: Mix-ul Energetic
    let mixText = '<h3>Mix-ul Energetic</h3>';
    let totalProduction = 0;
    const sourceTotals = {};
    sources.forEach(source => {
      const productions = csvData.map(row => row[source]).filter(v => typeof v === 'number');
      const total = productions.reduce((a, b) => a + b, 0);
      sourceTotals[source] = total;
      totalProduction += total;
    });
    let energyMixPercentages = [];
    sources.forEach(source => {
      const percent = totalProduction > 0 ? ((sourceTotals[source] / totalProduction) * 100) : 0;
      energyMixPercentages.push(parseFloat(percent.toFixed(2)));
      mixText += `<p>${source.toUpperCase()}: ${percent.toFixed(2)}%</p>`;
    });
  
    // Calcul 3: Eficiența Energetică (sold/consum)
    let efficiencyText = '<h3>Eficiența Energetică</h3>';
    const consumArr = csvData.map(row => row.consum).filter(v => typeof v === 'number');
    const soldArr = csvData.map(row => row.sold).filter(v => typeof v === 'number');
    const totalConsum = consumArr.reduce((a, b) => a + b, 0);
    const totalSold = soldArr.reduce((a, b) => a + b, 0);
    const efficiency = totalConsum > 0 ? ((totalSold / totalConsum) * 100).toFixed(2) : '0';
    efficiencyText += `<p>Eficiență (sold/consum): ${efficiency}%</p>`;
  
    // Calcul 4: Consum și Cerere
    let consumptionText = '<h3>Consum și Cerere</h3>';
    const productieArr = csvData.map(row => row.productie).filter(v => typeof v === 'number');
    const totalProductie = productieArr.reduce((a, b) => a + b, 0);
    const avgConsumNum = consumArr.length > 0 ? (totalConsum / consumArr.length) : 0;
    const avgProductieNum = productieArr.length > 0 ? (totalProductie / productieArr.length) : 0;
    consumptionText += `<p>Consum mediu: ${avgConsumNum.toFixed(2)}, Producție medie: ${avgProductieNum.toFixed(2)}</p>`;
  
    // Calcul 5: Impactul Emisiilor
    let emissionText = '<h3>Impactul Emisiilor</h3>';
    const emissionFactors = {
      carbune: 900,
      hidro: 50,
      nuclear: 12,
      eolian: 10,
      fotovolt: 20,
      biomasa: 150
    };
    let emissionValues = [];
    sources.forEach(source => {
      const total = sourceTotals[source] || 0;
      const emissions = total * (emissionFactors[source] || 0);
      emissionValues.push(parseFloat(emissions.toFixed(2)));
      emissionText += `<p>${source.toUpperCase()}: ${emissions.toFixed(2)} kg CO₂</p>`;
    });
  
    // Calcul 6: Variabilitatea Producției (deviația standard)
    let variabilityText = '<h3>Variabilitatea Producției</h3>';
    function stdDev(arr) {
      const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
      const squareDiffs = arr.map(v => Math.pow(v - avg, 2));
      return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / arr.length);
    }
    let productionVariability = [];
    sources.forEach(source => {
      const arr = csvData.map(row => row[source]).filter(v => typeof v === 'number');
      if (arr.length > 0) {
        const sd = parseFloat(stdDev(arr).toFixed(2));
        productionVariability.push(sd);
        variabilityText += `<p>${source.toUpperCase()} - Deviație standard: ${sd} (indică fluctuațiile producției)</p>`;
      } else {
        productionVariability.push(0);
        variabilityText += `<p>${source.toUpperCase()} - Fără date pentru variabilitate.</p>`;
      }
    });
  
    // Calcul 7: Pierderi în Rețea (presupunem 5%)
    let lossesText = '<h3>Pierderi în Rețea</h3>';
    const lossPercentage = 5;
    const effectiveProduction = totalProductie * (1 - lossPercentage / 100);
    lossesText += `<p>Producție totală: ${totalProductie.toFixed(2)}, Producție efectivă după pierderi (${lossPercentage}%): ${effectiveProduction.toFixed(2)}</p>`;
  
    // Calcul 8: Prețuri și Costuri (cost, venit și marjă)
    let priceText = '<h3>Prețuri și Costuri</h3>';
    const totalCost = totalProductie * averageCost;
    const totalRevenue = totalProductie * sellingPrice;
    const margin = totalRevenue - totalCost;
    priceText += `<p>Cost producție: ${totalCost.toFixed(2)} € (la ${averageCost} €/MWh), Venit: ${totalRevenue.toFixed(2)} € (la ${sellingPrice} €/MWh), Marjă: ${margin.toFixed(2)} €</p>`;
  
    // Calcul 9: Rezerva Strategică (diferența dintre producția maximă și consumul maxim)
    let reserveText = '<h3>Rezerva Strategică</h3>';
    const peakConsum = Math.max(...consumArr);
    const peakProductie = Math.max(...productieArr);
    const reserve = peakProductie - peakConsum;
    reserveText += `<p>Consum maxim: ${peakConsum}, Producție maximă: ${peakProductie}, Rezervă: ${reserve} (indicator al capacității suplimentare în caz de vârf)</p>`;
  
    // Calcul 10: Flexibilitate și Stocare (raportul dintre capacitatea de stocare și energia din surse fluctuante)
    let storageText = '<h3>Flexibilitate și Stocare</h3>';
    const storageCapacity = 1000; // MWh (valoare presupusă)
    const fluctuatingEnergy = (sourceTotals['eolian'] + sourceTotals['fotovolt']);
    const storageRatio = fluctuatingEnergy > 0 ? ((storageCapacity / fluctuatingEnergy) * 100) : 0;
    storageText += `<p>Capacitate de stocare: ${storageCapacity} MWh, Energie surse fluctuante: ${fluctuatingEnergy}, Raport: ${storageRatio.toFixed(2)}% (indicativ pentru integrarea energiei din surse variabile)</p>`;
  
    // Notă privind sursele oficiale
    const noteText = '<p class="text-muted"><small>Notă: Valorile pentru capacități și costuri sunt preluate din surse oficiale online (ex. ENTSO-E, IEA, rapoarte naționale).</small></p>';
  
    // ---------- Construim layout-ul cu rânduri separate pentru fiecare indicator ----------
  
    const finalHtml =
      `<div class="row mb-4">
        <div class="col-md-6">
          ${capacityText}
        </div>
        <div class="col-md-6">
          <canvas id="capacityChart" width="400" height="300"></canvas>
        </div>
      </div>
      <div class="row mb-4">
        <div class="col-md-6">
          ${mixText}
        </div>
        <div class="col-md-6">
          <canvas id="mixChart" width="400" height="300"></canvas>
        </div>
      </div>
      <div class="row mb-4">
        <div class="col-md-6">
          ${efficiencyText}
        </div>
        <div class="col-md-6">
          <!-- Pentru eficiență nu se plotează un grafic separat, dar se poate adăuga un indicator vizual -->
          <canvas id="efficiencyChart" width="400" height="300"></canvas>
        </div>
      </div>
      <div class="row mb-4">
        <div class="col-md-6">
          ${consumptionText}
        </div>
        <div class="col-md-6">
          <canvas id="consumptionChart" width="400" height="300"></canvas>
        </div>
      </div>
      <div class="row mb-4">
        <div class="col-md-6">
          ${emissionText}
        </div>
        <div class="col-md-6">
          <canvas id="emissionChart" width="400" height="300"></canvas>
        </div>
      </div>
      <div class="row mb-4">
        <div class="col-md-6">
          ${variabilityText}
        </div>
        <div class="col-md-6">
          <canvas id="variabilityChart" width="400" height="300"></canvas>
        </div>
      </div>
      <div class="row mb-4">
        <div class="col-md-6">
          ${lossesText}
        </div>
        <div class="col-md-6">
          <!-- Nu se plotează grafic pentru pierderi, dar se poate afișa un grafic simplu -->
          <canvas id="lossChart" width="400" height="300"></canvas>
        </div>
      </div>
      <div class="row mb-4">
        <div class="col-md-6">
          ${priceText}
        </div>
        <div class="col-md-6">
          <canvas id="priceChart" width="400" height="300"></canvas>
        </div>
      </div>
      <div class="row mb-4">
        <div class="col-md-6">
          ${reserveText}
        </div>
        <div class="col-md-6">
          <canvas id="reserveChart" width="400" height="300"></canvas>
        </div>
      </div>
      <div class="row mb-4">
        <div class="col-md-6">
          ${storageText + noteText}
        </div>
        <div class="col-md-6">
          <canvas id="storageChart" width="400" height="300"></canvas>
        </div>
      </div>`;
  
    resultDiv.innerHTML = finalHtml;
  
    // ---------- Plotăm Graficele folosind Chart.js ----------
  
    // 1. Graficul Factorului de Capacitate
    new Chart(document.getElementById('capacityChart').getContext('2d'), {
      type: 'bar',
      data: {
        labels: sources.map(src => src.toUpperCase()),
        datasets: [{
          label: 'Factor (%)',
          data: capacityFactors,
          backgroundColor: 'rgba(255, 99, 132, 0.6)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1
        }]
      },
      options: {
        scales: { y: { beginAtZero: true, max: 100, title: { display: true, text: 'Procent (%)' } } },
        plugins: { title: { display: true, text: 'Factor de Capacitate' } }
      }
    });
  
    // 2. Graficul Mixului Energetic
    new Chart(document.getElementById('mixChart').getContext('2d'), {
      type: 'bar',
      data: {
        labels: sources.map(src => src.toUpperCase()),
        datasets: [{
          label: 'Mix (%)',
          data: energyMixPercentages,
          backgroundColor: [
            'rgba(255, 99, 132, 0.6)',
            'rgba(54, 162, 235, 0.6)',
            'rgba(75, 192, 192, 0.6)',
            'rgba(153, 102, 255, 0.6)',
            'rgba(255, 159, 64, 0.6)',
            'rgba(255, 205, 86, 0.6)'
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 159, 64, 1)',
            'rgba(255, 205, 86, 1)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        scales: { y: { beginAtZero: true, max: 100, title: { display: true, text: 'Procent (%)' } } },
        plugins: { title: { display: true, text: 'Mix Energetic' } }
      }
    });
  
    // 3. Grafic pentru Eficiență Energetică – aici vom afișa un simplu indicator comparativ
    new Chart(document.getElementById('efficiencyChart').getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: ['Eficiență', 'Ineficiență'],
        datasets: [{
          data: [parseFloat(efficiency), 100 - parseFloat(efficiency)],
          backgroundColor: ['rgba(75, 192, 192, 0.6)', 'rgba(255, 99, 132, 0.6)'],
          borderColor: ['rgba(75, 192, 192, 1)', 'rgba(255, 99, 132, 1)'],
          borderWidth: 1
        }]
      },
      options: {
        plugins: { title: { display: true, text: 'Eficiență Energetică' } }
      }
    });
  
    // 4. Graficul Consum vs. Producție (Cerere)
    new Chart(document.getElementById('consumptionChart').getContext('2d'), {
      type: 'bar',
      data: {
        labels: ['Consum Mediu', 'Producție Medie'],
        datasets: [{
          label: 'Valori',
          data: [parseFloat(avgConsumNum.toFixed(2)), parseFloat(avgProductieNum.toFixed(2))],
          backgroundColor: ['rgba(54, 162, 235, 0.6)', 'rgba(255, 159, 64, 0.6)'],
          borderColor: ['rgba(54, 162, 235, 1)', 'rgba(255, 159, 64, 1)'],
          borderWidth: 1
        }]
      },
      options: {
        scales: { y: { beginAtZero: true, title: { display: true, text: 'Valoare' } } },
        plugins: { title: { display: true, text: 'Consum vs. Producție Medie' } }
      }
    });
  
    // 5. Graficul Impactului Emisiilor
    new Chart(document.getElementById('emissionChart').getContext('2d'), {
      type: 'bar',
      data: {
        labels: sources.map(src => src.toUpperCase()),
        datasets: [{
          label: 'Emisii (kg CO₂)',
          data: emissionValues,
          backgroundColor: 'rgba(255, 205, 86, 0.6)',
          borderColor: 'rgba(255, 205, 86, 1)',
          borderWidth: 1
        }]
      },
      options: {
        scales: { y: { beginAtZero: true, title: { display: true, text: 'kg CO₂' } } },
        plugins: { title: { display: true, text: 'Impactul Emisiilor' } }
      }
    });
  
    // 6. Graficul Variabilității Producției
    new Chart(document.getElementById('variabilityChart').getContext('2d'), {
      type: 'bar',
      data: {
        labels: sources.map(src => src.toUpperCase()),
        datasets: [{
          label: 'Deviație Standard',
          data: productionVariability,
          backgroundColor: 'rgba(153, 102, 255, 0.6)',
          borderColor: 'rgba(153, 102, 255, 1)',
          borderWidth: 1
        }]
      },
      options: {
        scales: { y: { beginAtZero: true, title: { display: true, text: 'Unități' } } },
        plugins: { title: { display: true, text: 'Variabilitatea Producției' } }
      }
    });
  
    // 7. Graficul Prețuri și Costuri
    new Chart(document.getElementById('priceChart').getContext('2d'), {
      type: 'bar',
      data: {
        labels: ['Cost Producție (€)', 'Venit (€)', 'Marjă (€)'],
        datasets: [{
          label: 'Valori (€)',
          data: [parseFloat(totalCost.toFixed(2)), parseFloat(totalRevenue.toFixed(2)), parseFloat(margin.toFixed(2))],
          backgroundColor: [
            'rgba(255, 99, 132, 0.6)',
            'rgba(75, 192, 192, 0.6)',
            'rgba(255, 205, 86, 0.6)'
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(255, 205, 86, 1)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        scales: { y: { beginAtZero: true, title: { display: true, text: '€' } } },
        plugins: { title: { display: true, text: 'Prețuri și Costuri' } }
      }
    });
  
    // 8. Graficul Rezervelor Strategice
    new Chart(document.getElementById('reserveChart').getContext('2d'), {
      type: 'bar',
      data: {
        labels: ['Consum Maxim', 'Producție Maximă', 'Rezervă'],
        datasets: [{
          label: 'Valori',
          data: [peakConsum, peakProductie, reserve],
          backgroundColor: [
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 159, 64, 0.6)',
            'rgba(255, 99, 132, 0.6)'
          ],
          borderColor: [
            'rgba(54, 162, 235, 1)',
            'rgba(255, 159, 64, 1)',
            'rgba(255, 99, 132, 1)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        scales: { y: { beginAtZero: true, title: { display: true, text: 'Unități' } } },
        plugins: { title: { display: true, text: 'Rezerva Strategică' } }
      }
    });
  
    // 9. Graficul Flexibilitate și Stocare
    new Chart(document.getElementById('storageChart').getContext('2d'), {
      type: 'bar',
      data: {
        labels: ['Capacitate de Stocare (MWh)', 'Energie Fluctuantă (MWh)'],
        datasets: [{
          label: 'Valori',
          data: [storageCapacity, fluctuatingEnergy],
          backgroundColor: [
            'rgba(75, 192, 192, 0.6)',
            'rgba(153, 102, 255, 0.6)'
          ],
          borderColor: [
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        scales: { y: { beginAtZero: true, title: { display: true, text: 'MWh' } } },
        plugins: { title: { display: true, text: 'Flexibilitate și Stocare' } }
      }
    });
  });
  