try:
    import pyaudio
    import numpy as np
    import pylab
    import matplotlib.pyplot as plt
    import time
    import sys
except:
    print ("Something didn't import")

i=0
f,ax = plt.subplots(2)
global counter, tempArray

counter = 0
tempArray = []

x = np.arange(10000)
y = np.random.randn(10000)

li, = ax[0].plot(x, y)
ax[0].set_xlim(0,1000)
ax[0].set_ylim(-5000,5000)
ax[0].set_title("Raw Audio Signal")

li2, = ax[1].plot(x, y)
ax[1].set_xlim(0,5000)
ax[1].set_ylim(-100,100)
ax[1].set_title("Fast Fourier Transform")
plt.pause(0.01)
plt.tight_layout()

FORMAT = pyaudio.paInt16 
CHANNELS = 1
RATE = 44100
CHUNK = 1024 
RECORD_SECONDS = 0.1
WAVE_OUTPUT_FILENAME = "file.wav"

audio = pyaudio.PyAudio()

stream = audio.open(format=FORMAT,
                    channels=CHANNELS,
                    rate=RATE,
                    input=True,
                    frames_per_buffer=CHUNK)

global keep_going
keep_going = True

def sigmoid(inArray):
    outArray = inArray
    for i in range(len(inArray)):
        outArray[i] = (1/1+np.power((np.e + 10), -(i - 1))) * inArray[i]
    outArray[0] = 0
    outArray[1] = 0
    return outArray


def plot_data(in_data):

    audio_data = np.fromstring(in_data, np.int16)

    dfft = 10*np.log10(abs(np.fft.rfft(audio_data)))

    li.set_xdata(np.arange(len(audio_data)))
    li.set_ydata(audio_data)
    li2.set_xdata(np.arange(len(dfft))*10.)
    li2.set_ydata(dfft)

    plt.pause(0.001)

    return max(dfft)

while keep_going:
    try:
        if counter == 10:
            print(np.average(tempArray))
            tempArray = []
            counter = 0
        else:
            tempArray.append(plot_data(stream.read(CHUNK)))
            counter += 1
    except KeyboardInterrupt:
        keep_going=False
    except:
        pass

stream.stop_stream()
stream.close()

audio.terminate()