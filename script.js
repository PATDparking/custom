let currentField = '';
let currentAction = '';

// Funkce pro otevření modalu
function openModal(fieldId, action) {
    currentField = fieldId;
    currentAction = action;
    
    document.getElementById("modal").style.display = "block";
    document.getElementById("modal-title").innerText = action === 'add' ? 'Vložit počet kusů' : 'Vybrat počet kusů';
}

// Funkce pro zavření modalu
function closeModal() {
    document.getElementById("modal").style.display = "none";
    document.getElementById("modal-input").value = ''; // Vyčistit input
}

function submitModal() {
    const value = parseInt(document.getElementById("modal-input").value) || 0;
    const inputField = document.getElementById(currentField);
    let currentValue = parseInt(inputField.value) || 0;

    if (currentAction === 'add') {
        currentValue += value;
        saveToDepositHistory(currentField, value); // Uložení do historie vkladů
    } else if (currentAction === 'subtract') {
        currentValue = Math.max(currentValue - value, 0); // Nenechat jít do mínusu
        saveToWithdrawalHistory(currentField, value); // Uložení do historie výběrů
    }

    inputField.value = currentValue;
    
    calculateTotal(); // Přepočítat celkovou částku
    
    showConfirmation("Operace byla úspěšná!");

    closeModal(); // Zavřít modal
}

function showConfirmation(message) {
    const confirmationBox = document.createElement('div');
    confirmationBox.classList.add('confirmation');
    confirmationBox.innerHTML = `
        ${message}
        <div class="loading-bar"></div>
    `;
    document.body.appendChild(confirmationBox);
    
    setTimeout(() => {
        confirmationBox.remove();
    }, 2000); // Zpráva zmizí po 2 sekundách
}

function saveInputValuesToFirebase() {
    const inputs = {
        nom100: document.getElementById("nom100").value || 0,
        nom200: document.getElementById("nom200").value || 0,
        nom500: document.getElementById("nom500").value || 0,
        nom1000: document.getElementById("nom1000").value || 0,
        nom2000: document.getElementById("nom2000").value || 0,
        nom5000: document.getElementById("nom5000").value || 0,
        nom1: document.getElementById("nom1").value || 0,
        nom2: document.getElementById("nom2").value || 0,
        nom5: document.getElementById("nom5").value || 0,
        nom10: document.getElementById("nom10").value || 0,
        nom20: document.getElementById("nom20").value || 0,
        nom50: document.getElementById("nom50").value || 0,
        bags: document.getElementById("bags").value || 0,
        username: document.getElementById("username").value || "Neznámé",
        totalAmount: document.getElementById("totalAmount").innerText || 0
    };

    firebase.database().ref('trezorData').set(inputs);
}

function loadInputValuesFromFirebase() {
    firebase.database().ref('trezorData').once('value').then((snapshot) => {
        const data = snapshot.val();
        if (data) {
            document.getElementById("nom100").value = data.nom100 || 0;
            document.getElementById("nom200").value = data.nom200 || 0;
            document.getElementById("nom500").value = data.nom500 || 0;
            document.getElementById("nom1000").value = data.nom1000 || 0;
            document.getElementById("nom2000").value = data.nom2000 || 0;
            document.getElementById("nom5000").value = data.nom5000 || 0;
            document.getElementById("nom1").value = data.nom1 || 0;
            document.getElementById("nom2").value = data.nom2 || 0;
            document.getElementById("nom5").value = data.nom5 || 0;
            document.getElementById("nom10").value = data.nom10 || 0;
            document.getElementById("nom20").value = data.nom20 || 0;
            document.getElementById("nom50").value = data.nom50 || 0;
            document.getElementById("bags").value = data.bags || 0;
            document.getElementById("username").value = data.username || "Neznámé";
            document.getElementById("totalAmount").innerText = data.totalAmount || 0;
            updateTotalsOnLoad();
            displayCalculationHistory();
        }
    });
}

// Funkce pro aktualizaci celkových částek při načtení stránky
function updateTotalsOnLoad() {
    const inputs = [
        "nom100", "nom200", "nom500", "nom1000", "nom2000", "nom5000",
        "nom1", "nom2", "nom5", "nom10", "nom20", "nom50"
    ];

    inputs.forEach(id => {
        const value = parseInt(document.getElementById(id).value) || 0;
        let totalField = document.getElementById(`total${id.slice(3)}`);
        let multiplier = parseInt(id.slice(3));
        totalField.innerText = value * multiplier;
    });
}

function saveToDepositHistory(fieldId, amount) {
    let depositRef = firebase.database().ref(`${fieldId}DepositHistory`);
    depositRef.push({
        amount: amount,
        date: new Date().toLocaleString()
    });
    displayCombinedHistory(fieldId);
}

function saveToWithdrawalHistory(fieldId, amount) {
    let withdrawalRef = firebase.database().ref(`${fieldId}WithdrawalHistory`);
    withdrawalRef.push({
        amount: amount,
        date: new Date().toLocaleString()
    });
    displayCombinedHistory(fieldId);
}

function displayCombinedHistory(fieldId) {
    const historyContainer = document.getElementById(`history${fieldId.slice(3)}`);
    const depositRef = firebase.database().ref(`${fieldId}DepositHistory`);
    const withdrawalRef = firebase.database().ref(`${fieldId}WithdrawalHistory`);
    
    depositRef.once('value').then(depositSnapshot => {
        const depositHistory = depositSnapshot.val() || {};

        withdrawalRef.once('value').then(withdrawalSnapshot => {
            const withdrawalHistory = withdrawalSnapshot.val() || {};
            historyContainer.innerHTML = ""; // Vyčistit předchozí historii

            const combinedHistory = [];

            for (let key in depositHistory) {
                combinedHistory.push({
                    type: 'Vloženo',
                    amount: depositHistory[key].amount,
                    date: depositHistory[key].date,
                    key: key,
                    historyType: 'DepositHistory'
                });
            }

            for (let key in withdrawalHistory) {
                combinedHistory.push({
                    type: 'Vybráno',
                    amount: withdrawalHistory[key].amount,
                    date: withdrawalHistory[key].date,
                    key: key,
                    historyType: 'WithdrawalHistory'
                });
            }

            combinedHistory.sort((a, b) => new Date(a.date) - new Date(b.date));

            combinedHistory.forEach(item => {
                const entry = document.createElement("div");
                entry.classList.add("history-entry");
                entry.innerHTML = `
                    ${item.type}: ${item.amount} KS, Datum: ${item.date}
                    <button onclick="deleteHistoryEntry('${fieldId}', '${item.key}', '${item.historyType}')">Smazat</button>
                `;
                historyContainer.appendChild(entry);
            });
        });
    });
}

function deleteHistoryEntry(fieldId, key, historyType) {
    firebase.database().ref(`${fieldId}${historyType}/${key}`).remove().then(() => {
        displayCombinedHistory(fieldId);
    });
}

    

function calculateTotal() {
    const nom100 = parseInt(document.getElementById("nom100").value) || 0;
    const nom200 = parseInt(document.getElementById("nom200").value) || 0;
    const nom500 = parseInt(document.getElementById("nom500").value) || 0;
    const nom1000 = parseInt(document.getElementById("nom1000").value) || 0;
    const nom2000 = parseInt(document.getElementById("nom2000").value) || 0;
    const nom5000 = parseInt(document.getElementById("nom5000").value) || 0;

    const nom1 = parseInt(document.getElementById("nom1").value) || 0;
    const nom2 = parseInt(document.getElementById("nom2").value) || 0;
    const nom5 = parseInt(document.getElementById("nom5").value) || 0;
    const nom10 = parseInt(document.getElementById("nom10").value) || 0;
    const nom20 = parseInt(document.getElementById("nom20").value) || 0;
    const nom50 = parseInt(document.getElementById("nom50").value) || 0;

    const total100 = nom100 * 100;
    const total200 = nom200 * 200;
    const total500 = nom500 * 500;
    const total1000 = nom1000 * 1000;
    const total2000 = nom2000 * 2000;
    const total5000 = nom5000 * 5000;

    const total1 = nom1 * 1;
    const total2 = nom2 * 2;
    const total5 = nom5 * 5;
    const total10 = nom10 * 10;
    const total20 = nom20 * 20;
    const total50 = nom50 * 50;

    document.getElementById("total100").innerText = total100;
    document.getElementById("total200").innerText = total200;
    document.getElementById("total500").innerText = total500;
    document.getElementById("total1000").innerText = total1000;
    document.getElementById("total2000").innerText = total2000;
    document.getElementById("total5000").innerText = total5000;

    document.getElementById("total1").innerText = total1;
    document.getElementById("total2").innerText = total2;
    document.getElementById("total5").innerText = total5;
    document.getElementById("total10").innerText = total10;
    document.getElementById("total20").innerText = total20;
    document.getElementById("total50").innerText = total50;

    const total = total100 + total200 + total500 + total1000 + total2000 + total5000 +
                  total1 + total2 + total5 + total10 + total20 + total50;

    document.getElementById("totalAmount").innerText = total;

// Zobrazení počtu pytlů
    const bags = parseInt(document.getElementById("bags").value) || 0;
    document.getElementById("totalBags").innerText = bags.toLocaleString() + " ";



    saveInputValuesToFirebase();
    firebase.database().ref('trezorData/totalAmount').set(total);
}

document.getElementById("bags").addEventListener("input", function() {
    const value = this.value || 0; // Získání hodnoty z input pole
    firebase.database().ref('trezorData/bags').set(value); // Uložení hodnoty do Firebase

    calculateTotal(); // Aktualizace celkové částky
});



// Funkce volaná po kliknutí na tlačítko Spočítat
function calculateAndSave() {
    calculateTotal();

    const username = document.getElementById("username").value || "Neznámé";

    const data = {
        nom100: parseInt(document.getElementById("nom100").value) || 0,
        nom200: parseInt(document.getElementById("nom200").value) || 0,
        nom500: parseInt(document.getElementById("nom500").value) || 0,
        nom1000: parseInt(document.getElementById("nom1000").value) || 0,
        nom2000: parseInt(document.getElementById("nom2000").value) || 0,
        nom5000: parseInt(document.getElementById("nom5000").value) || 0,
        nom1: parseInt(document.getElementById("nom1").value) || 0,
        nom2: parseInt(document.getElementById("nom2").value) || 0,
        nom5: parseInt(document.getElementById("nom5").value) || 0,
        nom10: parseInt(document.getElementById("nom10").value) || 0,
        nom20: parseInt(document.getElementById("nom20").value) || 0,
        nom50: parseInt(document.getElementById("nom50").value) || 0
    };

    const total = parseInt(document.getElementById("totalAmount").innerText) || 0;

    saveInputValuesToFirebase();
    firebase.database().ref('trezorHistory').push({
        username: username,
        data: data,
        total: total,
        date: new Date().toLocaleString()
    }).then(() => {
        displayCalculationHistory();
    });
}

// Inicializační funkce po načtení stránky
window.onload = function() {
    loadInputValuesFromFirebase();
    updateTotalsOnLoad();
    displayCombinedHistory('nom100');
    const totalAmount = localStorage.getItem("totalAmount") || 0;
    firebase.database().ref('trezorData/totalAmount').once('value').then(snapshot => {
        const totalAmount = snapshot.val() || 0;
        document.getElementById("totalAmount").innerText = totalAmount;
    });

    // Zobrazit historii pro každé pole
    const fields = [
        "nom100", "nom200", "nom500", "nom1000", "nom2000", "nom5000",
        "nom1", "nom2", "nom5", "nom10", "nom20", "nom50"
    ];

    fields.forEach(fieldId => {
        displayCombinedHistory(fieldId);
        displayCombinedHistory(fieldId);
    });

    // Přidat event listener pro automatickou aktualizaci celkových částek
    updateTotalOnChange();
};

// Funkce pro aktualizaci celkové částky při změně hodnoty v polích
function updateTotalOnChange() {
    const inputs = [
        "nom100", "nom200", "nom500", "nom1000", "nom2000", "nom5000",
        "nom1", "nom2", "nom5", "nom10", "nom20", "nom50"
    ];
    
    inputs.forEach(id => {
        document.getElementById(id).addEventListener("input", () => {
            calculateTotal();
            saveInputValuesToFirebase();
        });
    });
}

function displayCalculationHistory() {
    const historyContainer = document.getElementById("history");
    const historyRef = firebase.database().ref('trezorHistory');
    
    historyRef.once('value').then(snapshot => {
        const history = snapshot.val() || {};
        historyContainer.innerHTML = ""; // Vyčistit předchozí historii

        for (let key in history) {
            const item = history[key];
            const entry = document.createElement("div");
            entry.classList.add("history-entry");
            const nominals = JSON.stringify(item.data, null, 2).replace(/"/g, '');
            entry.innerHTML = `
                <strong>Datum:</strong> ${item.date}<br>
                <strong>Jméno:</strong> ${item.username}<br>
                <strong>Nominály:</strong><pre>${nominals}</pre><br>
                <strong>Celkem:</strong> ${item.total} Kč<br>
                <button onclick="deleteCalculationHistoryEntry('${key}')">Smazat</button>
            `;
            historyContainer.appendChild(entry);
        }
    });
}

function deleteCalculationHistoryEntry(key) {
    firebase.database().ref(`trezorHistory/${key}`).remove().then(() => {
        displayCalculationHistory();
    });
}
