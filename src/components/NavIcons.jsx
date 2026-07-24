// ─────────────────────────────────────────────
// SVG ICONS para Bottom Nav
// ─────────────────────────────────────────────
export function IconHome({ active }) {
  const c = active ? "#C9A84C" : "#A09282";
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 9.5L12 3L21 9.5V20C21 20.55 20.55 21 20 21H15V15H9V21H4C3.45 21 3 20.55 3 20V9.5Z" fill={c}/></svg>;
}
export function IconActivity({ active }) {
  const c = active ? "#C9A84C" : "#A09282";
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="2" rx="1" fill={c}/><rect x="3" y="9" width="14" height="2" rx="1" fill={c}/><rect x="3" y="14" width="18" height="2" rx="1" fill={c}/><rect x="3" y="19" width="10" height="2" rx="1" fill={c}/></svg>;
}
export function IconAccount({ active }) {
  const c = active ? "#C9A84C" : "#A09282";
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" fill={c}/><path d="M4 20C4 16.69 7.58 14 12 14C16.42 14 20 16.69 20 20" stroke={c} strokeWidth="2" strokeLinecap="round"/></svg>;
}
export function IconOptions({ active }) {
  const c = active ? "#C9A84C" : "#A09282";
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="5" r="2" fill={c}/><circle cx="12" cy="12" r="2" fill={c}/><circle cx="12" cy="19" r="2" fill={c}/></svg>;
}
