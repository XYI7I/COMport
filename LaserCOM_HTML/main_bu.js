let port, textEncoder, writableStreamClosed, writer, readableStreamClosed;
let isConnected = false, isRS232 = false, isDB25 = false, isGuideLaserOn = false, isMainLaserOn = false;
let reader, intervalId, orderCommand = true, dataToSend, serialResultsDiv;
let model, model_sn, freq_min, freq_max, oper_mode, oper_mode_bin, dig_int, dig_int_bin;
let RS232History = [];

// Обработка нажатия кнопки-переключателя
async function toggleConnection() {
    // document.getElementById("controlDB25").style.display = "block";
    // document.getElementById("connectionDB25").style.color = ("yellow");
    if (isConnected) {
        await disconnectSerial();
    } else {
        await connectSerial();
    }
}

async function connectSerial() {
    try {
        port = await navigator.serial.requestPort();
        await port.open({ baudRate: 57600});
        textEncoder = new TextEncoderStream();
        writableStreamClosed = textEncoder.readable.pipeTo(port.writable);
        writer = textEncoder.writable.getWriter();
        isConnected = true;
        await initializeLaser();
        // await stopListening();
        // await listenToPort();
        // await startContinuousRequest();
    } catch (e) {
        alert("Serial Connection Failed: " + e);
    }
}

async function initializeLaser() {
    const textDecoder = new TextDecoderStream();
    readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
    // readableStreamClosed.closed.then(() => { console.log("Reader closed") });
    reader = textDecoder.readable.getReader();
    // Отправляем команду "$1" для запроса модели устройства
    if (isConnected && writer) {
        await writer.write('$1\r');
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (reader) {
        // setTimeout(reader.read, 200);
        const { value, done } = await reader.read();
        if (value.includes("1;YL")) {
            const parts = value.split(";");
            model = parts[1].trim();
            console.log(model);
            document.getElementById("model").textContent = model;
            document.getElementById("settingsButton").style.color = "yellow";
            document.getElementById("connectButton").textContent = "Disconnect";
            document.getElementById("connectionLed").classList.add("on");
            isConnected = true;
            isRS232 = true;
            document.getElementById("connectRS232").classList.remove("status-off");
            document.getElementById("connectRS232").classList.add("status-on");
            if (value.includes("1;YLPM-1-4x200-20-20")) {
                document.getElementById("manual").href = "manual/YLPM-1-4x200-20-20.pdf";
                document.getElementById("manual").target = "_blank";
                document.getElementById("manualButton").style.color = "#02fd02";
            }
            if (value.includes("1;YLPN-1-1x350-20")) {
                document.getElementById("manual").href = "manual/YLPN-1-1x350-20.pdf";
                document.getElementById("manual").target = "_blank";
                document.getElementById("manualButton").style.color = "#02fd02";
            }
            // value.delete();
            // receivedData = ''; // Очистка буфера
        }
        else {
            alert('Model is not supported!');
            isConnected = false;
            document.getElementById("model").textContent = "N/A";
            document.getElementById("connectButton").textContent = "Disconnect";
            document.getElementById("connectionLed").classList.add("on");
        }
        if (isConnected && writer) {
            await writer.write('$2\r');
            await new Promise(resolve => setTimeout(resolve, 100));
            const { value, done } = await reader.read();
            const parts = value.split(";");
            if (parts.length === 2) {
                model_sn = parts[1].trim();
                console.log(model_sn);
                document.getElementById("sn").textContent = model_sn;
            }

        }
        if (isConnected && writer) {
            await writer.write('$18\r');
            await new Promise(resolve => setTimeout(resolve, 100));
            const {value, done} = await reader.read();
            const parts = value.split(";");
            if (parts.length > 1) {
                freq_min = Math.ceil(parts[1].trim());
                freq_max = Math.floor(parts[2].trim());
                console.log(freq_min, freq_max)
                document.getElementById("frequencySlider").min = freq_min;
                document.getElementById("frequencySlider").value = freq_min;
                document.getElementById("frequencySlider").oninput(updateFreqValue(this.freq_min));
                document.getElementById("frequencySlider").max = freq_max;
            }
        }
        if (isConnected && writer) {
            await writer.write('$51\r');
            await new Promise(resolve => setTimeout(resolve, 100));
            const { value, done } = await reader.read();
            await updatePulseDurationlist(value)
        }
        if (isConnected && writer) {
            await writer.write('$23\r');
            await new Promise(resolve => setTimeout(resolve, 100));
            const { value, done } = await reader.read();
            const parts = value.split(";");
            if (parts.length === 2) {
                try {
                    oper_mode = parseInt(parts[1].trim(), 10);
                    oper_mode_bin = oper_mode.toString(2);
                    console.log(oper_mode, oper_mode_bin[oper_mode_bin.length - 1])
                    if (oper_mode_bin[oper_mode_bin.length - 2] === "1") {
                        document.getElementById("connectionRS232Led").classList.add("on");
                    }
                    else {
                        document.getElementById("connectionRS232Led").classList.remove("on");
                    }
                }
                catch (error) {
                    console.error("Error while parsing oper_mode:", error);
                }
            }
        }
        if (isConnected && writer) {
            await writer.write('$10\r');
            await new Promise(resolve => setTimeout(resolve, 100));
            const { value, done } = await reader.read();
            const parts = value.split(";");
            if (parts.length === 2) {
                try {
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
                }
                catch (error) {
                    console.error("Error while parsing oper_mode:", error);
                }
            }
        }
    }

}

async function listenToPort() {
    try {
        while (true) {
            const { value, done } = await reader.read();
            if (done) {
                console.log('[readLoop] DONE', done);
                reader.releaseLock();
                break;
            }
            else {
                console.log('[readLoop] Got chunk', value, done);
            }
            await appendToRS232History(value);
            console.log(value);
            }
    } catch (error) {
        console.error("Error while reading:", error);
    }
}

async function sendSerialLine() {

    if (isConnected && writer && isAdvancedLaserMode) {
        // Очищаем вывод перед отправкой новой команды
        dataToSend = document.getElementById("lineToSend").value;

        dataToSend = '$' + dataToSend + "\r";
        console.log(dataToSend);

        await writer.write(dataToSend);
        await new Promise(resolve => setTimeout(resolve, 100));
        // serialResultsDiv.innerHTML = ""; // Очистка поля ввода после отправки
        document.getElementById("lineToSend").value = "";
        const { value, done } = await reader.read();
        await appendToTerminal(value);
    }
}

// setTimeout(appendToTerminal, 200);
async function appendToTerminal(newStuff) {
    serialResultsDiv = document.getElementById("serialResults");
    console.log(newStuff);
    const parts = newStuff.split(";");
    if (parts.length > 1) {
        newStuff = parts[1].trim();
        for (let i = 2; i < parts.length; i++) {
             newStuff += parts[i].trim() + ";";
            serialResultsDiv.innerHTML = newStuff;
        }
        serialResultsDiv.innerHTML = newStuff;
    }
    else {
        serialResultsDiv.innerHTML = newStuff;
    }
}

async function appendToRS232History(newStuff) {
    RS232History = lineHistory.unshift(newStuff);
    console.log(newStuff);

}

async function disconnectSerial() {

    try {

        // await stopListening(); // Остановка потока перед отключением
        if (writer) {
            await writer.close();
            writer = null;
        }
        if (reader) {
            reader.closed.then(() => { console.log("Reader closed") });
            await reader.releaseLock
            // reader.releaseLock();
            reader = null;
        }
        if (textEncoder) {
            // await textEncoder.readable.cancel();
            await writableStreamClosed;
            textEncoder = null;
        }
        if (port) {
            await port.close();
            port = null;
        }
        if(writer === null && reader === null && textEncoder === null&& port === null){
            await stopContinuousRequest();
            document.getElementById("connectRS232").classList.remove("status-on");
            document.getElementById("connectRS232").classList.add("status-off");
            isConnected = false;
            document.getElementById("connectButton").textContent = "Connect";
            document.getElementById("connectionLed").classList.remove("on");
        }
    } catch (e) {
        alert("Error disconnecting: " + e);
    }
}

async function toggleRS232() {
    if (isRS232) {
        if (isDB25) {
            await onRS232();
            // isDB25 = false;
        } else {
            await offRS232();
            // isDB25 = true;
        }
    }

}

async function onRS232() {
    if(isConnected){
        // console.log(model);
        if(model === "YLPM-1-4x200-20-20") {
            await writer.write('$24;1078\r');
            await new Promise(resolve => setTimeout(resolve, 100));
            reader.read()
            await checkDigitalIntStatus();
        }
        if(model === "YLPN-1-1x350-20"){
            await writer.write('$24;\r');
            await new Promise(resolve => setTimeout(resolve, 100));
            reader.read()
            await checkDigitalIntStatus();
        }
        else{
            alert ('Model is not supported!');
        }
    }
}

async function offRS232() {
    if(isConnected){
        console.log(model);
        document.getElementById("connectionRS232Led").classList.remove("on");
        if(model === "YLPM-1-4x200-20-20"){
            await writer.write('$24;1073\r');
            await new Promise(resolve => setTimeout(resolve, 100));
            reader.read()
            await checkDigitalIntStatus();
        }
        if(model === "YLPN-1-1x350-20"){
            await writer.write('$24;\r');
            await new Promise(resolve => setTimeout(resolve, 100));
            reader.read()
            await checkDigitalIntStatus();
        }
        else{
            alert ('Model is not supported!');
        }
    }
}

async function toggleGaideLaser() {
    // isConnected = true;
    if (!isMainLaserOn && isConnected && !isDB25) {
        if (isGuideLaserOn) {
            await offGaideLaser();
            await writer.write('$40\r');
            await new Promise(resolve => setTimeout(resolve, 100));
            reader.read()
            await checkDigitalIntStatus();
        } else {
            await onGaideLaser();
            await writer.write('$24;1073\r');
            await new Promise(resolve => setTimeout(resolve, 100));
            reader.read()
            await checkDigitalIntStatus();
        }
    }
    // else {
    //     alert("Is not connected");
    // }
}

async function toggleMainLaser() {
    // isConnected = true;
    if(isConnected){
        if (isMainLaserOn) {
            await offMainLaser();
            isMainLaserOn = false;
        } else {
            await offGaideLaser();
            isGuideLaserOn = false;
            await onMainLaser();
            isMainLaserOn = true;
        }
    }
    else {
        alert("Is not connected");
    }
}

async function onGaideLaser() {
    if(writer && !isMainLaserOn && !isGuideLaserOn) {
        await writer.write('$41\r');
        await new Promise(resolve => setTimeout(resolve, 100));

        reader.read()
        await checkDigitalIntStatus();

        document.getElementById("guideLaserLed").classList.add("on");
        document.getElementById("guideLaser").classList.remove("status-off");
        document.getElementById("guideLaser").classList.add("status-on");
    }
}

async function offGaideLaser() {
    if(writer) {
        await writer.write('$40\r');
        await new Promise(resolve => setTimeout(resolve, 100));

        reader.read()
        await checkDigitalIntStatus();

        document.getElementById("guideLaserLed").classList.remove("on");
        document.getElementById("guideLaser").classList.remove("status-on");
        document.getElementById("guideLaser").classList.add("status-off");
    }
}
async function onMainLaser() {
    if(writer) {
        await writer.write('$40\r');
        // isGuideLaserOn = true;
        document.getElementById("mainLaser").classList.add("on");
        document.getElementById("mainLaser").classList.remove("status-off");
        document.getElementById("mainLaser").classList.add("status-on");
    }
    // document.getElementById("mainLaser").classList.remove("status-off");
    // document.getElementById("mainLaser").classList.add("status-on");
}

async function offMainLaser() {
    if(writer) {
        await writer.write('$41\r');
        // isGuideLaserOn = false;
        document.getElementById("mainLaserLed").classList.remove("on");
        document.getElementById("mainLaser").classList.remove("status-on");
        document.getElementById("mainLaser").classList.add("status-off");
    }
    // document.getElementById("mainLaser").classList.remove("status-on");
    // document.getElementById("mainLaser").classList.add("status-off");
}

async function startContinuousRequest() {
    // Устанавливаем интервал для отправки команды каждую секунду
    intervalId = setInterval(async () => {
        await sendAndProcessCommand();
    }, 1000); // 1000 мс = 1 секунда
}

async function sendAndProcessCommand() {
    if (isConnected && writer && orderCommand) {
        // Отправляем команду "25" с символом окончания строки
        await writer.write("$10\r");
        orderCommand = false;
    }
    else{
        await writer.write("$11\r");
        orderCommand = true;
    }
}
async function checkDigitalIntStatus() {
    await writer.write('$10\r');
    await new Promise(resolve => setTimeout(resolve, 100));
    reader = textDecoder.readable.getReader();

    const {value, done} = await reader.read();
    const parts = value.split(";");
    oper_mode = parseInt(parts[1].trim(), 10);
    oper_mode_bin = oper_mode.toString(2);
    console.log([oper_mode_bin.length - 3]);

    if (oper_mode_bin[oper_mode_bin.length - 3] === '1') {
        document.getElementById("connectionRS232Led").classList.add("on");
        isDB25 = false;
    }
    else {
        isDB25 = true;
    }
}
function stopContinuousRequest() {
    clearInterval(intervalId); // Останавливаем отправку команд
}

// Обновление значения напряжения
function updatePowValue(value) {
    document.getElementById("powerValue").textContent = value;
    // Пример: отправляем значение напряжения через serial port
    if (isConnected && writer) {
        // writer.write(`SET_VOLTAGE ${value}\r`);
    }
}

function updateFreqValue(value) {
    document.getElementById("frequencyValue").textContent = value;
    // Пример: отправляем значение напряжения через serial port
    if (isConnected && writer) {
        // writer.write(`SET_VOLTAGE ${value}\r`);
    }
}

async function updatePulseDurationlist(response) {
    const datalist = document.getElementById("pulse_durationList");

    // Очищаем текущие значения
    datalist.innerHTML = "";

    // Разбиваем ответ на части
    const values = response.split(";");

    // Добавляем новые значения
    values.slice(1).forEach(value => {
        const option = document.createElement("option");
        option.value = value.trim(); // Удаляем лишние пробелы
        datalist.appendChild(option);
    });
}