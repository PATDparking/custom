// Pole s čísly stojanů
const stands = [91, 93, 95, 119, 83, 85, 87, 89, 65, 67, 103, 105, 69];

// Funkce pro přepínání stavu stojanu
function toggleOperationalStatus(standNumber) {
    firebase.database().ref(`stand-${standNumber}-status`).once('value').then((snapshot) => {
        const currentStatus = snapshot.val() || 'v provozu';
        const newStatus = currentStatus === 'v provozu' ? 'mimo provoz' : 'v provozu';

        firebase.database().ref(`stand-${standNumber}-status`).set(newStatus);
        updateOperationalStatus(standNumber, newStatus);

        // Změna barvy kontejneru podle stavu
        const standDiv = document.getElementById(`stand-${standNumber}`);
        if (newStatus === 'mimo provoz') {
            standDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.2)'; // Červená barva
        } else {
            standDiv.style.backgroundColor = ''; // Obnovení výchozí barvy
        }
    });
}

// Funkce pro aktualizaci zobrazení stavu
function updateOperationalStatus(standNumber, status) {
    const toggleButton = document.getElementById(`toggle-${standNumber}`);
    const statusDisplay = document.getElementById(`operational-status-${standNumber}`);
    
    if (status === 'v provozu') {
        toggleButton.textContent = 'Vypnout';
        statusDisplay.textContent = 'V provozu';
        statusDisplay.style.color = 'green'; // Zelená pro provoz
    } else {
        toggleButton.textContent = 'Zapnout';
        statusDisplay.textContent = 'Mimo provoz';
        statusDisplay.style.color = 'red'; // Červená pro mimo provoz
    }
}

// Funkce pro vytvoření HTML struktury pro každý stojan
function createStand(standNumber) {
    const standDiv = document.createElement('div');
    standDiv.className = 'stand';
    standDiv.id = `stand-${standNumber}`;
    standDiv.innerHTML = `
        <h2>${standNumber}</h2>
        <button class="edit-btn" onclick="toggleEdit(${standNumber})">Změnit</button>
        <div class="slot-container">
            <!-- Slot 1 -->
            <div class="slot">
                <label for="slider-${standNumber}-1">LEVÁ</label>
                <div class="slider-controls">
                    <button class="arrow" onclick="changeValue(${standNumber}, 1, -2.5)">&#9664;</button>
                    <input type="range" id="slider-${standNumber}-1" class="slider" min="0" max="100" value="0" step="2.5" disabled onchange="updateStatus(${standNumber}, 1)" oninput="saveValue(${standNumber}, 1)">
                    <button class="arrow" onclick="changeValue(${standNumber}, 1, 2.5)">&#9654;</button>
                </div>
                <span id="status-${standNumber}-1" class="status">0%</span>
            </div>
            <!-- Slot 2 -->
            <div class="slot">
                <label for="slider-${standNumber}-2">PRAVÁ</label>
                <div class="slider-controls">
                    <button class="arrow" onclick="changeValue(${standNumber}, 2, -2.5)">&#9664;</button>
                    <input type="range" id="slider-${standNumber}-2" class="slider" min="0" max="100" value="0" step="2.5" disabled onchange="updateStatus(${standNumber}, 2)" oninput="saveValue(${standNumber}, 2)">
                    <button class="arrow" onclick="changeValue(${standNumber}, 2, 2.5)">&#9654;</button>
                </div>
                <span id="status-${standNumber}-2" class="status">0%</span>
            </div>
        </div>
        
        <button id="toggle-${standNumber}" class="toggle-button" onclick="toggleOperationalStatus(${standNumber})">Vypnout</button>
        <span id="operational-status-${standNumber}" class="operational-status">Mimo provoz</span>
    `;

    return standDiv;
}

function roundValue(value) {
    if (value <= 10) {
        return Math.round(value * 4) / 4; // zaokroulení na 0.25
    }
    return Math.round(value / 10) * 10; // zaokroulení na celé desítky
}

function updateStatus(standNumber, slotNumber) {
    const slider = document.getElementById(`slider-${standNumber}-${slotNumber}`);
    const status = document.getElementById(`status-${standNumber}-${slotNumber}`);
    const value = parseFloat(slider.value);

    // Zaokroulení hodnoty
    const roundedValue = roundValue(value);
    
    // Zobrazení zaokroulené hodnoty
    status.textContent = `${roundedValue}%`;

    // Barva podle hodnoty
    if (roundedValue <= 10) {
        status.style.color = 'red';
    } else if (roundedValue <= 50) {
        status.style.color = 'orange';
    } else {
        status.style.color = 'green';
    }

    // Dynamické barvení posuvníku
    slider.style.background = `linear-gradient(to right, #007BFF ${roundedValue}%, #ddd ${roundedValue}%)`;
}

// Funkce pro ukládání hodnot posuvníků do Firebase
function saveValue(standNumber, slotNumber) {
    const slider = document.getElementById(`slider-${standNumber}-${slotNumber}`);
    firebase.database().ref(`stand-${standNumber}-slot-${slotNumber}`).set(slider.value);
}

// Funkce pro přepínání uzamčení/odemčení posuvníků a šipek
function toggleEdit(standNumber) {
    const slider1 = document.getElementById(`slider-${standNumber}-1`);
    const slider2 = document.getElementById(`slider-${standNumber}-2`);
    const button = document.querySelector(`#stand-${standNumber} .edit-btn`);

    if (!slider1 || !slider2 || !button) {
        console.error(`One of the elements (slider1, slider2, button) for stand ${standNumber} was not found.`);
        return;
    }

    // Výběr šipek pomocí querySelectorAll, aby byly správně vybrány
    const arrows = document.querySelectorAll(`#stand-${standNumber} .arrow`);

    if (slider1.disabled && slider2.disabled) {
        // Odemknutí posuvníků a šipek
        slider1.disabled = false;
        slider2.disabled = false;

        arrows.forEach(arrow => {
            arrow.disabled = false;
        });

        button.textContent = 'Uložit';
    } else {
        // Zamknutí posuvníků a šipek
        slider1.disabled = true;
        slider2.disabled = true;

        arrows.forEach(arrow => {
            arrow.disabled = true;
        });

        button.textContent = 'Změnit';
        saveValue(standNumber, 1);
        saveValue(standNumber, 2);
    }
}

// Funkce pro změnu hodnoty posuvníku přes šipky
function changeValue(standNumber, slotNumber, change) {
    const slider = document.getElementById(`slider-${standNumber}-${slotNumber}`);
    let newValue = parseFloat(slider.value) + change;
    
    // Pokud je posuvník zamčený, nepokračuj
    if (slider.disabled) {
        return;
    }

    // Zajistit, že hodnota je v rozsahu 0-100
    newValue = Math.max(0, Math.min(100, newValue));

    slider.value = newValue;
    updateStatus(standNumber, slotNumber);
    saveValue(standNumber, slotNumber);
}

// Funkce pro načtení hodnot z Firebase při načtení stránky
function loadValues() {
    stands.forEach(standNumber => {
        for (let i = 1; i <= 2; i++) {
            firebase.database().ref(`stand-${standNumber}-slot-${i}`).once('value').then((snapshot) => {
                const value = snapshot.val() || 0;
                document.getElementById(`slider-${standNumber}-${i}`).value = value;
                updateStatus(standNumber, i);
                document.getElementById(`slider-${standNumber}-${i}`).disabled = true; // Zamknutí posuvníků
            });
        }

        firebase.database().ref(`stand-${standNumber}-status`).once('value').then((snapshot) => {
            const operationalStatus = snapshot.val() || 'v provozu';
            updateOperationalStatus(standNumber, operationalStatus);

            // Nastavení barvy kontejneru podle stavu
            const standDiv = document.getElementById(`stand-${standNumber}`);
            if (operationalStatus === 'mimo provoz') {
                standDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.2)'; // Červená barva
            } else {
                standDiv.style.backgroundColor = ''; // Obnovení výchozí barvy
            }
        });
    });
}

// Generování všech stojanů
const standsContainer = document.getElementById('standsContainer');
stands.forEach(standNumber => {
    const stand = createStand(standNumber);
    standsContainer.appendChild(stand);
});

// Načtení uložených hodnot z localStorage při načtení stránky
window.onload = function() {
    loadValues();
};