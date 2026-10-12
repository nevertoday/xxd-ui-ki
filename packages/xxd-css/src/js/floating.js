// 把浮层放到锚点旁边：先按指定方向，放不下就翻到另一侧，再夹在视口里。
export function place(anchor, floating, { placement = "bottom-start", offset = 6, padding = 8 } = {}) {
  const a = anchor.getBoundingClientRect();
  const f = floating.getBoundingClientRect();
  const vw = globalThis.innerWidth || document.documentElement.clientWidth;
  const vh = globalThis.innerHeight || document.documentElement.clientHeight;
  let [side, align = "center"] = placement.split("-");
  const room = { bottom: vh - a.bottom - offset - padding, top: a.top - offset - padding };
  if (side === "bottom" && f.height > room.bottom && room.top > room.bottom) side = "top";
  else if (side === "top" && f.height > room.top && room.bottom > room.top) side = "bottom";
  let top = side === "bottom" ? a.bottom + offset : a.top - offset - f.height;
  let left = align === "start" ? a.left : align === "end" ? a.right - f.width : a.left + (a.width - f.width) / 2;
  left = Math.min(Math.max(padding, left), Math.max(padding, vw - f.width - padding));
  top = Math.min(Math.max(padding, top), Math.max(padding, vh - f.height - padding));
  floating.style.top = `${Math.round(top)}px`;
  floating.style.left = `${Math.round(left)}px`;
  floating.dataset.side = side;
  return { top, left, side };
}
