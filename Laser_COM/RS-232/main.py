# This is a sample Python script.

# Press Shift+F10 to execute it or replace it with your code.
# Press Double Shift to search everywhere for classes, files, tool windows, actions, and settings.

import serial
import os
import sys


# Press the green button in the gutter to run the script.
if __name__ == '__main__':
    # открываем порт
    ser = serial.Serial(
        port='ttyUSB0',
        baudrate=9600,
        bytesize=serial.EIGHTBITS,
        stopbits=serial.STOPBITS_ONE
    )
    print(ser.isOpen())

    # ser.write(b'$CON,1\r')
    # ser.read_until(expected=b'h')
    # ser.close()
    # print(ser.isOpen())



