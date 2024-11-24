let isGuideLaserOn = false, isMainLaserOn = false, isNotError = true, isDB25Connected, isReady;
let freq_min, freq_max, oper_mode, oper_mode_bin, dig_int, dig_int_bin, dev_st, dev_st_bin, ext_st, ext_st_bin;
let receivedData = '', response, db25Power = "?";

async function readPortUntilCR() {
    if (reader) {
        try {
            receivedData = '';
            while (true) {
                const { value, done } = await reader.read();
                receivedData += value.toString();
                // Проверяем наличие символа `CR` (0x0D) в буфере
                if (receivedData.includes("\r")) {
                    // Убираем символ `CR` из ответа
                    response = receivedData.replace("\r", "").trim();
                    return response;
                    console.log(response);
                    // Прерываем чтение после получения полного ответа
                    break;

                }
            }
        }
        catch (error) {
            console.error("Error while reading:", error);
        }
    }
}
async function writeRS232(comand) {
    if (isConnected && writer) {
        console.log('$' + comand + '\r');
        await writer.write('$' + comand + '\r');
    }
    await new Promise(resolve => setTimeout(resolve, 13));
}
async function modelLaser() {
    // console.log('modelLaser');
    await writeRS232('1');

    if (reader) {
        const value = await readPortUntilCR();
        if (value.includes("YLPM-1-4x200-20-20") || value.includes("YLPN-1-1x350-20")) {
            const parts = value.split(";");
            model = parts[1].trim();
            document.getElementById("model").textContent = model;
            document.getElementById("settingsButton").style.color = "yellow";
            document.getElementById("connectButton").textContent = "Disconnect";
            document.getElementById("connectionLed").classList.add("on");
            console.log(model);
            document.getElementById("manual").href = "manual/" + model + ".pdf";
            document.getElementById("manual").target = "_blank";
            document.getElementById("manualButton").style.color = "#02fd02";
            document.getElementById("connectRS232").classList.remove("status-off");
            document.getElementById("connectRS232").classList.add("status-on");
        }
        else {
            alert('Model is not supported!');
            document.getElementById("model").textContent = "N/A";

        }
    }
    return model;
}

async function snLaser(){
    await writeRS232('2');
    const value = await readPortUntilCR();
    const parts = value.split(";");
    if (parts.length === 2) {
        model_sn = parts[1].trim();
        console.log(model_sn);
        document.getElementById("sn").textContent = model_sn;
    }
    return model_sn;
}

async function deviceStatus(){
    await writeRS232('4');
    const value = await readPortUntilCR();
    const parts = value.split(";");
    if (parts.length === 2) {
        try {
            dev_st = parseInt(parts[1].trim(), 10);
            dev_st_bin = dev_st.toString(2);
            console.log(dev_st, dev_st_bin)
            if (dev_st_bin[dev_st_bin.length - 1] === "1") {
                document.getElementById("led10").classList.add("on");
            }
            else {
                document.getElementById("led10").classList.remove("on");
            }
            if (dev_st_bin[dev_st_bin.length - 2] === "1") {
                document.getElementById("led8").classList.add("on");
            }
            else {
                document.getElementById("led8").classList.remove("on");
            }
            if (dev_st_bin[dev_st_bin.length - 4] === "1") {
                document.getElementById("led11").classList.add("on");
                isNotError = false;
            }
            else {
                document.getElementById("led11").classList.remove("on");
                isNotError = true;
            }
            if (dev_st_bin[dev_st_bin.length - 5] === "1") {
                document.getElementById("led9").classList.add("on");
            }
            else {
                document.getElementById("led9").classList.remove("on");
            }
            if (dev_st_bin[dev_st_bin.length - 7] === "1") {
                document.getElementById("led12").classList.add("on");
                isReady = true;
            }
            else {
                document.getElementById("led12").classList.remove("on");
                isReady = false;
            }
        }
        catch (error) {
            console.error("Error while parsing Read device status --> ", error);
        }
    }
}

async function digitalIntStatus() {
    await writeRS232('10');
    const value = await readPortUntilCR();
    const parts = value.split(";");
    if (parts.length === 2) {
        dig_int = parseInt(parts[1].trim(), 10);
        dig_int_bin = dig_int.toString(2);
        console.log(dig_int, dig_int_bin)

        for (let i = 0; i < 8; i++) {
            if (dig_int_bin[dig_int_bin.length - i - 9] === "1") {
                document.getElementById("led" + i).classList.add("on");
            }
            else {
                document.getElementById("led" + i).classList.remove("on");
            }
        }

        db25Power = "";

        for (let i = 8; i > 0; i--) {
            db25Power +=  dig_int_bin[dig_int_bin.length - i];
        }
        // console.log((parseInt(db25Power, 2) * 100 / 255).toFixed(1));
        document.getElementById("DB25PowerStr").textContent = (parseInt(db25Power, 2) * 100 / 255).toFixed(1);
        if (dig_int_bin[dig_int_bin.length - 18] === "1") {
            isDB25Connected = true;
            document.getElementById("controlDB25").style.display = "block";
            // document.getElementById("connectionDB25").style.color = ("yellow");
            document.getElementById("connectionDB25").textContent = "[DB-25 Connected]";
        }
        else {
            isDB25Connected = false;
            document.getElementById("controlDB25").style.display = "none";
            // document.getElementById("connectionDB25").style.color = ("yellow");
            document.getElementById("connectionDB25").textContent = "[DB-25 Is Not Connected]";
        }
        if (dig_int_bin[dig_int_bin.length - 20] === "1") {
            document.getElementById("guideLaserLed").classList.add("on");
        }
        else {
            document.getElementById("guideLaserLed").classList.remove("on");
        }
        if (isNotError && dig_int_bin[dig_int_bin.length - 22] === "1" && dig_int_bin[dig_int_bin.length - 19] === "1") {
            document.getElementById("mainLaserLed").classList.add("on");
        }
        else {
            document.getElementById("mainLaserLed").classList.remove("on");
        }
        if (dig_int_bin[dig_int_bin.length - 26] === "1" && dig_int_bin[dig_int_bin.length - 27] === "1") {
            document.getElementById("led12").classList.add("alarm");
            document.getElementById("led12").title = "Laser is not ready for emission!";
        }
        else {
            document.getElementById("led12").classList.remove("alarm");
            document.getElementById("led12").title = "Laser is ready for emission!";
        }
    }
}

async function extendedStatus(){
    await writeRS232('11');
    const value = await readPortUntilCR();
    const parts = value.split(";");
    if (parts.length === 2) {
        try {
            ext_st = parseInt(parts[1].trim(), 10);
            ext_st_bin = ext_st.toString(2);
            console.log(ext_st, ext_st_bin)
            if (ext_st_bin[ext_st_bin.length - 8] === "1" && !isDB25) {
                document.getElementById("mainLaserLed").classList.add("on");
                isMainLaserOn = true;
                document.getElementById("guideLaser").classList.remove("status-on");
                document.getElementById("guideLaser").classList.add("status-off");
            }
            else {
                document.getElementById("mainLaserLed").classList.remove("on");
                isMainLaserOn = false;
            }
            if (ext_st_bin[ext_st_bin.length - 6] === "1") {
                document.getElementById("guideLaserLed").classList.add("on");
                isGuideLaserOn = true;
            }
            else {
                document.getElementById("guideLaserLed").classList.remove("on");
                isGuideLaserOn = false;
            }
        }
        catch (error) {
            console.error("Error while parsing oper_mode:", error);
        }
    }
}

async function operatioinModStatus() {
    await writeRS232('23');
    const value = await readPortUntilCR();
    const parts = value.split(";");
    if (parts.length === 2) {
        try {
            oper_mode = parseInt(parts[1].trim(), 10);
            oper_mode_bin = oper_mode.toString(2);
            console.log(oper_mode, oper_mode_bin[oper_mode_bin.length - 1])
            if (oper_mode_bin[oper_mode_bin.length - 2] === "1") {
                document.getElementById("connectionRS232Led").classList.add("on");
                // document.getElementById("connectRS232").textContent = ;
                isDB25 = false;
                document.getElementById("controlDB25").style.display = "none";
                // document.getElementById("connectionDB25").style.color = ("#313030");
                document.getElementById("guideLaser").classList.remove("status-off");
                document.getElementById("guideLaser").classList.add("status-on");
                document.getElementById("mainLaser").classList.remove("status-off");
                document.getElementById("mainLaser").classList.add("status-on");
            }
            else {
                document.getElementById("connectionRS232Led").classList.remove("on");
                // document.getElementById("connectRS232").textContent = ;
                isDB25 = true;
                document.getElementById("controlDB25").style.display = "block";
                // document.getElementById("connectionDB25").style.color = ("yellow");
                document.getElementById("guideLaser").classList.remove("status-on");
                document.getElementById("guideLaser").classList.add("status-off");
                document.getElementById("mainLaser").classList.remove("status-on");
                document.getElementById("mainLaser").classList.add("status-off");
            }
        }
        catch (error) {
            console.error("Error while parsing oper_mode:", error);
        }
    }
}

async function frequencyRangeLaser(){
    await writeRS232('18');
    const value = await readPortUntilCR();
    const parts = value.split(";");
    if (parts.length > 1) {
        freq_min = Math.ceil(parts[1].trim());
        freq_max = Math.floor(parts[2].trim());
        console.log(freq_min, freq_max)
        document.getElementById("frequencySlider").min = freq_min;
        document.getElementById("frequencySlider").value = freq_min;
        document.getElementById("frequencyValue").textContent = freq_min;
        // document.getElementById("frequencySlider").oninput(updateFreqValue(this.freq_min));
        document.getElementById("frequencySlider").max = freq_max;
    }
}

async function frequencyLaser(){
    await writeRS232('38');
    const value = await readPortUntilCR();
    const parts = value.split(";");
    if (parts.length === 2) {
        document.getElementById("DB25FreqStr").textContent = parts[1].trim();
    }
}

async function pulseDurationLaser(){
    if (model === "YLPM-1-4x200-20-20") {
        await writeRS232('51');
        const value = await readPortUntilCR();
        const datalist = document.getElementById("pulse_durationList");
        // Очищаем текущие значения
        datalist.innerHTML = "";
        // Разбиваем ответ на части
        const values = value.split(";");

        // Добавляем новые значения
        values.slice(1).forEach(value => {
            console.log(value);
            const option = document.createElement("option");
            option.value = value.trim(); // Удаляем лишние пробелы
            datalist.appendChild(option);
        });
        console.log(datalist);
        try {
            await writeRS232('48');
            const puls_dur = await readPortUntilCR();
            const puls_dur_values = puls_dur.split(";");
            document.getElementById("pulse_duration").value = puls_dur_values[1].trim();
            // document.getElementById("pulse_duration").textContent = puls_dur;
        }
        catch (error) {
            console.error("Error while parsing pulse duration ->", error);
        }
    }
    if (model === "YLPN-1-1x350-20") {
        document.getElementById("pulse_duration_label").style.display = "none";
        document.getElementById("pulse_duration").style.display = "none";
    }
}

// Guide Laser Command
async function toggleGaideLaser() {
    if (!isMainLaserOn && isConnected && !isDB25) {
        if (isGuideLaserOn) {
            await offGaideLaser();
        } else {
            await onGaideLaser();
        }
    }
    await deviceStatus();
    await extendedStatus();
    await new Promise(resolve => setTimeout(resolve, 100));
}

async function onGaideLaser() {
    if(!isMainLaserOn && !isGuideLaserOn) {
        await writeRS232("40")
        // await new Promise(resolve => setTimeout(resolve, 100));
        await readPortUntilCR();
    }
}

// Main Laser Command
async function offGaideLaser() {
    if(writer && isGuideLaserOn) {
        await writeRS232("41")
        await readPortUntilCR();
    }
}

async function toggleMainLaser() {
    if(isConnected && !isDB25){
        // console.log(isMainLaserOn, isNotError);
        if (isMainLaserOn) {
            console.log("offMainLaser");
            await offMainLaser();
        }
        else {
            if (isGuideLaserOn) {
                await offGaideLaser();
            }
            if (!isAdvancedLaserMode && isReady){
                if (model === "YLPM-1-4x200-20-20") {
                    await setPowValue("100");
                    await setFreqValue("9");
                    await onMainLaser();
                }
                else {
                    if (model === "YLPN-1-1x350-20") {
                        await setPowValue("100");
                        await setFreqValue("2");
                        await onMainLaser();
                    }
                    else {
                        alert ('Model is not supported!');
                    }
                }
            }
            else {
                await onMainLaser();
            }
        }
        await deviceStatus();
        await extendedStatus();
    }
    await new Promise(resolve => setTimeout(resolve, 100));
}

async function onMainLaser() {
    document.getElementById("guideLaser").classList.remove("status-on");
    document.getElementById("guideLaser").classList.add("status-off");
    if(writer) {
        await writeRS232('30');
        await readPortUntilCR();
        // if (model === "YLPN-1-1x350-20") {
        //     await writeRS232('42');
        //     await readPortUntilCR();
        // }
    }
}

async function offMainLaser() {
    document.getElementById("guideLaser").classList.remove("status-off");
    document.getElementById("guideLaser").classList.add("status-on");
    if(writer) {
        await writeRS232("31")
        await readPortUntilCR();
        // if (model === "YLPN-1-1x350-20") {
        //     await writeRS232('43');
        //     await readPortUntilCR();
        // }
    }
}

// Установка значения напряжения
async function setPowValue(value) {
    await writeRS232("32;" + value);
    await readPortUntilCR();
}

// Обновление значения напряжения
async function updatePowValue(value) {
    console.log(value);
    await new Promise(resolve => setTimeout(resolve, 500));
    document.getElementById("powerValue").textContent = value;
    await setPowValue(value);
}

// Установка значения частоты
async function setFreqValue(value) {
    await writeRS232("28;" + value);
    await readPortUntilCR();
}

// Обновление значения частоты
async function updateFreqValue(value) {
    console.log(value);
    await new Promise(resolve => setTimeout(resolve, 500));
    document.getElementById("frequencyValue").textContent = value;
    await setFreqValue(value);
}

// Установка значения длительности импульса
async function setPulseDurationValue(puls_value) {
    await new Promise(resolve => setTimeout(resolve, 500));
    await writeRS232("49;" + puls_value);
    await readPortUntilCR();
    await new Promise(resolve => setTimeout(resolve, 100));
    await frequencyRangeLaser();
    // await readPortUntilCR();
}