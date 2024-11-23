let isAdvancedLaserMode = false;
function showPasswordModal() {
    // Показываем модальное окно
    if (!isAdvancedLaserMode && isConnected) {
        document.getElementById("passwordModal").style.display = "block";
    }
}

function checkPassword() {
    const password = document.getElementById("passwordInput").value;
    const correctPassword = "Laser"; // Установите ваш пароль

    if (password === correctPassword) {
        // Закрываем модальное окно и переходим на страницу настроек
        closePasswordModal();
        showAdvancedLaserMode();
    } else {
        alert("Неверный пароль!");
    }
}

function closePasswordModal() {
    // Закрываем модальное окно и очищаем поле ввода
    document.getElementById("passwordModal").style.display = "none";
    document.getElementById("passwordInput").value = "";
}
function showAdvancedLaserMode() {
    // Показываем модальное окно
    // updatePowValue("10");
    // readPortUntilCR();
    // updateFreqValue(freq_min);
    // readPortUntilCR();

    // readRS232 ("48");
    // const st_pul_dur = readPortUntilCR();
    // console.log(st_pul_dur);
    // document.getElementById("pulse_duration").value = st_pul_dur;

    document.getElementById("advancedLaserMode").style.display = "block";
    document.getElementById("settingsButton").style.color = "#7d8300";
    document.getElementById("serialResults").innerHTML = "";
    isAdvancedLaserMode = true;
}

function closeAdvancedLaserMode() {
    // Закрываем модальное окно и очищаем поле ввода
    document.getElementById("settingsButton").style.color = "yellow";
    isAdvancedLaserMode = false;
    document.getElementById("advancedLaserMode").style.display = "none";
}

