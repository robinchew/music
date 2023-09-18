// Create audio context so that I can use the WebAudioAPI
// https://developer.mozilla.org/en-US/docs/Web/API/AudioContext
let audioContext = new AudioContext();

// Number of semitones each note is above C
const noteToSemitones = {
	'C': 0,
	'C#': 1,
	'D': 2,
	'D#': 3,
	'E': 4,
	'F': 5,
	'F#': 6,
	'G': 7,
	'G#': 8,
	'A': 9,
	'A#': 10,
	'B': 11
  };
  
  // Calculate the number of semitones between two notes
  function semitonesBetweenNotes(baseNote, targetNote) {
	const baseSemitones = noteToSemitones[baseNote];
	const targetSemitones = noteToSemitones[targetNote];
	if (baseSemitones === undefined || targetSemitones === undefined) {
	  throw new Error('Invalid note name');
	}
	return targetSemitones - baseSemitones;
  }
  
  // Calculate pitch rate based on semitones and octaves using formula playbackRate = 2^(semitones/12 + octaves)
  function calculatePitchRate(semitones, octaves = 0) {
	return Math.pow(2, (semitones / 12) + octaves);
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
  
  async function playInstrumentNote(instrument, note) {
	let base = note[0].toUpperCase();
	let name;
	if (note[1] === '#') {
	  name = base + note[1];
	} else {
	  name = base;
	}
	const semitones = semitonesBetweenNotes('C', name);
	const octaves = note[2] - 3; 
	const pitchRate = calculatePitchRate(semitones, octaves);
	let audioBuffer;
	if (instrument === 'piano') {
		audioBuffer = await loadAudioFile('c_piano.ogg');
	} else if (instrument === 'violin') {
		audioBuffer = await loadAudioFile('c_violin.ogg');
	}
	playAudioBuffer(audioBuffer, pitchRate);
  }

const shared = () => {
  const applyN = R.compose(R.reduceRight(R.compose, R.identity), R.repeat);
  const indent = s => `    ${s}`;

  function px(v) {
    return `${v}px`;
  }

  function isNone(value) {
    return value === undefined || value === null;
  }

  function jsToCss(css, i = 0) {
    return css.map(([tag, styles]) => {
      const cssStyles = styles
        .filter(([, value]) => ! isNone(value))
        .map(([key, value]) => {
          if (Array.isArray(value)) {
            return applyN(indent, i + 1)(jsToCss([[key, value]], i + 1));
          }
          return applyN(indent, i + 1)(`${key}: ${value};`);
        });
      const endBrace = applyN(indent, i)('}');
      return `${tag}{\n${cssStyles.join('\n')}\n${endBrace}`;
    }).join('\n');
  }

  function getFileName(letter, sharp, base, pitch, instrument) {
    return pitch + '_' + letter + base + (sharp === '#' ? 's' : '') + '.mid.' + instrument + '.ogg';
  }

  

  const notes = [
      ['c', '#'],
      ['d', '#'],
      ['e', null],
      ['f', '#'],
      ['g', '#'],
      ['a', '#'],
      ['b', null],
  ];

  const allNotes =
    R.unnest([3, 4, 5].map(base =>
      R.map(
        R.append(base),
        R.unnest(notes.map(([letter, sharp]) =>
          [[letter, null]].concat(sharp ? [[letter, '#']] : [])))))).map((l, i) => R.append(i + 48, l));

  return {
    allNotes,
    jsToCss,
    getFileName,
    px,
    playInstrumentNote,
  };
};
