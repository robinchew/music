// Create audio context so that I can use the WebAudioAPI
// https://developer.mozilla.org/en-US/docs/Web/API/AudioContext
let audioContext = new AudioContext();

// Generates frequency to oscillate based on note and octave
// https://gist.github.com/marcgg/94e97def0e8694f906443ed5262e9cbb?permalink_comment_id=3896533#gistcomment-3896533
var NOTES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "G#", "A", "Bb", "B"];
function getPitch(note, octave) {
    var step = NOTES.indexOf(note);
    var power = Math.pow(2, (octave * 12 + step - 57)/12);
    var pitch = 440 * power;
    return pitch;
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

  function playInstrumentNote(instrument, note) {
    // Get the base note and the octave so that I can get the frequency to oscillate
	let base = note[0].toUpperCase();
	let frequency;
	if (note[1]) {
		frequency = getPitch(base + note[1], note[2])
	} else {
		frequency = getPitch(base, note[2])
	}
	let currentTime = audioContext.currentTime;

	// Basic sound design for the 2 instruments
	if (instrument === 'piano') {
		// Simple sine wave, with piano esque sound profile
		let oscillator = audioContext.createOscillator();
		oscillator.type = 'sine';
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
	} else if (instrument === 'violin') {
		// Two oscillators, one sawtooth and one triangle, with different frequencies, to emulate violin esque sound
		const oscillator1 = audioContext.createOscillator();
		oscillator1.type = 'sawtooth';
		oscillator1.frequency.setValueAtTime(frequency, currentTime);
		const oscillator2 = audioContext.createOscillator();
		oscillator2.type = 'triangle';
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
