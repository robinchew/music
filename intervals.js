const storageTemplate = { selectableIntervals: {} };

function logk(k,v) {
  console.log(k, v);
  return v;
}

function run({ allNotes, jsToCss, px, playInstrumentNote }) {
  const intervals = [
    'Unison',
    'Minor 2nd',
    'Major 2nd',
    'Minor 3rd',
    'Major 3rd',
    'Perfect 4th',
    'Tritone',
    'Perfect 5th',
    'Minor 6th',
    'Major 6th',
    'Minor 7th',
    'Major 7th',
    'Octave',
  ];
  const storageTemplate = {
    selectableIntervals: R.fromPairs(intervals.map(i => [i, true])),
  };
  const state = {
    instrument: 'piano',
    selectedPitch: 48,
    bigMinorKeys: false,
    editIntervals: false,
    storage: JSON.parse(localStorage.json || JSON.stringify(storageTemplate)),
  };
  const pitchMap = R.fromPairs(allNotes.map(note => {
    const [,,, pitch] = note;
    return [pitch, note];
  }));
  function pianoKey(minor = false, isPressed, onPress) {
    return m(minor ? '.piano-key-minor.piano-key-minor-outer' : '.piano-key',
      m(
        [
          minor ?
            '.piano-key-minor.piano-key-minor-inner' :
            '.piano-key-inner',
          isPressed ? '.piano-key-pressed' : '',
        ].join(''),
        { onmousedown: () => onPress() }));
  }
  function shorten(s) {
    return [
      ['Unison', 'U'],
      ['Minor', 'm'],
      ['Major', 'M'],
      ['Perfect', 'P'],
      ['Tritone', 'TT'],
      ['Octave', 'O'],
      [' ', ''],
    ].reduce((newS, [from, to]) => newS.replace(from, to), s).substr(0, 2);
  }
  function view() {
    const serialedStorage = JSON.stringify(R.mergeRight(
      storageTemplate,
      state.storage));
    if (localStorage.json !== serialedStorage) {
      localStorage.json = serialedStorage;
    }
    const playNote = R.curry(playInstrumentNote)(state.instrument);
    const playInterval = (note, interval) => {
      const [,,, pitch] = note;
      playNote(note);
      setTimeout(() => playNote(pitchMap[pitch + interval]), 1000);
    };
    const bases = R.uniq(allNotes.map(R.prop(2)));
    if (bases.length !== 3) {
      throw 'Only coded to consider only 3 bases';
    }
    const twoBases = R.dropLast(1, bases);
    const selectableNotes = allNotes.filter(([,, base]) =>
      twoBases.includes(base))

    const [,, randomBase] = pitchMap[state.selectedPitch];
    const randomNotes = allNotes.filter(([,, base]) =>
      [randomBase, randomBase + 1].includes(base));

    const filteredIntervalSizes = intervals
      .map((label, i) =>
        state.storage.selectableIntervals[label] ? i : null)
      .filter(v => v !== null);

    return m('div',
      m('div',
        {
          style: {
            position: 'fixed',
            bottom: 0,
            right: 0,
          },
        },
        intervals[state.selectedInterval],
        ' ',
        m('sub', randomBase)),
      m('style', jsToCss([].concat(
        [
          ['body', [
            ['margin', 0],
          ]],
          ['.flex', [
            ['display', 'flex'],
          ]],
          ['.button', [
            ['padding', px(10)],
          ]],
          ['.piano-key', [
            ['height', px(200)],
            ['width', px(40)],
            ['border', '1px solid black'],
          ]],
          ['.piano-key-inner', [
            ['height', px(200)],
            ['width', px(40)],
          ]],
          ['.piano-key-minor', [
            ['background', 'black'],
            ['height', px(120)],
            ['width', px(20 * (state.bigMinorKeys ? 2 : 1))],
            ['border', 0],
          ]],
          ['.piano-key-minor-outer', [
            ['width', 0],
          ]],
          ['.piano-key-minor-inner', [
            ['position', 'relative'],
            ['z-index', 1],
            ['margin-left', px(-10 * (state.bigMinorKeys ? 2 : 1))],
          ]],
          ['.piano-key-pressed', [
            ['background', 'pink'],
          ]],
          ['.editable', [
            ['background-color', 'white'],
          ]],
          ['.not-selectable', [
            ['color', '#999'],
          ]],
        ]))),
      m('div',
        m('button.button',
          {
            onclick() {
              state.bigMinorKeys = ! state.bigMinorKeys;
              render();
            },
          },
          'Change Minor Key Size'),
        m('button.button',
          {
            onclick() {
              state.editIntervals = ! state.editIntervals;
              render();
            },
          },
          'Edit')),
      m('div',
        {
          style: {
            display: 'flex',
          },
        },
        randomNotes.map(note => {
          const [, sharp, _base, pitch] = note;
          return pianoKey(
            sharp === '#',
            state.selectedPitch === pitch,
            () => {
              playNote(note);
              state.pressedPitch = pitch;
              render();
            });
        })),
      m('.flex', intervals.map((s, i) =>
        // Intervals buttons
        m('button.button',
          {
            class: [
              state.storage.selectableIntervals[s] ?
                'selectable' : 'not-selectable',
              state.editIntervals ? 'editable' : '',
            ].filter(v => v).join(' '),
            onclick: () => {
              if (state.editIntervals) {
                state.storage.selectableIntervals[s] = ! state.storage.selectableIntervals[s];
                render();
                return;
              }
              const [,,selectedBase] = pitchMap[state.selectedPitch];
              const notes = selectableNotes.filter(([,,base]) =>
                base === selectedBase);
              const [,,, pitch] = notes[Math.floor(Math.random() * notes.length)];
              playInterval(pitchMap[pitch], i);
              state.pressedPitch = pitch;
              render();
            },
          },
          shorten(s)))),
      m('button.button',
        // Play random
        {
          onclick: () => {
            [,,, state.selectedPitch] = selectableNotes[Math.floor(Math.random() * selectableNotes.length)];

            const randomIndex = Math.floor(Math.random() * filteredIntervalSizes.length);
            console.log("ri'", randomIndex);
            state.selectedInterval = filteredIntervalSizes[randomIndex];
            state.pressedPitch = state.selectedPitch;
            playInterval(pitchMap[state.selectedPitch], state.selectedInterval);
            render();
          },
        },
        'Play Random'),
      m('button.button',
        {
          onclick: () => {
              playInterval(
                pitchMap[state.selectedPitch],
                state.selectedInterval);
          },
        },
        'Play Last'),
      state.pressedPitch ? pitchMap[state.pressedPitch]
        .slice(0, 2)
        .map(s => (s || '').toUpperCase()).join('') : '');
  }

  function render() {
    m.render(document.body, view());
  }
  render();
}
