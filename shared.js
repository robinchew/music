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
    const fileName = getFileName(...note, instrument);
    audio = new Audio('notes/' + fileName);
    audio.play();
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
