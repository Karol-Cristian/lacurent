document.addEventListener('DOMContentLoaded', function() {
  // Variabilă globală pentru stocarea datelor CSV
  window.csvData = [];

  // Atasăm event listener pentru input-ul de fișier (upload manual)
  const fileInput = document.getElementById('fileInput');
  fileInput.addEventListener('change', handleFileSelect);

  // Încărcăm automat CSV-ul din folderul data dacă nu există deja în localStorage
  const storedData = localStorage.getItem('csvData');
  if (!storedData) {
    autoLoadCSV();
  } else {
    // Dacă există, setăm csvData global și actualizăm graficele
    window.csvData = JSON.parse(storedData);
    updateCharts(window.csvData);
  }
});

function autoLoadCSV() {
  // URL-ul către fișierul din folderul data
  const csvUrl = 'data/Ianuarie 2025.csv';
  fetch(csvUrl)
    .then(response => {
      if (!response.ok) {
        throw new Error("Eroare la încărcarea fișierului CSV automat.");
      }
      return response.text();
    })
    .then(csvText => {
      Papa.parse(csvText, {
        header: true,
        dynamicTyping: true,
        complete: function(results) {
          if (results && results.data && results.data.length > 0) {
            window.csvData = results.data;
            console.log("CSV (auto) încărcat:", window.csvData);
            localStorage.setItem('csvData', JSON.stringify(window.csvData));
            updateCharts(window.csvData);
          } else {
            console.error("CSV-ul automat a fost încărcat, dar nu conține date.");
          }
        },
        error: function(error) {
          console.error("Eroare la parsarea CSV automat:", error);
        }
      });
    })
    .catch(error => {
      console.error("Eroare la fetch-ul CSV:", error);
    });
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) {
    console.error("Niciun fișier selectat.");
    return;
  }
  
  Papa.parse(file, {
    header: true,
    dynamicTyping: true,
    complete: function(results) {
      if (results && results.data && results.data.length > 0) {
        window.csvData = results.data;
        console.log("CSV încărcat manual:", window.csvData);
        localStorage.setItem('csvData', JSON.stringify(window.csvData));
        updateCharts(window.csvData);
      } else {
        console.error("Fișierul CSV încărcat manual nu conține date.");
      }
    },
    error: function(error) {
      console.error("Eroare la parsarea CSV:", error);
    }
  });
}

function updateCharts(data) {
  const dates = data.map(row => row.date);

  // Exemplu pentru graficul de producție pe surse:
  const carbune  = data.map(row => row.carbune);
  const hidro    = data.map(row => row.hidro);
  const nuclear  = data.map(row => row.nuclear);
  const eolian   = data.map(row => row.eolian);
  const fotovolt = data.map(row => row.fotovolt);
  const biomasa  = data.map(row => row.biomasa);

  const prodCtx = document.getElementById('phaseShiftChart').getContext('2d');
  if (window.productionChart) window.productionChart.destroy();
  window.productionChart = new Chart(prodCtx, {
    type: 'line',
    data: {
      labels: dates,
      datasets: [
        {
          label: 'Carbune',
          data: carbune,
          borderColor: 'rgba(255,99,132,1)',
          backgroundColor: 'rgba(255,99,132,0.2)',
          fill: false,
          tension: 0.1,
          borderWidth: 0.5
        },
        {
          label: 'Hidro',
          data: hidro,
          borderColor: 'rgba(54,162,235,1)',
          backgroundColor: 'rgba(54,162,235,0.2)',
          fill: false,
          tension: 0.1,
          borderWidth: 0.5
        },
        {
          label: 'Nuclear',
          data: nuclear,
          borderColor: 'rgba(75,192,192,1)',
          backgroundColor: 'rgba(75,192,192,0.2)',
          fill: false,
          tension: 0.1,
          borderWidth: 0.5
        },
        {
          label: 'Eolian',
          data: eolian,
          borderColor: 'rgba(153,102,255,1)',
          backgroundColor: 'rgba(153,102,255,0.2)',
          fill: false,
          tension: 0.1,
          borderWidth: 0.5
        },
        {
          label: 'Fotovolt',
          data: fotovolt,
          borderColor: 'rgba(255,159,64,1)',
          backgroundColor: 'rgba(255,159,64,0.2)',
          fill: false,
          tension: 0.1,
          borderWidth: 0.5
        },
        {
          label: 'Biomasa',
          data: biomasa,
          borderColor: 'rgba(255,205,86,1)',
          backgroundColor: 'rgba(255,205,86,0.2)',
          fill: false,
          tension: 0.1,
          borderWidth: 0.5
        }
      ]
    },
    options: {
      scales: {
        x: { title: { display: true, text: 'Data și oră' } },
        y: { title: { display: true, text: 'Valoare producție' }, beginAtZero: true }
      },
      plugins: {
        title: { display: true, text: 'Producție pe surse' }
      }
    }
  });
  
  // Graficul Consum vs. Sold
  const consArr = data.map(row => row.consum);
  const soldArr = data.map(row => row.sold);
  const consCtx = document.getElementById('cosFiChart').getContext('2d');
  if (window.consumptionChart) window.consumptionChart.destroy();
  window.consumptionChart = new Chart(consCtx, {
    type: 'line',
    data: {
      labels: dates,
      datasets: [
        {
          label: 'Consum',
          data: consArr,
          borderColor: 'rgba(0,123,255,1)',
          backgroundColor: 'rgba(0,123,255,0.2)',
          fill: false,
          tension: 0.1,
          borderWidth: 0.5
        },
        {
          label: 'Sold',
          data: soldArr,
          borderColor: 'rgba(220,53,69,1)',
          backgroundColor: 'rgba(220,53,69,0.2)',
          fill: false,
          tension: 0.1,
          borderWidth: 0.5
        }
      ]
    },
    options: {
      scales: {
        x: { title: { display: true, text: 'Data și oră' } },
        y: { title: { display: true, text: 'Valoare' }, beginAtZero: true }
      },
      plugins: {
        title: { display: true, text: 'Consum vs Sold' }
      }
    }
  });
  
  // Graficul Producție Totală
  const prodTotalCtx = document.getElementById('lambdaChart').getContext('2d');
  if (window.totalProductionChart) window.totalProductionChart.destroy();
  window.totalProductionChart = new Chart(prodTotalCtx, {
    type: 'line',
    data: {
      labels: dates,
      datasets: [
        {
          label: 'Producție Totală',
          data: data.map(row => row.productie),
          borderColor: 'rgba(40,167,69,1)',
          backgroundColor: 'rgba(40,167,69,0.2)',
          fill: false,
          tension: 0.1,
          borderWidth: 0.5
        }
      ]
    },
    options: {
      scales: {
        x: { title: { display: true, text: 'Data și oră' } },
        y: { title: { display: true, text: 'Valoare producție totală' }, beginAtZero: true }
      },
      plugins: {
        title: { display: true, text: 'Producție Totală' }
      }
    }
  });
}
