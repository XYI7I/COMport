let port, textEncoder, textDecoder, writableStreamClosed, writer, readableStreamClosed, reader;
let isConnected = false, isRS232 = false, isDB25 = true;
let intervalId, orderCommand = true, dataToSend, serialResultsDiv;

let RS232History = [];

// Обработка нажатия кнопки-переключателя
async function toggleConnection() {
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
        textDecoder = new TextDecoderStream();
        readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
        reader = textDecoder.readable.getReader();
        if (reader && writer) {
            isConnected = true;
        }
        await initializeLaser();
        // stopContinuousRequest()

    } catch (e) {
        alert("Serial Connection Failed: " + e);
    }
}

async function initializeLaser() {
    await modelLaser();
    await snLaser();
    await digitalIntStatus();
    await operatioinModStatus();
    await deviceStatus();
    await frequencyRangeLaser();
    await pulseDurationLaser();
    await startContinuousRequest();
}

async function sendSerialLine() {

    if (isConnected && writer && isAdvancedLaserMode) {
        // Очищаем вывод перед отправкой новой команды
        dataToSend = document.getElementById("lineToSend").value;

        dataToSend = '$' + dataToSend + "\r";
        // console.log(dataToSend);

        await writer.write(dataToSend);
        await new Promise(resolve => setTimeout(resolve, 100));
        // serialResultsDiv.innerHTML = ""; // Очистка поля ввода после отправки
        document.getElementById("lineToSend").value = "";
        const value = await readPortUntilCR();
        // console.log(value);
        await appendToTerminal(value);
    }
}

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

async function disconnectSerial() {
    // console.log("stopContinuousRequest");
    if (!isGuideLaserOn && !isMainLaserOn) {
        if (isDB25) {
            console.log(isGuideLaserOn, isMainLaserOn, isDB25);
            stopContinuousRequest();
            try {
                // Завершение записи
                if (writer) {
                    await writer.close();
                    writer = null;
                }

                // Завершение чтения
                if (reader) {
                    await reader.cancel(); // Прекращение чтения
                    reader.releaseLock();  // Освобождение блокировки
                    reader = null;
                }

                // Завершение работы с TextDecoderStream
                if (textDecoder) {
                    try {
                        await textDecoder.readable.cancel(); // Завершаем поток чтения
                        await readableStreamClosed.catch(() => {}); // Завершаем поток безопасно
                    } catch (error) {
                        console.warn("Ошибка при завершении textDecoder:", error);
                    }
                    textDecoder = null;
                }

                // Завершение работы с TextEncoderStream
                if (textEncoder) {
                    try {
                        await textEncoder.readable.cancel(); // Завершаем поток записи
                        await writableStreamClosed.catch(() => {}); // Завершаем поток безопасно
                    } catch (error) {
                        console.warn("Ошибка при завершении textEncoder:", error);
                    }
                    textEncoder = null;
                }

                // Закрытие порта
                if (port) {
                    await port.close();
                    port = null;
                }
                if(writer === null && reader === null && textEncoder === null&& port === null){
                    // await stopContinuousRequest();
                    document.getElementById("connectRS232").classList.remove("status-on");
                    document.getElementById("connectRS232").classList.add("status-off");
                    isConnected = false;
                    document.getElementById("connectButton").classList.remove("active");
                    document.getElementById("connectButton").classList.add("not-active");
                    // document.getElementById("connectButton").textContent = "Connect";
                    document.getElementById("connectionLed").classList.remove("on");
                    document.getElementById("model").textContent = "-";
                    document.getElementById("sn").textContent = "-";
                    document.getElementById("manual").href = "";
                    document.getElementById("manual").target = "";
                    document.getElementById("settingsButton").classList.remove("active");
                    document.getElementById("settingsButton").classList.add("not-active");
                    document.getElementById("manualButton").classList.remove("active");
                    document.getElementById("manualButton").classList.add("not-active");
                    // document.getElementById("serialResults").innerHTML = "";
                    document.getElementById("controlDB25").style.display = "none";
                    document.getElementById("connectionDB25").textContent = "";
                    document.getElementById("led12").classList.remove("on");
                }
            } catch (e) {
                alert("Error disconnecting: " + e);
            }
        }
        else {
            alert("Laser connected by RS232!");
        }

    }
    else {
        alert("Laser is on!");
    }

}

async function toggleRS232() {
    if (isDB25) {
        await onRS232();
        await operatioinModStatus();
        await deviceStatus();
        await extendedStatus();
    } else {
        if (!isGuideLaserOn && !isMainLaserOn) {
            await offRS232();
            await operatioinModStatus();
            await deviceStatus();
            await extendedStatus();
        }
        else {
            alert("Laser is on!");
        }
    }
}

async function onRS232() {
    if(isConnected){
        if(model === "YLPM-1-4x200-20-20") {
            await writeRS232("24;1074");
            isRS232 = await readPortUntilCR();
        }
        else{
            if(model === "YLPN-1-1x350-20"){
                await writeRS232("24;9110608");
                isRS232 = await readPortUntilCR();
            }
            else{
                alert ('Model is not supported!');
            }
        }
    }
}

async function offRS232() {
    if(isConnected){
        document.getElementById("connectionRS232Led").classList.remove("on");
        if(model === "YLPM-1-4x200-20-20"){
            await writeRS232("24;1073");
            isRS232 = await readPortUntilCR();
        }
        else{
            if(model === "YLPN-1-1x350-20"){
                await writeRS232("24;9139421");
                isRS232 = await readPortUntilCR();
            }
            else{
                alert ('Model is not supported!');
            }
        }
    }
}

async function startContinuousRequest() {
    // Устанавливаем интервал для отправки команды каждую секунду
    intervalId = setInterval(async () => {
        await sendAndProcessCommand();
    }, 1000); // 1000 мс = 1 секунда
}

async function sendAndProcessCommand() {
    if (isConnected && writer) {
        if (isDB25 && isDB25Connected) {
            await digitalIntStatus();
            await frequencyLaser();
        }
        await deviceStatus();
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    // await extendedStatus();
}
function stopContinuousRequest() {
    clearInterval(intervalId); // Останавливаем отправку команд
}