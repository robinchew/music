// Create audio context so that I can use the WebAudioAPI
// https://developer.mozilla.org/en-US/docs/Web/API/AudioContext
let audioContext = new AudioContext();

// Number of semitones each note is above C
const noteToSemitones = {
  C: 0,
  "C#": 1,
  D: 2,
  "D#": 3,
  E: 4,
  F: 5,
  "F#": 6,
  G: 7,
  "G#": 8,
  A: 9,
  "A#": 10,
  B: 11,
};

var NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
function getPitch(note, octave) {
  var step = NOTES.indexOf(note);
  var power = Math.pow(2, (octave * 12 + step - 57) / 12);
  var pitch = 440 * power;
  return pitch;
}

function playInstrumentNote(instrument, note) {
  // Get the base note and the octave so that I can get the frequency to oscillate
  let base = note[0].toUpperCase();
  let frequency;
  if (note[1]) {
    frequency = getPitch(base + note[1], note[2]);
  } else {
    frequency = getPitch(base, note[2]);
  }
  let currentTime = audioContext.currentTime;

  // Basic sound design for the 2 instruments
  if (instrument === "piano") {
    // Simple sine wave, with piano esque sound profile
    let oscillator = audioContext.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, currentTime);
    // Use gain node to control volume at different times
    let gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0, currentTime);
    gainNode.gain.linearRampToValueAtTime(1, currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 1);
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start(currentTime);
    oscillator.stop(currentTime + 1);
  } else if (instrument === "violin") {
    // Two oscillators, one sawtooth and one triangle, with different frequencies, to emulate violin esque sound
    const oscillator1 = audioContext.createOscillator();
    oscillator1.type = "sawtooth";
    oscillator1.frequency.setValueAtTime(frequency, currentTime);
    const oscillator2 = audioContext.createOscillator();
    oscillator2.type = "triangle";
    oscillator2.frequency.setValueAtTime(frequency * 2, currentTime);
    // Use gain nodes to control sound profile
    const gainNode1 = audioContext.createGain();
    const gainNode2 = audioContext.createGain();

    gainNode1.gain.setValueAtTime(0, currentTime);
    gainNode1.gain.linearRampToValueAtTime(0.4, currentTime + 0.1);
    gainNode1.gain.exponentialRampToValueAtTime(0.01, currentTime + 1);

    gainNode2.gain.setValueAtTime(0, currentTime);
    gainNode2.gain.linearRampToValueAtTime(0.2, currentTime + 0.1);
    gainNode2.gain.exponentialRampToValueAtTime(0.01, currentTime + 1);
    oscillator1.connect(gainNode1);
    oscillator2.connect(gainNode2);

    gainNode1.connect(audioContext.destination);
    gainNode2.connect(audioContext.destination);
    oscillator1.start(currentTime);
    oscillator2.start(currentTime);
    oscillator1.stop(currentTime + 1.5);
    oscillator2.stop(currentTime + 1.5);
  }
}

// Calculate the number of semitones between two notes
function semitonesBetweenNotes(baseNote, targetNote) {
  const baseSemitones = noteToSemitones[baseNote];
  const targetSemitones = noteToSemitones[targetNote];
  if (baseSemitones === undefined || targetSemitones === undefined) {
    throw new Error("Invalid note name");
  }
  return targetSemitones - baseSemitones;
}

// Calculate pitch rate based on semitones and octaves using formula playbackRate = 2^(semitones/12 + octaves)
function calculatePitchRate(semitones, octaves = 0) {
  return Math.pow(2, semitones / 12 + octaves);
}

// Load audio file
async function loadAudioFile(url) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  return audioBuffer;
}

// Function to play audio buffer with pitch change
function playAudioBuffer(audioBuffer, pitchRate) {
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.playbackRate.value = pitchRate;
  source.connect(audioContext.destination);
  source.start();
}

async function playInstrumentNoteFromFile(instrument, note) {
  let base = note[0].toUpperCase();
  let name;
  if (note[1] === "#") {
    name = base + note[1];
  } else {
    name = base;
  }
  const semitones = semitonesBetweenNotes("C", name);
  const octaves = note[2] - 3;
  const pitchRate = calculatePitchRate(semitones, octaves);
  let audioBuffer;
  if (instrument === "piano") {
    audioBuffer = await loadAudioFile("c_piano.ogg");
  } else if (instrument === "violin") {
    audioBuffer = await loadAudioFile("c_violin.ogg");
  }
  playAudioBuffer(audioBuffer, pitchRate);
}

const shared = () => {
  const applyN = R.compose(R.reduceRight(R.compose, R.identity), R.repeat);
  const indent = (s) => `    ${s}`;

  function px(v) {
    return `${v}px`;
  }

  function isNone(value) {
    return value === undefined || value === null;
  }

  function jsToCss(css, i = 0) {
    return css
      .map(([tag, styles]) => {
        const cssStyles = styles
          .filter(([, value]) => !isNone(value))
          .map(([key, value]) => {
            if (Array.isArray(value)) {
              return applyN(indent, i + 1)(jsToCss([[key, value]], i + 1));
            }
            return applyN(indent, i + 1)(`${key}: ${value};`);
          });
        const endBrace = applyN(indent, i)("}");
        return `${tag}{\n${cssStyles.join("\n")}\n${endBrace}`;
      })
      .join("\n");
  }

  function getFileName(letter, sharp, base, pitch, instrument) {
    return (
      pitch +
      "_" +
      letter +
      base +
      (sharp === "#" ? "s" : "") +
      ".mid." +
      instrument +
      ".ogg"
    );
  }

  const notes = [
    ["c", "#"],
    ["d", "#"],
    ["e", null],
    ["f", "#"],
    ["g", "#"],
    ["a", "#"],
    ["b", null],
  ];

  const allNotes = R.unnest(
    [3, 4, 5].map((base) =>
      R.map(
        R.append(base),
        R.unnest(
          notes.map(([letter, sharp]) =>
            [[letter, null]].concat(sharp ? [[letter, "#"]] : [])
          )
        )
      )
    )
  ).map((l, i) => R.append(i + 48, l));

  return {
    allNotes,
    jsToCss,
    getFileName,
    px,
    playInstrumentNote,
  };
};
