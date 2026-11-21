// Original mark: a doorway arch (the household) with a lamp (the person) on a threshold line (what is theirs to claim).
export function Mark({ title }) {
  return (
    <svg viewBox="0 0 32 32" role={title ? 'img' : undefined} aria-hidden={title ? undefined : 'true'} aria-label={title}>
      <path d="M8.5 27V14.5a7.5 7.5 0 0 1 15 0V27" fill="none" stroke="#10233F" strokeWidth="3" strokeLinecap="round" />
      <path d="M12.5 7.8 16 5l3.5 2.8" fill="none" stroke="#10233F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity=".55" />
      <circle cx="16" cy="17" r="3.2" fill="#E9A21B" />
      <path d="M16 21.5v5.5" stroke="#E9A21B" strokeWidth="3" strokeLinecap="round" />
      <path d="M3.5 28.5h25" stroke="#0E7A4C" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <>
      <Mark />
      <span className="brand-word">
        <b>Bharat Scheme</b>
        <small lang="ta">பாரத் திட்டம்</small>
      </span>
    </>
  );
}

// Small line icons (1.6px stroke, 24 grid) so no emoji is used as an icon.
const P = {
  bell: 'M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16zM10 20.5a2 2 0 0 0 4 0',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  ext: 'M14 5h5v5M19 5l-8 8M17 14v5H5V7h5',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  plus: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
  doc: 'M7 3h7l4 4v14H7zM14 3v4h4',
  home: 'M4 11l8-6 8 6v9H4zM10 20v-5h4v5',
  compare: 'M9 4v16M15 4v16M4 8h5M15 16h5',
  info: 'M12 8h.01M11 12h1v5h1M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  people: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.3a3.5 3.5 0 0 1 0 6.4M18 14a6.5 6.5 0 0 1 3.5 6',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  cal: 'M5 6h14v14H5zM5 10h14M9 3v4M15 3v4',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',
};
export function Icon({ name, size = 18, className }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[name]} />
    </svg>
  );
}
