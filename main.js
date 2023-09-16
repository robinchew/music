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

function logk(k,v) {
  console.log(k, v);
  return v;
}

const applyN = R.compose(R.reduceRight(R.compose, R.identity), R.repeat);
const indent = s => `    ${s}`;

function percent(v) {
  return `${v}%`;
}

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
};

function render() {
  m.render(document.body, view());
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

const groupedByBase = R.groupBy(([,, base]) => base);

function getFileName(letter, sharp, base, pitch, instrument) {
  return pitch + '_' + letter + base + (sharp === '#' ? 's' : '') + '.mid.' + instrument + '.ogg';
}

function renderNote([letter, sharp, base]) {
  if (! letter) {
    return '';
  }
  return [letter.toUpperCase() + (sharp || ''), m('sub', base)];
}

state = {
  playedNote: [],
  pastNotes: [],
  columnView: false,
  minimumWidth: 40, // px
  playSequence: false,
  playSequenceTimeout: [],
  storage: JSON.parse(localStorage.json || '{ "selectedPitch": {} }'),
  instrument: 'piano',
}

function view() {
  function clearPlaySequence() {
    state.playSequenceTimeout.forEach(to => clearTimeout(to));
  }
  clearPlaySequence();

  const serialedStorage = JSON.stringify(state.storage);
  if (localStorage.json !== serialedStorage) {
    localStorage.json = serialedStorage;
  }
  const selectedPitch = state.storage.selectedPitch || {};
  const columnView = state.columnView;
  const minimumWidth = state.minimumWidth;
  const hasSelectedPitch = Object.entries(selectedPitch).filter(([k, v]) => v).length > 0;
  const selectedNotes = hasSelectedPitch ?
    allNotes.filter(([,,, pitch]) => selectedPitch[pitch]) :
    allNotes;

  const playNote = R.curry(playInstrumentNote)(state.instrument);

  return m('div',
    {
      style:  {
        marginTop: columnView ? '0em' : '12rem',
        display: 'flex',
        'flex-direction': columnView ? 'row-reverse' : 'column',
        'align-items': columnView ? 'center' : 'unset',
      }
    },
    m('style',
      jsToCss([
        ['body', [
          ['margin', 0],
        ]],
        ['button', [
          // ['font-size', '2em'],
          ['padding', '0.5rem'],
          ['height', '4em']
        ]],
      ])),
    m('div',
      { style: { marginBottom: '2em' } },
      m('span',
        { style: { marginRight: '1em' } },
        ['piano', 'violin'].map(key =>
          m('label',
            m('input[name=instrument][type=radio]', {
              value: key,
              checked: key === state.instrument,
              onchange(e) {
                state.instrument = e.target.value;
                render();
              },
            }),
            key))),
      m('label',
        m('input[type=checkbox]', {
          checked: state.editMode,
          onclick() {
            state.editMode = ! state.editMode;
            render();
          },
        }),
        'Edit'),
      m('label',
        m('input[type=checkbox]', {
          onclick() {
            state.playSequence = ! state.playSequence;
            render();
          },
        }),
        'Play Sequence'),
      m('label',
        m('input[type=checkbox]', {
          onclick() {
            state.columnView = ! state.columnView;
            render();
          },
        }),
        'Columns'),
      [['intervals.html', 'Intervals']].map(([href, label]) =>
        m('span',
          { style: { marginLeft: px(20) } },
          m('a', { href }, label)))),
    m('div',
      Object.entries(groupedByBase(allNotes)).map(([groupBase, notes]) => R.call(() => {
        let row;
        return [
          row = m('div',
            {
              key: 'notes-row',
              style: columnView ? {
                width: '3rem',
                float: 'left',
              } : {},
            },
            notes.map(note => {
              const [letter, sharp, base, pitch] = note;
              return m('button', // Note button
                {
                  style: {
                    background: state.editMode ?
                      (selectedPitch[pitch] ? 'green' : 'white') :
                      (sharp === '#' ? '#999' : ''),
                    width: px(R.ifElse(w => w < minimumWidth, () => minimumWidth, R.identity)(window.innerWidth / notes.length)),
                  },
                  onclick() {
                    if (state.editMode) {
                      state.storage.selectedPitch[pitch] = ! state.storage.selectedPitch[pitch];
                      render();
                    } else if (state.playSequence) {
                      clearPlaySequence();
                      const index = allNotes.map(([,,, p]) => p).indexOf(pitch);
                      function playNext(i) {
                        if (allNotes[i]) {
                          playNote(allNotes[i]);
                          state.playSequenceTimeout.push(setTimeout(
                            () => playNext(i + 1),
                          700));
                        }
                      }
                      playNext(index);
                    } else {
                      playNote(note);
                    }
                  },
                },
                sharp ?
                  [letter.toUpperCase(), sharp] :
                  [
                    letter.toUpperCase(),
                    sharp,
                    m('sub', base)
                  ])
            })),
          m('div', {
            // Invisible element exists only to adjust previous
            // element after it has rendered itself and its children.
            key: columnView,
            style: {
              display: 'none',
            },
            ...R.fromPairs(['oncreate', 'onupdate'].map(key =>
              [key, () => {
                if (! columnView) {
                  const totalWidth = R.sum(Array.from(row.children).map(({ dom }) => $(dom).outerWidth()));
                  $(row.dom).css('width', totalWidth);
                }
              }],
            )),
          }),
        ]
      }))),
    m('div',
      {
        style: columnView ?
          { display: 'flex', 'flex-direction': 'column' } :
          {},
      },
      m('button',
        {
          style: {
            marginTop: '2rem',
          },
          onclick() {
            const note = selectedNotes[Math.floor(Math.random() * selectedNotes.length)];
            playNote(note);

            state.pastNotes = R.slice(
              -10, Infinity,
              R.append(state.playedNote, state.pastNotes));
            state.playedNote = note;
            render();
          },
        },
        'Play Random'),
      state.playedNote.length ? m('button',
        {
          style: {
            marginTop: '2rem',
          },
          onclick() {
            playNote(state.playedNote);
          },
        },
        'Repeat') : '',
      state.pastNotes.length >= 2 ? m('button',
        {
          style: {
            marginTop: '2rem',
          },
          onclick() {
            state.playedNote = R.last(state.pastNotes);
            state.pastNotes = R.dropLast(1, state.pastNotes);
            render();

            playNote(state.playedNote);
          },
        },
        'Back') : ''),
    m('.played-note',
      {
        style: {
          position: 'fixed',
          bottom: 0,
          right: 0,
        }
      },
      renderNote(state.playedNote)));
}
render();
// window.addEventListener("deviceorientation", render, true);
// window.addEventListener("deviceorientation", render, true);
window.onresize = render;
