import numpy as np
import scipy.io.wavfile as wavfile
import math
import argparse
import matplotlib.pyplot as plt

# Function to convert frequency to musical note
def freq_to_note(frequency):
    # define constants that control the algorithm
    NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] # these are the 12 notes in each octave
    OCTAVE_MULTIPLIER = 2 # going up an octave multiplies by 2
    KNOWN_NOTE_NAME, KNOWN_NOTE_OCTAVE, KNOWN_NOTE_FREQUENCY = ('A', 4, 440) # A4 = 440 Hz

    # Ensure that the frequency is positive
    if frequency <= 0:
        return 'Unknown'  # Placeholder for unknown frequencies

    # calculate the distance to the known note
    # since notes are spread evenly, going up a note will multiply by a constant
    # so we can use log to know how many times a frequency was multiplied to get from the known note to our note
    # this will give a positive integer value for notes higher than the known note, and a negative value for notes lower than it (and zero for the same note)
    note_multiplier = OCTAVE_MULTIPLIER**(1/len(NOTES))
    frequency_relative_to_known_note = frequency / KNOWN_NOTE_FREQUENCY
    distance_from_known_note = math.log(frequency_relative_to_known_note, note_multiplier)

    # round to make up for floating point inaccuracies
    distance_from_known_note = round(distance_from_known_note)

    # using the distance in notes and the octave and name of the known note,
    # we can calculate the octave and name of our note
    # NOTE: the "absolute index" doesn't have any actual meaning, since it doesn't care what its zero point is. it is just useful for calculation
    known_note_index_in_octave = NOTES.index(KNOWN_NOTE_NAME)
    known_note_absolute_index = KNOWN_NOTE_OCTAVE * len(NOTES) + known_note_index_in_octave
    note_absolute_index = known_note_absolute_index + distance_from_known_note
    note_octave, note_index_in_octave = note_absolute_index // len(NOTES), note_absolute_index % len(NOTES)
    note_name = NOTES[note_index_in_octave]
    return f'{note_name}{note_octave}'

def extract_sample(audio_data, frame_number, FRAME_OFFSET, FFT_WINDOW_SIZE):
    end = int(frame_number * FRAME_OFFSET)
    begin = int(end - FFT_WINDOW_SIZE)

    if end == 0:
        # We have no audio yet, return all zeros (very beginning)
        return np.zeros((abs(begin)), dtype=float)
    elif begin < 0:
        # We have some audio, padd with zeros
        return np.concatenate([np.zeros((abs(begin)), dtype=float), audio_data[0:end]])
    else:
        # Usually this happens, return the next sample
        return audio_data[begin:end]

def find_top_notes(fft, num, xf):
    """
    Find the top N musical notes from the FFT spectrum.

    Args:
        fft (numpy.ndarray): The FFT spectrum of the audio signal.
        num (int): The number of top notes to find.
        xf (numpy.ndarray): The frequency values corresponding to the FFT bins.

    Returns:
        list: A list of tuples containing the top musical notes found, each tuple in the format (frequency, note, amplitude).

    Notes:
        This function analyzes the FFT spectrum of an audio frame to identify the top N musical notes present
        based on their amplitudes.

    """
    # Check if the maximum amplitude in the FFT spectrum is very low
    if np.max(fft.real) < 0.001:
        return []

    # Create a list of (index, amplitude) pairs and sort it by amplitude in descending order
    amplitude_pairs = [(index, amplitude) for index, amplitude in enumerate(fft.real)]
    amplitude_pairs = sorted(amplitude_pairs, key=lambda x: x[1], reverse=True)

    found_notes = []
    unique_notes = set()

    # Iterate through the sorted list and identify the top N musical notes using a for loop
    for idx in range(len(amplitude_pairs)):
        if len(found_notes) >= num:
            break  # Stop when the desired number of notes is found

        # Get the frequency and amplitude of the current FFT bin
        frequency = xf[amplitude_pairs[idx][0]]
        amplitude = amplitude_pairs[idx][1]

        # Convert the frequency to a musical note
        note = freq_to_note(frequency)

        # Check if the note is not 'Unknown' and has not been found before in this frame
        if note != 'Unknown' and note not in unique_notes:
            # Add the note information to the list of found notes
            unique_notes.add(note)
            note_info = [frequency, note, amplitude]
            found_notes.append(note_info)

    return found_notes

def visualize_waveform(samples, sample_rate):
    # Create a time vector based on the sample rate and number of samples
    time = np.arange(0, len(samples)) / sample_rate

    # Create a plot for the waveform
    plt.figure(figsize=(12, 6))
    plt.plot(time, samples, color='b')
    plt.xlabel('Time (s)')
    plt.ylabel('Amplitude')
    plt.title('Audio Waveform Visualization')
    plt.grid()
    plt.tight_layout()

    # Show the plot or save it to a file
    plt.show()

def visualize_note(notes):
    # Create a simple plot to visualize the notes in order
    plt.figure(figsize=(12, 6))
    plt.plot(range(len(notes)), notes, marker='o', linestyle='-', color='b')
    plt.xlabel('Frame Number')
    plt.ylabel('Musical Note')
    plt.title('Musical Notes Played Over Time')
    plt.grid()
    plt.tight_layout()

    # Show the plot or save it to a file
    plt.show()

def process_audio(input_file):
    # Load the WAV file
    fs, audio_data = wavfile.read(input_file)

    # Extract the first channel (assuming it's stereo)
    if audio_data.ndim == 2:
        audio_data = audio_data[:, 0]  # Take only the first channel

    # Define parameters for audio processing
    FPS = 10  # Frames per second
    FFT_WINDOW_SECONDS = 0.1  # Window size in seconds
    FFT_WINDOW_SIZE = int(fs * FFT_WINDOW_SECONDS)
    AUDIO_LENGTH = len(audio_data) / fs
    FRAME_COUNT = int(AUDIO_LENGTH * FPS)
    FRAME_OFFSET = int(len(audio_data) / FRAME_COUNT)
    window = 0.5 * (1 - np.cos(np.linspace(0, 2*np.pi, FFT_WINDOW_SIZE, False)))

    xf = np.fft.rfftfreq(FFT_WINDOW_SIZE, 1 / fs)
    mx = 0

    # Create a list to store note information for all frames
    all_notes_info = []
    detected_notes = []

    for frame_number in range(FRAME_COUNT):
        sample = extract_sample(audio_data, frame_number, FRAME_OFFSET, FFT_WINDOW_SIZE)


        fft = np.fft.rfft(sample * window)
        fft = np.abs(fft).real 
        mx = max(np.max(fft), mx)

    for frame_number in range(FRAME_COUNT):
        sample = extract_sample(audio_data, frame_number, FRAME_OFFSET, FFT_WINDOW_SIZE)

        fft = np.fft.rfft(sample * window)
        fft = np.abs(fft).real

        # Normalize FFT amplitudes based on the maximum amplitude (mx)
        fft /= mx

        # Find the top N musical notes for this frame
        top_notes = find_top_notes(fft, num=3, xf=xf)  # Pass xf to find_top_notes
        detected_notes.extend([note_info[1] for note_info in top_notes])
        
        # Print the top notes for this frame
        print(f"Frame {frame_number} - Top Notes:")
        for note_info in top_notes:
            frequency, note, amplitude = note_info
            # The reference frequency (e.g., A4 at 440 Hz)
            cents_difference = 1200 * np.log2(frequency / 440.0)
            print(f"Note: {note}, Flatness/Sharpness (cents): {cents_difference:.2f}")

    # Visualize the top notes
    visualize_note(detected_notes)
    

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Analyze audio and find top musical notes.")
    parser.add_argument("input_file", type=str, help="Input WAV file")
    args = parser.parse_args()
    process_audio(args.input_file)
