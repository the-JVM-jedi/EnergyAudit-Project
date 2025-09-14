/**
 * @file script.js
 * @description Main JavaScript file for the Sustainable Computing Project.
 * It handles logic for both the Audit (calculator) page and the Analysis page.
 */

// ===================================================================
//                 MAIN SCRIPT INITIALIZATION
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
    // This is the "router". It checks which page is active and calls the correct function.
    
    // Check if we are on the Audit (calculator) page.
    if (document.getElementById('device-form')) {
        setupCalculatorPage();
    }
    
    // Check if we are on the Analysis page.
    if (document.getElementById('chart-controls')) {
        setupAnalysisPage();
    }
});


// ===================================================================
//                ANALYSIS PAGE LOGIC
// ===================================================================
/**
 * Initializes all functionality for the Analysis page (`analysis.html`).
 * This function is now at the top level, so it's visible to the event listener.
 */
function setupAnalysisPage() {
    const auditSelect = document.getElementById('audit-select');
    const dynamicControls = document.getElementById('dynamic-controls');
    const chartTypeSelect = document.getElementById('chart-type-select');
    const xAxisSelect = document.getElementById('xaxis-select');
    const yAxisSelect = document.getElementById('yaxis-select');
    const chartInfoMessage = document.getElementById('chart-info-message');
    const ctx = document.getElementById('myChart').getContext('2d');
    
    let myChart = null;
    let currentAuditData = [];

    const categoricalOptions = { "Device Class": "device_class", "Description": "description" };
    const numericalOptions = { 
        "Total Daily kWh": "daily_kwh_total", 
        "Power Rating (Watts)": "power_rating_watts", 
        "Quantity of Items": "quantity", 
        "Hours On Per Day": "hours_per_day" 
    };

    function loadAudits() {
        fetch('backend/get_audits.php')
            .then(response => response.json())
            .then(data => {
                if (data.success && data.audits.length > 0) {
                    auditSelect.innerHTML = '<option value="">-- Select an Audit --</option>';
                    data.audits.forEach(audit => {
                        const date = new Date(audit.audit_date).toLocaleDateString();
                        auditSelect.innerHTML += `<option value="${audit.audit_id}">${audit.audit_name} (${date})</option>`;
                    });
                } else {
                    auditSelect.innerHTML = '<option value="">-- No Audits Found --</option>';
                    chartInfoMessage.textContent = "No audits found in the database.";
                }
            })
            .catch(error => {
                console.error("Failed to load audits:", error);
                auditSelect.innerHTML = '<option value="">-- Error Loading Audits --</option>';
            });
    }

    function fetchAuditDetails(auditId) {
        if (!auditId) {
            currentAuditData = [];
            dynamicControls.disabled = true;
            if (myChart) myChart.destroy();
            chartInfoMessage.textContent = "Please select an audit to generate a chart.";
            chartInfoMessage.style.display = 'block';
            return;
        }

        chartInfoMessage.textContent = "Loading chart data...";
        chartInfoMessage.style.display = 'block';

        fetch(`backend/get_audit_details.php?id=${auditId}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    currentAuditData = data.devices;
                    populateAxisSelectors();
                    dynamicControls.disabled = false;
                    generateChart();
                } else {
                    alert('Error: ' + data.message);
                }
            })
            .catch(error => console.error("Failed to fetch audit details:", error));
    }
    
    function populateAxisSelectors() {
        xAxisSelect.innerHTML = '';
        yAxisSelect.innerHTML = '';
        for (const key in categoricalOptions) {
            xAxisSelect.innerHTML += `<option value="${categoricalOptions[key]}">${key}</option>`;
        }
        for (const key in numericalOptions) {
            yAxisSelect.innerHTML += `<option value="${numericalOptions[key]}">${key}</option>`;
        }
    }

    function generateChart() {
        if (currentAuditData.length === 0) return;
        chartInfoMessage.style.display = 'none';
        const chartType = chartTypeSelect.value;
        const xAxisKey = xAxisSelect.value;
        const yAxisKey = yAxisSelect.value;
        const dataMap = new Map();
        currentAuditData.forEach(device => {
            const key = device[xAxisKey];
            const value = device[yAxisKey];
            dataMap.has(key) ? dataMap.set(key, dataMap.get(key) + value) : dataMap.set(key, value);
        });
        const labels = [...dataMap.keys()];
        const data = [...dataMap.values()];
        if (myChart) myChart.destroy();
        myChart = new Chart(ctx, { type: chartType, data: { labels: labels, datasets: [{ label: yAxisSelect.options[yAxisSelect.selectedIndex].text, data: data, backgroundColor: ['#00796b', '#ff8f00', '#1565c0', '#d32f2f', '#7b1fa2', '#0097a7', '#fbc02d', '#388e3c'], borderColor: '#333', borderWidth: 1 }] }, options: getChartOptions() });
    }
    
    function getChartOptions() {
        const title = `${yAxisSelect.options[yAxisSelect.selectedIndex].text} by ${xAxisSelect.options[xAxisSelect.selectedIndex].text}`;
        const options = { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: title, font: { size: 18 } }, legend: { position: 'top' } } };
        if (['bar', 'line'].includes(chartTypeSelect.value)) { options.scales = { y: { beginAtZero: true } }; }
        return options;
    }

    auditSelect.addEventListener('change', (e) => fetchAuditDetails(e.target.value));
    [chartTypeSelect, xAxisSelect, yAxisSelect].forEach(el => {
        el.addEventListener('change', generateChart);
    });

    loadAudits();
}


// ===================================================================
//                AUDIT (CALCULATOR) PAGE LOGIC
// ===================================================================
/**
 * Initializes all functionality for the Audit page (`calculator.html`).
 * This function is also at the top level.
 */
function setupCalculatorPage() {
    // --- ELEMENT SELECTORS ---
    const deviceForm = document.getElementById('device-form');
    const deviceClassSelect = document.getElementById('device-class');
    const addClassBtn = document.getElementById('add-class-btn');
    const deviceDescInput = document.getElementById('device-desc');
    const devicePowerInput = document.getElementById('device-power');
    const deviceQtyInput = document.getElementById('device-qty');
    const deviceTimeInput = document.getElementById('device-time');
    const deviceListBody = document.getElementById('device-list-body');
    const emptyListMsg = document.getElementById('empty-list-msg');
    const calculateTotalBtn = document.getElementById('calculate-total-btn');
    const saveToDbBtn = document.getElementById('save-to-db-btn'); 
    const resultsContainer = document.getElementById('results-container');
    const totalKwhEl = document.getElementById('total-kwh');
    const totalCo2El = document.getElementById('total-co2');
    
    // --- EVENT LISTENERS ---
    addClassBtn.addEventListener('click', () => {
        const newClassName = prompt("Enter a new device class name (e.g., 'Projector'):");
        if (newClassName && newClassName.trim() !== '') {
            const newOption = document.createElement('option');
            newOption.value = newClassName.trim();
            newOption.textContent = newClassName.trim();
            deviceClassSelect.appendChild(newOption);
            newOption.selected = true;
        }
    });

    deviceForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const deviceClass = deviceClassSelect.value;
        const description = deviceDescInput.value || 'N/A';
        const power = parseFloat(devicePowerInput.value);
        const quantity = parseInt(deviceQtyInput.value);
        const time = parseFloat(deviceTimeInput.value);
        if (isNaN(power) || isNaN(quantity) || isNaN(time) || power <= 0 || quantity <= 0 || time <= 0) {
            alert('Please enter valid, positive numbers for Power, Quantity, and Time.');
            return;
        }
        const dailyKwh = (power * quantity * time) / 1000;
        const newRow = document.createElement('tr');
        newRow.setAttribute('data-kwh', dailyKwh.toFixed(4));
        newRow.innerHTML = `<td data-col="class">${deviceClass}</td><td data-col="desc">${description}</td><td data-col="power">${power}</td><td data-col="qty">${quantity}</td><td data-col="time">${time}</td><td data-col="kwh-display">${dailyKwh.toFixed(2)} kWh</td><td><button class="remove-btn">Remove</button></td>`;
        deviceListBody.appendChild(newRow);
        emptyListMsg.style.display = 'none';
        deviceForm.reset();
        deviceDescInput.focus();
    });

    deviceListBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-btn')) {
            e.target.closest('tr').remove();
            if (deviceListBody.children.length === 0) {
                emptyListMsg.style.display = 'block';
            }
        }
    });

    calculateTotalBtn.addEventListener('click', () => {
        let grandTotalKwh = 0;
        const allRows = deviceListBody.querySelectorAll('tr');
        if (allRows.length === 0) {
            alert('Your device list is empty.');
            return;
        }
        allRows.forEach(row => {
            grandTotalKwh += parseFloat(row.dataset.kwh);
        });
        const carbonFactor = 0.475;
        const grandTotalCo2 = grandTotalKwh * carbonFactor;
        totalKwhEl.textContent = `${grandTotalKwh.toFixed(2)} kWh`;
        totalCo2El.textContent = `${grandTotalCo2.toFixed(2)} kg CO₂e`;
        resultsContainer.classList.remove('hidden');
    });

    saveToDbBtn.addEventListener('click', () => {
        const allRows = deviceListBody.querySelectorAll('tr');
        if (allRows.length === 0) {
            alert('Your device list is empty.');
            return;
        }
        const auditName = prompt("Please enter a name for this audit session:");
        if (!auditName || auditName.trim() === '') {
            alert('An audit name is required.');
            return;
        }
        const allDevices = [];
        allRows.forEach(row => {
            allDevices.push({
                class:       row.querySelector('[data-col="class"]').textContent,
                description: row.querySelector('[data-col="desc"]').textContent,
                power:       parseFloat(row.querySelector('[data-col="power"]').textContent),
                quantity:    parseInt(row.querySelector('[data-col="qty"]').textContent),
                time:        parseFloat(row.querySelector('[data-col="time"]').textContent),
                dailyKwh:    parseFloat(row.dataset.kwh)
            });
        });
        const dataToSend = { auditName: auditName.trim(), notes: "Audit saved from web calculator.", devices: allDevices };
        fetch('backend/save_audit.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dataToSend) })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                alert(result.message);
                deviceListBody.innerHTML = '';
                emptyListMsg.style.display = 'block';
                resultsContainer.classList.add('hidden');
            } else {
                alert('Error saving audit: ' .concat(result.message));
            }
        })
        .catch(error => {
            console.error('Fetch Error:', error);
            alert('A network error occurred.');
        });
    });
}