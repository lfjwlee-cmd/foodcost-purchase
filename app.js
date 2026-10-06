const {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  memo
} = React;
const {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
  Legend
} = Recharts;
const {
  Search,
  Plus,
  Minus,
  List,
  CalendarDays,
  BarChart3,
  ShoppingBasket,
  CheckCircle2,
  XCircle,
  Bookmark,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  GitMerge,
  Trash2,
  Save,
  RotateCcw,
  Radio,
  MessageSquarePlus,
  User,
  RefreshCw
} = LucideReact;
const CFG = window.PUR_CONFIG || {};
const TABLE = 'pur_items';
const sb = window.supabase && CFG.SUPABASE_URL ? window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    storageKey: 'pur-board-auth'
  }
}) : null;
const CATS = ['육류', '해산물', '농산물', '가공품', '소스·양념', '기타'];
const UNITS = ['봉', '팩', '묶음', '단', '개', '박스', 'kg'];
const CONTENT_UNITS = ['g', 'kg', 'ml', 'L', '장', '개'];
const BRANDS = ['삼대미역', '인생아구찜', '어화락', '공통'];
const VERDICT = {
  usable: {
    label: '사용 가능',
    icon: CheckCircle2,
    on: 'bg-emerald-600 text-white border-emerald-600',
    off: 'border-emerald-200 text-emerald-800 hover:bg-emerald-50',
    dot: 'bg-emerald-500',
    hex: '#059669'
  },
  later: {
    label: '추후 사용',
    icon: Bookmark,
    on: 'bg-sky-600 text-white border-sky-600',
    off: 'border-sky-200 text-sky-800 hover:bg-sky-50',
    dot: 'bg-sky-500',
    hex: '#0284c7'
  },
  unusable: {
    label: '사용 불가',
    icon: XCircle,
    on: 'bg-rose-600 text-white border-rose-600',
    off: 'border-rose-200 text-rose-800 hover:bg-rose-50',
    dot: 'bg-rose-500',
    hex: '#e11d48'
  }
};
const VKEYS = ['usable', 'later', 'unusable'];
const NONE = {
  label: '평가 전',
  dot: 'bg-slate-300',
  hex: '#cbd5e1',
  badge: 'bg-slate-100 text-slate-500'
};
const vmeta = v => v ? VERDICT[v] : NONE;
const TAGS_GOOD = ['맛 좋음', '식감 좋음', '품질 균일', '작업성 좋음', '수율 좋음', '단가 경쟁력'];
const TAGS_BAD = ['단가 높음', '이취', '식감 불량', '수율 낮음', '규격 불일치', '이물', '포장 불량', '납기 지연', '대체품 필요'];
const pad = (n, l = 2) => String(n).padStart(l, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayStr = () => ymd(new Date());
const fmtKRW = n => '₩' + Math.round(n).toLocaleString('ko-KR');
const fmtWon = n => Math.round(Number(n) || 0).toLocaleString('ko-KR') + '원';
const fmtMan = n => n >= 100000000 ? (n / 100000000).toFixed(2) + '억' : n >= 10000 ? Math.round(n / 10000) + '만' : Math.round(n).toLocaleString('ko-KR');
const fmtAt = iso => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const hm = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
const dowOf = s => new Date(s + 'T00:00:00').getDay();
const fmtQty = n => Number(n).toLocaleString('ko-KR', {
  maximumFractionDigits: 2
});
const numOrNull = v => v === '' || v === null || v === undefined || isNaN(+v) ? null : +v;
const selectAll = e => e.target.select();
const unitCost = (price, cq, cu) => {
  const p = Number(price),
    q = Number(cq);
  if (!(p > 0) || !(q > 0) || !cu) return null;
  if (cu === 'g') return {
    v: p / (q / 1000),
    per: 'kg'
  };
  if (cu === 'kg') return {
    v: p / q,
    per: 'kg'
  };
  if (cu === 'ml') return {
    v: p / (q / 1000),
    per: 'L'
  };
  if (cu === 'L') return {
    v: p / q,
    per: 'L'
  };
  return {
    v: p / q,
    per: cu
  };
};
const contentText = it => Number(it.content_qty) > 0 && it.content_unit ? `${fmtQty(it.content_qty)}${it.content_unit}` : '';
const lsGet = k => {
  try {
    return localStorage.getItem(k) || '';
  } catch (e) {
    return '';
  }
};
const lsSet = (k, v) => {
  try {
    localStorage.setItem(k, v);
  } catch (e) {}
};
const errMsg = e => e && (e.message || e.error_description) || String(e);
const DERIVED = new WeakMap();
const derive = it => {
  let d = DERIVED.get(it);
  if (!d) {
    d = {
      amount: Number(it.qty) * Number(it.unit_price),
      unit: unitCost(it.unit_price, it.content_qty, it.content_unit),
      hay: [it.no, it.name, it.category, it.supplier, it.purchase_place, it.spec, it.brand, it.requester, it.ev_by, it.note, it.ev_comment, ...(it.ev_tags || []), vmeta(it.ev_v).label].join(' ').toLowerCase()
    };
    DERIVED.set(it, d);
  }
  return d;
};
const byDateDesc = (a, b) => a.date === b.date ? (b.no || 0) - (a.no || 0) : b.date.localeCompare(a.date);
function useDebounce(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
const Skel = ({
  className = ''
}) => React.createElement("div", {
  className: `animate-pulse rounded-lg bg-slate-200 ${className}`
});
const Chip = memo(function Chip({
  active,
  onClick,
  children,
  dot
}) {
  return React.createElement("button", {
    type: "button",
    onClick: onClick,
    className: `inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-slate-500'}`
  }, dot && React.createElement("span", {
    className: `h-2.5 w-2.5 rounded-full ${dot}`
  }), children);
});
function Card({
  title,
  sub,
  children,
  className = ''
}) {
  return React.createElement("section", {
    className: `rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 ${className}`
  }, React.createElement("div", {
    className: "mb-3"
  }, React.createElement("h3", {
    className: "text-base font-bold text-slate-900"
  }, title), sub && React.createElement("p", {
    className: "mt-0.5 text-xs text-slate-500"
  }, sub)), children);
}
const Empty = ({
  children
}) => React.createElement("p", {
  className: "py-14 text-center text-sm text-slate-500"
}, children);
const VerdictPicker = memo(function VerdictPicker({
  item,
  onVerdict
}) {
  const cur = item.ev_v;
  return React.createElement("div", {
    className: "grid grid-cols-3 gap-2"
  }, VKEYS.map(k => {
    const V = VERDICT[k];
    const I = V.icon;
    const active = cur === k;
    return React.createElement("button", {
      key: k,
      type: "button",
      disabled: item._evSyncing || item._syncing,
      onClick: () => onVerdict(item.id, active ? null : k),
      "aria-pressed": active,
      className: `flex h-12 items-center justify-center gap-1.5 rounded-xl border text-sm font-bold transition touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-60 ${active ? V.on : `bg-white ${V.off}`}`
    }, item._evSyncing && active ? React.createElement(Loader2, {
      size: 15,
      className: "animate-spin"
    }) : React.createElement(I, {
      size: 15
    }), React.createElement("span", {
      className: "truncate"
    }, V.label));
  }));
});
const formFrom = it => ({
  date: it.date,
  name: it.name || '',
  purchase_place: it.purchase_place || '',
  supplier: it.supplier || '',
  qty: it.qty === null || it.qty === undefined ? '' : String(Number(it.qty)),
  unit: it.unit || '봉',
  unit_price: it.unit_price === null || it.unit_price === undefined ? '' : String(Number(it.unit_price)),
  content_qty: Number(it.content_qty) > 0 ? String(Number(it.content_qty)) : '',
  content_unit: it.content_unit || 'g',
  category: it.category || '기타',
  brand: it.brand || '',
  spec: it.spec || '',
  note: it.note || ''
});
const toPayload = f => {
  const qty = numOrNull(f.qty),
    price = numOrNull(f.unit_price),
    cq = numOrNull(f.content_qty);
  if (!(qty > 0) || qty > 1000000) return {
    err: '구매 수량을 입력하세요 (0보다 큰 수).'
  };
  if (price === null || price < 0 || price > 100000000) return {
    err: `가격(1${f.unit}당)을 입력하세요.`
  };
  if (cq !== null && !(cq > 0)) return {
    err: '내용량은 0보다 크게 입력하거나 비워 두세요.'
  };
  if (!f.date) return {
    err: '구매한 날짜(입고일)를 달력에서 선택하세요.'
  };
  if (f.date > todayStr()) return {
    err: '입고일은 오늘 이후로 선택할 수 없습니다.'
  };
  return {
    data: {
      date: f.date,
      qty,
      unit: f.unit,
      unit_price: price,
      content_qty: cq,
      content_unit: cq ? f.content_unit : '',
      purchase_place: f.purchase_place.trim(),
      supplier: f.supplier.trim(),
      category: f.category,
      brand: f.brand,
      spec: f.spec.trim(),
      note: f.note.trim()
    }
  };
};
const previewOf = f => {
  const q = numOrNull(f.qty),
    p = numOrNull(f.unit_price);
  return {
    total: q > 0 && p !== null && p >= 0 ? q * p : null,
    uc: unitCost(p, numOrNull(f.content_qty), f.content_unit)
  };
};
const ucText = uc => uc ? `${uc.per}당 ${Math.round(uc.v).toLocaleString('ko-KR')}원` : '';
const UnitChips = memo(function UnitChips({
  value,
  onChange,
  idp
}) {
  const list = UNITS.includes(value) ? UNITS : [...UNITS, value];
  return React.createElement("div", {
    className: "mt-1 flex flex-wrap gap-1.5"
  }, list.map(u => React.createElement("button", {
    key: u,
    id: `${idp}-${u}`,
    type: "button",
    onClick: () => onChange(u),
    "aria-pressed": value === u,
    className: `h-10 min-w-12 rounded-lg border px-3 text-sm font-bold touch-manipulation ${value === u ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-slate-500'}`
  }, u)));
});
function PurchaseFields({
  f,
  set,
  idp,
  places,
  showName,
  nameProps
}) {
  const field = 'h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 focus:border-slate-900 focus:outline-none';
  const lab = 'text-xs font-semibold text-slate-700';
  const step = f.unit === 'kg' ? 0.5 : 1;
  const bump = d => {
    const q = numOrNull(f.qty) || 0;
    set({
      qty: String(Math.max(step, +(q + d).toFixed(2)))
    });
  };
  return React.createElement("div", {
    className: "grid grid-cols-2 gap-3 md:grid-cols-12"
  }, React.createElement("label", {
    className: `${lab} md:col-span-3`
  }, "입고일 (구매한 날) ", React.createElement("span", {
    className: "text-rose-600"
  }, "*필수"), React.createElement("input", {
    id: `${idp}-date`,
    type: "date",
    required: true,
    value: f.date,
    max: todayStr(),
    onChange: e => set({
      date: e.target.value
    }),
    className: `${field} mt-1 ${f.date ? '' : 'border-rose-400 bg-rose-50'}`
  }), !f.date && React.createElement("span", {
    className: "mt-1 block font-normal text-rose-600"
  }, "달력에서 실제로 산 날을 고르세요")), showName && React.createElement("label", {
    className: `${lab} md:col-span-5`
  }, "품목명", React.createElement("input", {
    id: `${idp}-name`,
    list: "dl-names",
    value: f.name,
    maxLength: 60,
    placeholder: "예: 깻잎",
    onChange: e => set({
      name: e.target.value
    }),
    className: `${field} mt-1`,
    ...nameProps
  })), React.createElement("div", {
    className: `${lab} col-span-2 ${showName ? 'md:col-span-4' : 'md:col-span-9'}`
  }, React.createElement("label", {
    htmlFor: `${idp}-place`
  }, "구매처 (어디서 샀나)"), React.createElement("input", {
    id: `${idp}-place`,
    list: "dl-places",
    value: f.purchase_place,
    placeholder: "예: 쿠팡, 퀀마트",
    onChange: e => set({
      purchase_place: e.target.value
    }),
    className: `${field} mt-1`
  }), places && places.length > 0 && React.createElement("div", {
    className: "mt-1.5 flex gap-1.5 overflow-x-auto pb-0.5"
  }, places.map(p => React.createElement("button", {
    key: p,
    type: "button",
    onClick: () => set({
      purchase_place: p
    }),
    className: `h-8 shrink-0 rounded-full border px-3 text-xs font-bold ${f.purchase_place === p ? 'border-sky-700 bg-sky-700 text-white' : 'border-sky-200 bg-white text-sky-800'}`
  }, p)))), React.createElement("div", {
    className: `${lab} md:col-span-3`
  }, "구매 수량", React.createElement("div", {
    className: "mt-1 flex h-12 overflow-hidden rounded-xl border border-slate-300 bg-white"
  }, React.createElement("button", {
    type: "button",
    "aria-label": "수량 감소",
    onClick: () => bump(-step),
    className: "w-11 shrink-0 text-slate-600 hover:bg-slate-100"
  }, React.createElement(Minus, {
    size: 18,
    className: "mx-auto"
  })), React.createElement("input", {
    id: `${idp}-qty`,
    type: "number",
    step: "any",
    min: "0",
    inputMode: "decimal",
    value: f.qty,
    onFocus: selectAll,
    onChange: e => set({
      qty: e.target.value
    }),
    className: "min-w-0 flex-1 text-center text-base font-bold tabular-nums focus:outline-none"
  }), React.createElement("button", {
    type: "button",
    "aria-label": "수량 증가",
    onClick: () => bump(step),
    className: "w-11 shrink-0 text-slate-600 hover:bg-slate-100"
  }, React.createElement(Plus, {
    size: 18,
    className: "mx-auto"
  })))), React.createElement("div", {
    className: `${lab} col-span-2 md:col-span-5`
  }, "구매 단위", React.createElement(UnitChips, {
    value: f.unit,
    onChange: u => set({
      unit: u
    }),
    idp: `${idp}-unit`
  })), React.createElement("label", {
    className: `${lab} col-span-2 sm:col-span-1 md:col-span-4`
  }, "가격 (1", f.unit, "당, 원)", React.createElement("input", {
    id: `${idp}-price`,
    type: "number",
    min: "0",
    inputMode: "numeric",
    value: f.unit_price,
    placeholder: "예: 1580",
    onFocus: selectAll,
    onChange: e => set({
      unit_price: e.target.value
    }),
    className: `${field} mt-1 tabular-nums`
  })), React.createElement("div", {
    className: `${lab} col-span-2 sm:col-span-1 md:col-span-3`
  }, "내용량 ", React.createElement("span", {
    className: "font-normal text-slate-500"
  }, "(선택 · 1", f.unit, " 안에 든 양)"), React.createElement("div", {
    className: "mt-1 flex h-12 overflow-hidden rounded-xl border border-slate-300 bg-white"
  }, React.createElement("input", {
    id: `${idp}-cq`,
    type: "number",
    step: "any",
    min: "0",
    inputMode: "decimal",
    value: f.content_qty,
    placeholder: "예: 600",
    onFocus: selectAll,
    onChange: e => set({
      content_qty: e.target.value
    }),
    className: "min-w-0 flex-1 px-3 text-base tabular-nums focus:outline-none"
  }), React.createElement("select", {
    id: `${idp}-cu`,
    "aria-label": "내용량 단위",
    value: f.content_unit,
    onChange: e => set({
      content_unit: e.target.value
    }),
    className: "shrink-0 border-l border-slate-300 bg-slate-50 px-2 text-sm font-semibold focus:outline-none"
  }, CONTENT_UNITS.map(u => React.createElement("option", {
    key: u
  }, u))))), React.createElement("label", {
    className: `${lab} col-span-2 sm:col-span-1 md:col-span-3`
  }, "거래처 (제조·공급사)", React.createElement("input", {
    id: `${idp}-sup`,
    list: "dl-suppliers",
    value: f.supplier,
    placeholder: "예: 한성기업",
    onChange: e => set({
      supplier: e.target.value
    }),
    className: `${field} mt-1`
  })), React.createElement("label", {
    className: `${lab} md:col-span-3`
  }, "분류", React.createElement("select", {
    id: `${idp}-cat`,
    value: f.category,
    onChange: e => set({
      category: e.target.value
    }),
    className: `${field} mt-1`
  }, CATS.map(c => React.createElement("option", {
    key: c
  }, c)))), React.createElement("label", {
    className: `${lab} md:col-span-3`
  }, "브랜드", React.createElement("select", {
    id: `${idp}-brand`,
    value: f.brand,
    onChange: e => set({
      brand: e.target.value
    }),
    className: `${field} mt-1`
  }, React.createElement("option", {
    value: ""
  }, "선택 안 함"), BRANDS.map(b => React.createElement("option", {
    key: b
  }, b)))));
}
const PriceLine = ({
  f
}) => {
  const {
    total,
    uc
  } = previewOf(f);
  const q = numOrNull(f.qty),
    p = numOrNull(f.unit_price);
  return React.createElement("p", {
    className: "text-sm text-slate-600"
  }, "총액 ", React.createElement("b", {
    className: "tabular-nums text-slate-900"
  }, total === null ? '—' : fmtKRW(total)), q > 0 && p !== null && p >= 0 && React.createElement("span", {
    className: "tabular-nums"
  }, " = ", fmtQty(q), f.unit, " × ", p.toLocaleString('ko-KR'), "원"), uc && React.createElement("span", {
    className: "ml-2 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-700"
  }, ucText(uc)));
};
function DetailPanel({
  item,
  focusComment,
  places,
  onEval,
  onUpdate,
  onRemove,
  onClose
}) {
  const [tags, setTags] = useState(item.ev_tags || []);
  const [comment, setComment] = useState(item.ev_comment || '');
  const [f, setF] = useState(() => formFrom(item));
  const set = patch => setF(s => ({
    ...s,
    ...patch
  }));
  const [err, setErr] = useState('');
  const cRef = useRef(null);
  useEffect(() => {
    if (focusComment) cRef.current?.focus();
  }, [focusComment]);
  useEffect(() => {
    setTags(item.ev_tags || []);
    setComment(item.ev_comment || '');
  }, [item.ev_ver]);
  const evDirty = comment !== (item.ev_comment || '') || tags.join() !== (item.ev_tags || []).join();
  const buyDirty = JSON.stringify(f) !== JSON.stringify(formFrom(item));
  const toggleTag = t => setTags(ts => ts.includes(t) ? ts.filter(x => x !== t) : [...ts, t]);
  const saveEval = () => onEval(item.id, {
    ev_tags: tags,
    ev_comment: comment.trim()
  });
  const saveBuy = () => {
    const {
      err: e,
      data
    } = toPayload(f);
    if (e) return setErr(e);
    setErr('');
    onUpdate(item.id, data);
  };
  const input = 'h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 focus:border-slate-900 focus:outline-none';
  const lab = 'text-xs font-semibold text-slate-600';
  return React.createElement("div", {
    className: "space-y-4 border-t border-slate-200 bg-slate-50 p-4"
  }, React.createElement("div", null, React.createElement("p", {
    className: "mb-2 text-xs font-bold text-slate-600"
  }, "어땠나요? — 태그를 누르거나 한 줄로 남기세요"), React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, [...TAGS_GOOD, ...TAGS_BAD].map(t => {
    const on = tags.includes(t);
    const good = TAGS_GOOD.includes(t);
    return React.createElement("button", {
      key: t,
      type: "button",
      onClick: () => toggleTag(t),
      className: `h-10 rounded-full border px-3 text-sm font-semibold touch-manipulation ${on ? good ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-rose-600 bg-rose-600 text-white' : 'border-slate-300 bg-white text-slate-700'}`
    }, t);
  })), React.createElement("div", {
    className: "mt-3 flex flex-col gap-2 sm:flex-row"
  }, React.createElement("input", {
    id: `c-${item.id}`,
    ref: cRef,
    value: comment,
    maxLength: 200,
    onChange: e => setComment(e.target.value),
    onKeyDown: e => {
      if (e.key === 'Enter' && evDirty) saveEval();
    },
    placeholder: "예: 해동 후 드립 적음, 다음 메뉴 개편 때 적용 검토",
    className: input
  }), React.createElement("button", {
    type: "button",
    disabled: !evDirty || item._evSyncing,
    onClick: saveEval,
    className: "inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white disabled:opacity-40"
  }, React.createElement(Save, {
    size: 16
  }), "평 저장")), React.createElement("p", {
    className: "mt-1 text-xs text-slate-400"
  }, item.ev_by ? `마지막 평가 ${item.ev_by} · ${fmtAt(item.ev_at)}` : '아직 평가 없음')), React.createElement("div", {
    className: "space-y-3 border-t border-slate-200 pt-4"
  }, React.createElement("p", {
    className: "text-xs font-bold text-slate-600"
  }, "구매 정보"), React.createElement(PurchaseFields, {
    f: f,
    set: set,
    idp: `e-${item.id}`,
    places: places,
    showName: false
  }), React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, React.createElement("label", {
    className: lab
  }, "규격·원산지", React.createElement("input", {
    id: `e-spec-${item.id}`,
    value: f.spec,
    onChange: e => set({
      spec: e.target.value
    }),
    className: `${input} mt-1`
  })), React.createElement("label", {
    className: lab
  }, "메모", React.createElement("input", {
    id: `e-note-${item.id}`,
    value: f.note,
    placeholder: "LOT, 샘플 여부 등",
    onChange: e => set({
      note: e.target.value
    }),
    className: `${input} mt-1`
  }))), React.createElement(PriceLine, {
    f: f
  }), err && React.createElement("p", {
    className: "flex items-center gap-1 text-sm font-semibold text-rose-700"
  }, React.createElement(AlertTriangle, {
    size: 14
  }), err), React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, React.createElement("button", {
    type: "button",
    disabled: !buyDirty || item._syncing,
    onClick: saveBuy,
    className: "inline-flex h-12 items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white disabled:opacity-40"
  }, React.createElement(Save, {
    size: 16
  }), "구매 정보 저장"), React.createElement("button", {
    type: "button",
    onClick: () => onRemove(item.id),
    className: "inline-flex h-12 items-center gap-2 rounded-xl border border-rose-300 bg-white px-5 text-sm font-bold text-rose-700 hover:bg-rose-50"
  }, React.createElement(Trash2, {
    size: 16
  }), "삭제 (되돌리기 가능)"), React.createElement("button", {
    type: "button",
    onClick: onClose,
    className: "ml-auto h-12 rounded-xl px-4 text-sm font-semibold text-slate-600 hover:bg-slate-200"
  }, "접기")), React.createElement("p", {
    className: "text-xs text-slate-400"
  }, "등록 ", item.requester || '—', " · ", fmtAt(item.created_at))));
}
const PartRow = memo(function PartRow({
  item,
  expanded,
  places,
  onVerdict,
  onEval,
  onToggleExpand,
  onUpdate,
  onRemove
}) {
  const d = derive(item);
  const tags = item.ev_tags || [];
  const hasReview = item.ev_comment || tags.length;
  const content = contentText(item);
  return React.createElement("article", {
    className: `rounded-2xl border bg-white transition ${item.ev_v === 'unusable' ? 'border-rose-300' : 'border-slate-200'} ${item._syncing ? 'opacity-60' : ''}`
  }, React.createElement("div", {
    className: "grid gap-3 p-4 lg:grid-cols-12 lg:items-center"
  }, React.createElement("div", {
    className: "min-w-0 lg:col-span-4"
  }, React.createElement("div", {
    className: "flex flex-wrap items-center gap-2"
  }, item.no && React.createElement("span", {
    className: "rounded-md bg-slate-900 px-2 py-0.5 text-xs font-bold tabular-nums text-white"
  }, "#", item.no), React.createElement("span", {
    className: "rounded-md border border-slate-300 px-2 py-0.5 text-xs font-semibold text-slate-600"
  }, item.category), item.brand && React.createElement("span", {
    className: "rounded-md bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-800"
  }, item.brand), item.purchase_place && React.createElement("span", {
    className: "rounded-md bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800"
  }, item.purchase_place), !item.ev_v && React.createElement("span", {
    className: `rounded-md px-2 py-0.5 text-xs font-semibold ${NONE.badge}`
  }, "평가 전"), item._syncing && React.createElement("span", {
    className: "inline-flex items-center gap-1 text-xs font-semibold text-orange-700"
  }, React.createElement(Loader2, {
    size: 12,
    className: "animate-spin"
  }), "저장 중")), React.createElement("p", {
    className: "mt-1.5 truncate text-base font-bold text-slate-900"
  }, item.name), React.createElement("p", {
    className: "truncate text-xs text-slate-500"
  }, [item.supplier, item.spec].filter(Boolean).join(' · ') || (item.purchase_place ? '' : '구매처 미입력'))), React.createElement("div", {
    className: "flex flex-wrap items-baseline justify-between gap-x-3 lg:col-span-2 lg:block"
  }, React.createElement("p", {
    className: "text-lg font-extrabold tabular-nums text-slate-900"
  }, fmtKRW(d.amount)), React.createElement("p", {
    className: "text-xs tabular-nums text-slate-500"
  }, fmtQty(item.qty), item.unit, " × ", Number(item.unit_price).toLocaleString(), "원"), content && React.createElement("p", {
    className: "text-xs tabular-nums text-slate-500"
  }, "1", item.unit, " ", content, d.unit ? ` · ${ucText(d.unit)}` : ''), React.createElement("p", {
    className: "text-xs text-slate-500"
  }, item.date.slice(5), " (", WEEK[dowOf(item.date)], ")", item.requester ? ` · ${item.requester}` : '')), React.createElement("div", {
    className: "min-w-0 space-y-2 lg:col-span-5"
  }, React.createElement(VerdictPicker, {
    item: item,
    onVerdict: onVerdict
  }), React.createElement("button", {
    type: "button",
    onClick: () => onToggleExpand(item.id, true),
    className: "flex w-full items-center gap-2 rounded-lg px-1 text-left text-sm hover:bg-slate-50"
  }, hasReview ? React.createElement("span", {
    className: "flex min-w-0 flex-wrap items-center gap-1.5"
  }, tags.map(t => React.createElement("span", {
    key: t,
    className: `rounded-md px-1.5 py-0.5 text-xs font-semibold ${TAGS_GOOD.includes(t) ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`
  }, t)), item.ev_comment && React.createElement("span", {
    className: "truncate text-slate-700"
  }, "“", item.ev_comment, "”"), item.ev_by && React.createElement("span", {
    className: "text-xs text-slate-400"
  }, "— ", item.ev_by)) : React.createElement("span", {
    className: "inline-flex items-center gap-1 text-xs font-semibold text-slate-400"
  }, React.createElement(MessageSquarePlus, {
    size: 14
  }), "한 줄 평 남기기"))), React.createElement("div", {
    className: "flex justify-end lg:col-span-1"
  }, React.createElement("button", {
    type: "button",
    onClick: () => onToggleExpand(item.id, false),
    "aria-expanded": !!expanded,
    disabled: item._syncing,
    className: "inline-flex h-11 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
  }, "상세 ", React.createElement(ChevronDown, {
    size: 16,
    className: `transition ${expanded ? 'rotate-180' : ''}`
  })))), expanded && React.createElement(DetailPanel, {
    item: item,
    places: places,
    focusComment: expanded === 'comment',
    onEval: onEval,
    onUpdate: onUpdate,
    onRemove: onRemove,
    onClose: () => onToggleExpand(item.id, false)
  }));
});
const QuickAdd = memo(function QuickAdd({
  items,
  places,
  onAdd,
  onMerge
}) {
  const latestByName = useMemo(() => {
    const m = new Map();
    [...items].sort(byDateDesc).forEach(it => {
      if (!m.has(it.name)) m.set(it.name, it);
    });
    return m;
  }, [items]);
  const recent = useMemo(() => [...latestByName.keys()].slice(0, 6), [latestByName]);
  const blank = () => ({
    date: '',
    name: '',
    purchase_place: '',
    supplier: '',
    qty: '1',
    unit: '봉',
    unit_price: '',
    content_qty: '',
    content_unit: 'g',
    category: '기타',
    brand: '',
    spec: '',
    note: ''
  });
  const [f, setF] = useState(blank);
  const [more, setMore] = useState(false);
  const [err, setErr] = useState('');
  const set = patch => setF(s => ({
    ...s,
    ...patch
  }));
  const fillFrom = name => {
    const p = latestByName.get(name);
    if (!p) return set({
      name
    });
    const prev = formFrom(p);
    set({
      name,
      purchase_place: prev.purchase_place,
      supplier: prev.supplier,
      unit: prev.unit,
      unit_price: prev.unit_price,
      content_qty: prev.content_qty,
      content_unit: prev.content_unit,
      category: prev.category,
      brand: prev.brand,
      spec: prev.spec
    });
  };
  const dup = f.name && items.find(it => it.name === f.name.trim() && it.date === f.date && (it.purchase_place || '') === f.purchase_place.trim() && !it._syncing);
  const submit = e => {
    e.preventDefault();
    const name = f.name.trim();
    if (!name) return setErr('품목명을 입력하세요.');
    if (name.length > 60) return setErr('품목명은 60자 이내로 입력하세요.');
    const {
      err: er,
      data
    } = toPayload(f);
    if (er) return setErr(er);
    setErr('');
    onAdd({
      ...data,
      name
    });
    set({
      name: '',
      qty: '1',
      unit_price: '',
      content_qty: '',
      note: ''
    });
  };
  const field = 'h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 focus:border-slate-900 focus:outline-none';
  const lab = 'text-xs font-semibold text-slate-700';
  const {
    total
  } = previewOf(f);
  return React.createElement("form", {
    onSubmit: submit,
    className: "space-y-3 rounded-2xl border-2 border-dashed border-orange-300 bg-orange-50 p-4"
  }, React.createElement("div", {
    className: "flex flex-wrap items-center gap-2"
  }, React.createElement("span", {
    className: "inline-flex items-center gap-1 text-sm font-bold text-orange-900"
  }, React.createElement(Plus, {
    size: 16
  }), "구매 내역 추가"), React.createElement("span", {
    className: "text-xs text-orange-800"
  }, "총액 = 구매 수량 × 가격. 내용량(600g, 10장 등)은 기록용이라 총액에 곱하지 않습니다")), recent.length > 0 && React.createElement("div", {
    className: "flex gap-2 overflow-x-auto pb-1"
  }, recent.map(n => React.createElement("button", {
    key: n,
    type: "button",
    onClick: () => fillFrom(n),
    className: `h-10 shrink-0 rounded-full border px-3 text-sm font-bold ${n === f.name ? 'border-orange-600 bg-orange-600 text-white' : 'border-orange-300 bg-white text-orange-900'}`
  }, n))), React.createElement(PurchaseFields, {
    f: f,
    set: set,
    idp: "qa",
    places: places,
    showName: true,
    nameProps: {
      onBlur: e => latestByName.has(e.target.value) && fillFrom(e.target.value)
    }
  }), React.createElement("div", {
    className: "flex flex-col gap-2 sm:flex-row sm:items-center"
  }, React.createElement("div", {
    className: "flex-1"
  }, React.createElement(PriceLine, {
    f: f
  })), React.createElement("button", {
    type: "submit",
    className: "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-orange-600 px-6 text-base font-bold text-white hover:bg-orange-700"
  }, React.createElement(Plus, {
    size: 18
  }), "추가", total !== null ? ` · ${fmtKRW(total)}` : '')), React.createElement("button", {
    type: "button",
    onClick: () => setMore(m => !m),
    className: "text-xs font-semibold text-orange-800 underline"
  }, more ? '옵션 닫기' : '규격·원산지·메모 입력'), more && React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, React.createElement("label", {
    className: lab
  }, "규격·원산지", React.createElement("input", {
    id: "qa-spec",
    value: f.spec,
    placeholder: "예: 국내산",
    onChange: e => set({
      spec: e.target.value
    }),
    className: `${field} mt-1`
  })), React.createElement("label", {
    className: lab
  }, "메모", React.createElement("input", {
    id: "qa-note",
    value: f.note,
    placeholder: "LOT, 샘플 여부 등",
    onChange: e => set({
      note: e.target.value
    }),
    className: `${field} mt-1`
  }))), dup && React.createElement("div", {
    className: "flex flex-wrap items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
  }, React.createElement(AlertTriangle, {
    size: 16
  }), "같은 날 같은 구매처의 ", React.createElement("b", null, dup.name), "(", fmtQty(dup.qty), dup.unit, ")이 이미 있습니다.", React.createElement("button", {
    type: "button",
    onClick: () => {
      onMerge(dup.id, numOrNull(f.qty) || 0);
      set({
        name: '',
        qty: '1',
        unit_price: '',
        content_qty: ''
      });
    },
    className: "ml-auto inline-flex h-10 items-center gap-1 rounded-lg bg-amber-600 px-3 text-sm font-bold text-white"
  }, React.createElement(GitMerge, {
    size: 14
  }), "수량 합산")), err && React.createElement("p", {
    className: "flex items-center gap-1 text-sm font-semibold text-rose-700"
  }, React.createElement(AlertTriangle, {
    size: 14
  }), err));
});
const NO_PLACE = '구매처 미입력';
const groupItems = items => {
  const places = new Map();
  items.forEach(it => {
    const pk = it.purchase_place || NO_PLACE;
    if (!places.has(pk)) places.set(pk, {
      name: pk,
      total: 0,
      items: [],
      cats: new Map()
    });
    const g = places.get(pk);
    const amt = derive(it).amount;
    g.total += amt;
    g.items.push(it);
    if (!g.cats.has(it.category)) g.cats.set(it.category, {
      name: it.category,
      total: 0,
      items: []
    });
    const c = g.cats.get(it.category);
    c.total += amt;
    c.items.push(it);
  });
  const byTotal = (a, b) => (a.name === NO_PLACE) - (b.name === NO_PLACE) || b.total - a.total;
  return [...places.values()].sort(byTotal).map(g => ({
    ...g,
    cats: [...g.cats.values()].sort((a, b) => b.total - a.total)
  }));
};
const readOpen = () => {
  try {
    return JSON.parse(lsGet('pur_open') || '{}');
  } catch (e) {
    return {};
  }
};
function GroupedList({
  items,
  renderRow,
  forceOpen,
  openAll
}) {
  const groups = useMemo(() => groupItems(items), [items]);
  const [open, setOpen] = useState(readOpen);
  useEffect(() => {
    lsSet('pur_open', JSON.stringify(open));
  }, [open]);
  useEffect(() => {
    if (openAll === null || openAll === undefined) return;
    const next = {};
    groups.forEach(g => {
      next['p:' + g.name] = openAll.v;
      g.cats.forEach(c => {
        next['c:' + g.name + '|' + c.name] = openAll.v;
      });
    });
    setOpen(o => ({
      ...o,
      ...next
    }));
  }, [openAll]);
  const isOpen = k => forceOpen || !!open[k];
  const toggle = k => setOpen(o => ({
    ...o,
    [k]: !o[k]
  }));
  if (!groups.length) return null;
  return React.createElement("div", {
    className: "space-y-3"
  }, groups.map(g => {
    const pk = 'p:' + g.name;
    const po = isOpen(pk);
    return React.createElement("section", {
      key: g.name,
      className: "overflow-hidden rounded-2xl border border-slate-200 bg-white"
    }, React.createElement("button", {
      type: "button",
      onClick: () => toggle(pk),
      "aria-expanded": po,
      className: "flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 touch-manipulation"
    }, React.createElement(ChevronRight, {
      size: 20,
      className: `shrink-0 text-slate-400 transition ${po ? 'rotate-90' : ''}`
    }), React.createElement("span", {
      className: `rounded-lg px-2.5 py-1 text-sm font-bold ${g.name === NO_PLACE ? 'bg-slate-100 text-slate-500' : 'bg-sky-100 text-sky-900'}`
    }, g.name), React.createElement("span", {
      className: "text-sm text-slate-500"
    }, g.items.length, "건 · ", g.cats.map(c => c.name).join(' · ')), React.createElement("b", {
      className: "ml-auto text-lg font-extrabold tabular-nums text-slate-900"
    }, fmtWon(g.total))), po && React.createElement("div", {
      className: "space-y-2 border-t border-slate-100 bg-slate-50 p-3"
    }, g.cats.map(c => {
      const ck = 'c:' + g.name + '|' + c.name;
      const co = isOpen(ck);
      return React.createElement("div", {
        key: c.name
      }, React.createElement("button", {
        type: "button",
        onClick: () => toggle(ck),
        "aria-expanded": co,
        className: "flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left hover:border-slate-400 touch-manipulation"
      }, React.createElement(ChevronRight, {
        size: 16,
        className: `shrink-0 text-slate-400 transition ${co ? 'rotate-90' : ''}`
      }), React.createElement("span", {
        className: "text-sm font-bold text-slate-800"
      }, c.name), React.createElement("span", {
        className: "truncate text-xs text-slate-500"
      }, c.items.length, "건 · ", c.items.map(it => it.name).join(', ')), React.createElement("b", {
        className: "ml-auto shrink-0 text-sm font-bold tabular-nums text-slate-900"
      }, fmtWon(c.total))), co && React.createElement("div", {
        className: "mt-2 space-y-2 pl-2 sm:pl-4"
      }, c.items.map(renderRow)));
    })));
  }));
}
function CalendarView({
  items,
  month,
  setMonth,
  selDay,
  setSelDay,
  renderRow
}) {
  const {
    y,
    m
  } = month;
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const byDay = useMemo(() => {
    const map = {};
    items.forEach(it => {
      (map[it.date] = map[it.date] || []).push(it);
    });
    return map;
  }, [items]);
  const monthKey = `${y}-${pad(m + 1)}`;
  const monthItems = items.filter(it => it.date.startsWith(monthKey));
  const monthTotal = monthItems.reduce((s, it) => s + derive(it).amount, 0);
  const cells = [...Array(first).fill(null), ...Array.from({
    length: days
  }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const shift = n => {
    const d = new Date(y, m + n, 1);
    setMonth({
      y: d.getFullYear(),
      m: d.getMonth()
    });
    setSelDay(null);
  };
  const selItems = selDay ? byDay[selDay] || [] : [];
  const today = todayStr();
  return React.createElement("div", {
    className: "space-y-4"
  }, React.createElement("section", {
    className: "rounded-2xl border border-slate-200 bg-white p-3 sm:p-5"
  }, React.createElement("div", {
    className: "mb-3 flex items-center gap-2"
  }, React.createElement("button", {
    type: "button",
    onClick: () => shift(-1),
    className: "h-11 w-11 rounded-xl border border-slate-300 hover:bg-slate-100",
    "aria-label": "이전 달"
  }, React.createElement(ChevronLeft, {
    size: 18,
    className: "mx-auto"
  })), React.createElement("h3", {
    className: "text-lg font-extrabold tabular-nums text-slate-900"
  }, y, "년 ", m + 1, "월"), React.createElement("button", {
    type: "button",
    onClick: () => shift(1),
    className: "h-11 w-11 rounded-xl border border-slate-300 hover:bg-slate-100",
    "aria-label": "다음 달"
  }, React.createElement(ChevronRight, {
    size: 18,
    className: "mx-auto"
  })), React.createElement("p", {
    className: "ml-auto text-right text-xs text-slate-500"
  }, monthItems.length, "건", React.createElement("br", null), React.createElement("b", {
    className: "text-sm tabular-nums text-slate-900"
  }, fmtKRW(monthTotal)))), React.createElement("div", {
    className: "grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-500"
  }, WEEK.map((w, i) => React.createElement("div", {
    key: w,
    className: `py-1 ${i === 0 ? 'text-rose-600' : i === 6 ? 'text-sky-700' : ''}`
  }, w))), React.createElement("div", {
    className: "grid grid-cols-7 gap-1"
  }, cells.map((d, i) => {
    if (!d) return React.createElement("div", {
      key: i,
      className: "h-20 rounded-xl bg-slate-50 sm:h-24 md:h-36"
    });
    const key = `${monthKey}-${pad(d)}`;
    const list = byDay[key] || [];
    const total = list.reduce((s, it) => s + derive(it).amount, 0);
    const byPlace = groupItems(list);
    const isSel = selDay === key;
    const dow = i % 7;
    return React.createElement("button", {
      key: i,
      type: "button",
      onClick: () => setSelDay(isSel ? null : key),
      className: `flex h-20 flex-col items-stretch rounded-xl border p-1.5 text-left transition touch-manipulation sm:h-24 sm:p-2 md:h-36 ${isSel ? 'border-slate-900 bg-slate-900 text-white' : list.length ? 'border-slate-200 bg-white hover:border-slate-500' : 'border-transparent bg-slate-50 text-slate-400'} ${key === today && !isSel ? 'ring-2 ring-orange-500' : ''}`
    }, React.createElement("span", {
      className: `text-sm font-bold ${!isSel && dow === 0 ? 'text-rose-600' : !isSel && dow === 6 ? 'text-sky-700' : ''}`
    }, d), list.length > 0 && React.createElement(React.Fragment, null, React.createElement("span", {
      className: `hidden truncate text-xs font-bold tabular-nums sm:block ${isSel ? 'text-orange-300' : 'text-slate-900'}`
    }, fmtWon(total)), React.createElement("span", {
      className: `text-xs sm:hidden ${isSel ? 'text-slate-300' : 'text-slate-500'}`
    }, list.length, "건"), React.createElement("span", {
      className: "mt-0.5 hidden space-y-0.5 md:block"
    }, byPlace.slice(0, 3).map(g => React.createElement("span", {
      key: g.name,
      className: `flex justify-between gap-1 text-xs leading-tight ${isSel ? 'text-slate-200' : 'text-slate-600'}`
    }, React.createElement("span", {
      className: "truncate"
    }, g.name === NO_PLACE ? '미입력' : g.name), React.createElement("span", {
      className: "shrink-0 tabular-nums"
    }, fmtWon(g.total)))), byPlace.length > 3 && React.createElement("span", {
      className: `block text-xs ${isSel ? 'text-slate-300' : 'text-slate-400'}`
    }, "외 ", byPlace.length - 3, "곳")), React.createElement("span", {
      className: "mt-auto flex flex-wrap gap-1"
    }, list.slice(0, 6).map(it => React.createElement("span", {
      key: it.id,
      className: `h-2 w-2 rounded-full ${vmeta(it.ev_v).dot}`
    })))));
  })), React.createElement("div", {
    className: "mt-3 flex flex-wrap gap-3 text-xs text-slate-500"
  }, [...VKEYS.map(k => VERDICT[k]), NONE].map(v => React.createElement("span", {
    key: v.label,
    className: "inline-flex items-center gap-1"
  }, React.createElement("span", {
    className: `h-2 w-2 rounded-full ${v.dot}`
  }), v.label)))), selDay ? React.createElement("div", {
    className: "space-y-3"
  }, React.createElement("h4", {
    className: "text-sm font-bold text-slate-700"
  }, selDay, " (", WEEK[dowOf(selDay)], ") 입고 ", selItems.length, "건"), selItems.length ? React.createElement(GroupedList, {
    items: selItems,
    renderRow: renderRow,
    forceOpen: true
  }) : React.createElement("p", {
    className: "rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500"
  }, "이 날짜에 등록된 구매 내역이 없습니다.")) : React.createElement("p", {
    className: "text-center text-sm text-slate-500"
  }, "날짜를 누르면 그날 입고된 품목을 바로 판정할 수 있습니다."));
}
const tipStyle = {
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  fontSize: 12
};
function StatsView({
  items,
  activity
}) {
  const s = useMemo(() => {
    const dow = [1, 2, 3, 4, 5, 6, 0].map(d => ({
      d: WEEK[d],
      지출: 0
    }));
    const byDate = {};
    const cat = {};
    const sup = {};
    const place = {};
    const reason = {};
    const vd = {
      usable: {
        n: 0,
        amt: 0
      },
      later: {
        n: 0,
        amt: 0
      },
      unusable: {
        n: 0,
        amt: 0
      },
      none: {
        n: 0,
        amt: 0
      }
    };
    items.forEach(it => {
      const {
        amount
      } = derive(it);
      dow[(dowOf(it.date) + 6) % 7].지출 += amount;
      byDate[it.date] = (byDate[it.date] || 0) + amount;
      cat[it.category] = (cat[it.category] || 0) + amount;
      const sk = it.supplier || '거래처 미입력';
      sup[sk] = (sup[sk] || 0) + amount;
      const pk = it.purchase_place || '구매처 미입력';
      place[pk] = (place[pk] || 0) + amount;
      const k = it.ev_v || 'none';
      vd[k].n += 1;
      vd[k].amt += amount;
      if (it.ev_v === 'later' || it.ev_v === 'unusable') (it.ev_tags || []).filter(t => TAGS_BAD.includes(t)).forEach(t => {
        reason[t] = (reason[t] || 0) + 1;
      });
    });
    let cum = 0;
    const daily = Object.keys(byDate).sort().map(k => {
      cum += byDate[k];
      return {
        day: k.slice(5).replace('-', '/'),
        일지출: byDate[k],
        누적: cum
      };
    });
    const verdict = [...VKEYS.map(k => ({
      key: k,
      name: VERDICT[k].label,
      value: vd[k].amt,
      n: vd[k].n,
      hex: VERDICT[k].hex
    })), {
      key: 'none',
      name: NONE.label,
      value: vd.none.amt,
      n: vd.none.n,
      hex: NONE.hex
    }].filter(x => x.n);
    const toBars = o => Object.entries(o).map(([name, v]) => ({
      name,
      지출: v
    })).sort((a, b) => b.지출 - a.지출);
    return {
      dow,
      daily,
      verdict,
      cat: toBars(cat),
      sup: toBars(sup).slice(0, 8),
      place: toBars(place).slice(0, 8),
      reason: Object.entries(reason).map(([name, 건수]) => ({
        name,
        건수
      })).sort((a, b) => b.건수 - a.건수)
    };
  }, [items]);
  if (!items.length) return React.createElement(Card, {
    title: "통계"
  }, React.createElement(Empty, null, "선택한 기간·필터에 구매 내역이 없습니다."));
  const vTotal = s.verdict.reduce((a, b) => a + b.value, 0);
  const axis = {
    fontSize: 12,
    fill: '#64748b'
  };
  const money = v => fmtMan(v);
  const hBar = (data, key, color, width, fmt) => React.createElement(ResponsiveContainer, {
    width: "100%",
    height: "100%"
  }, React.createElement(BarChart, {
    data: data,
    layout: "vertical",
    margin: {
      top: 4,
      right: 12,
      left: 0,
      bottom: 0
    }
  }, React.createElement(CartesianGrid, {
    stroke: "#e2e8f0",
    horizontal: false
  }), React.createElement(XAxis, {
    type: "number",
    tick: axis,
    tickFormatter: fmt === 'n' ? undefined : money,
    tickLine: false,
    axisLine: false,
    allowDecimals: false
  }), React.createElement(YAxis, {
    type: "category",
    dataKey: "name",
    tick: axis,
    tickLine: false,
    axisLine: false,
    width: width
  }), React.createElement(Tooltip, {
    contentStyle: tipStyle,
    formatter: v => fmt === 'n' ? `${v}건` : fmtKRW(v)
  }), React.createElement(Bar, {
    dataKey: key,
    fill: color,
    radius: [0, 6, 6, 0]
  })));
  return React.createElement("div", {
    className: "grid gap-4 lg:grid-cols-2"
  }, React.createElement(Card, {
    title: "일자별 지출 · 누적",
    sub: "기간 내 구매 소진 속도",
    className: "lg:col-span-2"
  }, React.createElement("div", {
    className: "h-64"
  }, React.createElement(ResponsiveContainer, {
    width: "100%",
    height: "100%"
  }, React.createElement(AreaChart, {
    data: s.daily,
    margin: {
      top: 8,
      right: 8,
      left: 0,
      bottom: 0
    }
  }, React.createElement("defs", null, React.createElement("linearGradient", {
    id: "gCum",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, React.createElement("stop", {
    offset: "0%",
    stopColor: "#ea580c",
    stopOpacity: 0.35
  }), React.createElement("stop", {
    offset: "100%",
    stopColor: "#ea580c",
    stopOpacity: 0
  })), React.createElement("linearGradient", {
    id: "gDay",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, React.createElement("stop", {
    offset: "0%",
    stopColor: "#0f172a",
    stopOpacity: 0.25
  }), React.createElement("stop", {
    offset: "100%",
    stopColor: "#0f172a",
    stopOpacity: 0
  }))), React.createElement(CartesianGrid, {
    stroke: "#e2e8f0",
    vertical: false
  }), React.createElement(XAxis, {
    dataKey: "day",
    tick: axis,
    tickLine: false,
    axisLine: false
  }), React.createElement(YAxis, {
    tick: axis,
    tickFormatter: money,
    tickLine: false,
    axisLine: false,
    width: 48
  }), React.createElement(Tooltip, {
    contentStyle: tipStyle,
    formatter: v => fmtKRW(v)
  }), React.createElement(Legend, {
    wrapperStyle: {
      fontSize: 12
    }
  }), React.createElement(Area, {
    type: "monotone",
    dataKey: "누적",
    stroke: "#ea580c",
    strokeWidth: 2.5,
    fill: "url(#gCum)"
  }), React.createElement(Area, {
    type: "step",
    dataKey: "일지출",
    stroke: "#0f172a",
    strokeWidth: 1.5,
    fill: "url(#gDay)"
  }))))), React.createElement(Card, {
    title: "판정별 구매 금액",
    sub: "사용 불가 금액 = 반품·거래처 클레임 검토 대상"
  }, React.createElement("div", {
    className: "flex flex-col items-center gap-4 sm:flex-row"
  }, React.createElement("div", {
    className: "h-52 w-full sm:w-1/2"
  }, React.createElement(ResponsiveContainer, {
    width: "100%",
    height: "100%"
  }, React.createElement(PieChart, null, React.createElement(Pie, {
    data: s.verdict,
    dataKey: "value",
    nameKey: "name",
    innerRadius: "55%",
    outerRadius: "90%",
    paddingAngle: 2,
    stroke: "none"
  }, s.verdict.map(e => React.createElement(Cell, {
    key: e.key,
    fill: e.hex
  }))), React.createElement(Tooltip, {
    contentStyle: tipStyle,
    formatter: v => fmtKRW(v)
  })))), React.createElement("ul", {
    className: "w-full space-y-2 sm:w-1/2"
  }, s.verdict.map(d => React.createElement("li", {
    key: d.key,
    className: "flex items-center gap-2 text-sm"
  }, React.createElement("span", {
    className: "h-3 w-3 shrink-0 rounded-sm",
    style: {
      background: d.hex
    }
  }), React.createElement("span", {
    className: "flex-1 text-slate-700"
  }, d.name, " ", React.createElement("span", {
    className: "text-xs text-slate-400"
  }, d.n, "건")), React.createElement("b", {
    className: "tabular-nums text-slate-900"
  }, fmtWon(d.value)), React.createElement("span", {
    className: "w-10 text-right text-xs tabular-nums text-slate-500"
  }, vTotal ? Math.round(d.value / vTotal * 100) : 0, "%")))))), React.createElement(Card, {
    title: "보류·불가 사유",
    sub: "추후 사용·사용 불가 품목에 붙은 태그 빈도"
  }, s.reason.length === 0 ? React.createElement(Empty, null, "보류·불가 사유 태그가 아직 없습니다.") : React.createElement("div", {
    className: "h-52"
  }, hBar(s.reason, '건수', '#e11d48', 80, 'n'))), React.createElement(Card, {
    title: "구매처별 지출",
    sub: "어디서 샀나 · 상위 8곳"
  }, React.createElement("div", {
    className: "h-60"
  }, hBar(s.place, '지출', '#0369a1', 96))), React.createElement(Card, {
    title: "거래처별 지출",
    sub: "제조·공급사 · 상위 8곳"
  }, React.createElement("div", {
    className: "h-60"
  }, hBar(s.sup, '지출', '#0f172a', 96))), React.createElement(Card, {
    title: "분류별 지출"
  }, React.createElement("div", {
    className: "h-60"
  }, hBar(s.cat, '지출', '#ea580c', 72))), React.createElement(Card, {
    title: "요일별 지출 패턴",
    sub: "월~일"
  }, React.createElement("div", {
    className: "h-60"
  }, React.createElement(ResponsiveContainer, {
    width: "100%",
    height: "100%"
  }, React.createElement(BarChart, {
    data: s.dow,
    margin: {
      top: 8,
      right: 8,
      left: 0,
      bottom: 0
    }
  }, React.createElement(CartesianGrid, {
    stroke: "#e2e8f0",
    vertical: false
  }), React.createElement(XAxis, {
    dataKey: "d",
    tick: axis,
    tickLine: false,
    axisLine: false
  }), React.createElement(YAxis, {
    tick: axis,
    tickFormatter: money,
    tickLine: false,
    axisLine: false,
    width: 48
  }), React.createElement(Tooltip, {
    contentStyle: tipStyle,
    formatter: v => fmtKRW(v)
  }), React.createElement(Bar, {
    dataKey: "지출",
    radius: [6, 6, 0, 0]
  }, s.dow.map((e, i) => React.createElement(Cell, {
    key: i,
    fill: i >= 5 ? '#94a3b8' : '#0f172a'
  }))))))), React.createElement(Card, {
    title: "실시간 활동",
    sub: "이 화면을 연 뒤 다른 사람이 바꾼 내용"
  }, activity.length === 0 ? React.createElement(Empty, null, "아직 다른 사람의 변경이 없습니다.") : React.createElement("ul", {
    className: "max-h-60 divide-y divide-slate-100 overflow-y-auto"
  }, activity.map(a => React.createElement("li", {
    key: a.id,
    className: "flex items-center gap-3 py-2 text-sm"
  }, React.createElement("span", {
    className: `h-2 w-2 shrink-0 rounded-full ${a.tone === 'error' ? 'bg-rose-500' : a.tone === 'warn' ? 'bg-amber-500' : 'bg-sky-500'}`
  }), React.createElement("span", {
    className: "flex-1 text-slate-700"
  }, a.text), React.createElement("span", {
    className: "text-xs tabular-nums text-slate-400"
  }, a.at))))));
}
const PERIODS = [{
  k: 'm1',
  label: '이번 달'
}, {
  k: 'm3',
  label: '최근 3개월'
}, {
  k: 'all',
  label: '전체'
}];
function App() {
  const [status, setStatus] = useState('loading');
  const [loadErr, setLoadErr] = useState('');
  const [items, setItems] = useState([]);
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  const [author, setAuthor] = useState(() => lsGet('pur_author'));
  const [authorDraft, setAuthorDraft] = useState('');
  const authorRef = useRef(author);
  useEffect(() => {
    authorRef.current = author;
  }, [author]);
  const [view, setView] = useState(() => lsGet('pur_view') || 'list');
  useEffect(() => {
    lsSet('pur_view', view);
  }, [view]);
  const [period, setPeriod] = useState('m3');
  const [query, setQuery] = useState('');
  const q = useDebounce(query, 250);
  const [fVerdict, setFVerdict] = useState([]);
  const [fCat, setFCat] = useState([]);
  const [fBrand, setFBrand] = useState([]);
  const [fPlace, setFPlace] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [activity, setActivity] = useState([]);
  const [inflight, setInflight] = useState(0);
  const [rt, setRt] = useState('connecting');
  const [openAll, setOpenAll] = useState(null);
  const now = new Date();
  const [month, setMonth] = useState({
    y: now.getFullYear(),
    m: now.getMonth()
  });
  const [selDay, setSelDay] = useState(null);
  const searchRef = useRef(null);
  const toastSeq = useRef(0);
  const pushToast = useCallback(t => {
    const id = ++toastSeq.current;
    setToasts(ts => [...ts.slice(-2), {
      id,
      ...t
    }]);
    setTimeout(() => setToasts(ts => ts.filter(x => x.id !== id)), t.ttl || 5000);
  }, []);
  const dismissToast = useCallback(id => setToasts(ts => ts.filter(x => x.id !== id)), []);
  const log = useCallback((text, tone = 'info') => setActivity(a => [{
    id: Date.now() + Math.random(),
    text,
    tone,
    at: hm()
  }, ...a].slice(0, 40)), []);
  const replaceRow = useCallback(row => setItems(list => list.map(x => x.id === row.id ? row : x)), []);
  const patchRow = useCallback((id, patch) => setItems(list => list.map(x => x.id === id ? {
    ...x,
    ...patch
  } : x)), []);
  const track = async p => {
    setInflight(n => n + 1);
    try {
      return await p;
    } finally {
      setInflight(n => n - 1);
    }
  };
  const load = useCallback(async () => {
    if (!sb) {
      setStatus('error');
      setLoadErr('config.js의 Supabase 설정을 읽지 못했습니다.');
      return;
    }
    setStatus('loading');
    const {
      data,
      error
    } = await sb.from(TABLE).select('*').eq('archived', false).order('date', {
      ascending: false
    }).order('no', {
      ascending: false
    }).limit(5000);
    if (error) {
      setStatus('error');
      setLoadErr(error.code === '42P01' || /does not exist|schema cache/.test(error.message) ? 'pur_items 테이블이 없습니다. supabase-setup.sql을 먼저 실행하세요.' : errMsg(error));
      return;
    }
    setItems(data || []);
    setStatus('ready');
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (!sb) return;
    const ch = sb.channel('pur-items-live').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: TABLE
    }, payload => {
      const row = payload.new;
      if (!row || !row.id) return;
      const cur = itemsRef.current.find(x => x.id === row.id);
      if (cur && (cur._syncing || cur._evSyncing)) return;
      if (cur && cur.updated_at === row.updated_at) return;
      setItems(list => {
        if (row.archived) return list.filter(x => x.id !== row.id);
        const i = list.findIndex(x => x.id === row.id);
        if (i < 0) return [row, ...list];
        const n = [...list];
        n[i] = row;
        return n;
      });
      if (payload.eventType === 'INSERT') log(`${row.requester || '누군가'} · ${row.name} 등록`, 'info');else if (row.archived) log(`${row.name} 삭제됨`, 'warn');else if (cur && cur.ev_ver !== row.ev_ver) log(`${row.ev_by || '누군가'} · ${row.name} → ${vmeta(row.ev_v).label}`, row.ev_v === 'unusable' ? 'error' : 'info');else log(`${row.name} 구매 정보 수정`, 'info');
    }).subscribe(s => setRt(s === 'SUBSCRIBED' ? 'live' : s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED' ? 'down' : 'connecting'));
    return () => {
      sb.removeChannel(ch);
    };
  }, [log]);
  const commitRef = useRef(null);
  const commitEval = useCallback(async (id, patch, opts = {}) => {
    const item = itemsRef.current.find(i => i.id === id);
    if (!item) return;
    if (item._evSyncing) {
      pushToast({
        tone: 'warn',
        text: '직전 변경을 저장 중입니다. 잠시 후 다시 눌러주세요.'
      });
      return;
    }
    const base = item.ev_ver;
    const prev = {
      ev_v: item.ev_v,
      ev_tags: item.ev_tags || [],
      ev_comment: item.ev_comment || ''
    };
    const mine = {
      ...prev,
      ...patch
    };
    const by = authorRef.current || '이름 미입력';
    const body = {
      ...mine,
      ev_by: by,
      ev_at: new Date().toISOString(),
      ev_ver: base + 1
    };
    patchRow(id, {
      ...body,
      _evSyncing: true
    });
    const {
      data,
      error
    } = await track(sb.from(TABLE).update(body).eq('id', id).eq('ev_ver', base).select());
    if (error) {
      patchRow(id, {
        ...prev,
        ev_ver: base,
        ev_by: item.ev_by,
        ev_at: item.ev_at,
        _evSyncing: false
      });
      pushToast({
        tone: 'error',
        text: `${item.name} 저장 실패: ${errMsg(error)}. 이전 값으로 되돌렸습니다.`,
        ttl: 7000,
        action: {
          label: '재시도',
          fn: () => commitRef.current(id, patch)
        }
      });
      return;
    }
    if (!data || !data.length) {
      const {
        data: fresh
      } = await sb.from(TABLE).select('*').eq('id', id).single();
      if (fresh) {
        replaceRow(fresh);
        if (fresh.archived) {
          setItems(list => list.filter(x => x.id !== id));
          pushToast({
            tone: 'warn',
            text: `${item.name}은(는) 다른 사람이 삭제했습니다.`
          });
          return;
        }
        setConflicts(c => [...c.filter(x => x.id !== id), {
          id,
          name: item.name,
          mine,
          theirs: fresh
        }]);
      }
      return;
    }
    replaceRow(data[0]);
    const what = 'ev_v' in patch ? `→ ${vmeta(mine.ev_v).label}` : '한 줄 평 저장';
    if (!opts.silent) pushToast({
      tone: mine.ev_v === 'unusable' ? 'error' : 'ok',
      text: `${item.name} ${what}`,
      action: {
        label: '되돌리기',
        fn: () => commitRef.current(id, prev, {
          silent: true
        })
      }
    });
  }, [patchRow, replaceRow, pushToast]);
  commitRef.current = commitEval;
  const setVerdict = useCallback((id, v) => commitEval(id, {
    ev_v: v
  }), [commitEval]);
  const resolveConflict = useCallback((c, keepMine) => {
    setConflicts(cs => cs.filter(x => x !== c));
    if (keepMine) commitRef.current(c.id, {
      ev_v: c.mine.ev_v,
      ev_tags: c.mine.ev_tags,
      ev_comment: c.mine.ev_comment
    });
  }, []);
  const addItem = useCallback(async form => {
    const tmpId = 'tmp-' + Date.now();
    const row = {
      ...form,
      requester: authorRef.current || ''
    };
    const tmp = {
      ...row,
      id: tmpId,
      no: null,
      ev_v: null,
      ev_tags: [],
      ev_comment: '',
      ev_by: null,
      ev_at: null,
      ev_ver: 0,
      created_at: new Date().toISOString(),
      _syncing: true
    };
    setItems(list => [tmp, ...list]);
    const {
      data,
      error
    } = await track(sb.from(TABLE).insert(row).select().single());
    if (error) {
      setItems(list => list.filter(x => x.id !== tmpId));
      pushToast({
        tone: 'error',
        ttl: 8000,
        text: `${form.name} 등록 실패: ${errMsg(error)}`,
        action: {
          label: '재시도',
          fn: () => addRef.current(form)
        }
      });
      return;
    }
    setItems(list => [data, ...list.filter(x => x.id !== tmpId && x.id !== data.id)]);
    pushToast({
      tone: 'ok',
      text: `#${data.no} ${data.name} 등록됨`,
      action: {
        label: '취소',
        fn: () => removeRef.current(data.id, true)
      }
    });
  }, [pushToast]);
  const addRef = useRef(addItem);
  addRef.current = addItem;
  const updateItem = useCallback(async (id, patch) => {
    const snap = itemsRef.current.find(x => x.id === id);
    if (!snap) return;
    patchRow(id, {
      ...patch,
      _syncing: true
    });
    const {
      data,
      error
    } = await track(sb.from(TABLE).update(patch).eq('id', id).select().single());
    if (error) {
      replaceRow(snap);
      pushToast({
        tone: 'error',
        ttl: 7000,
        text: `${snap.name} 수정 실패: ${errMsg(error)}`
      });
      return;
    }
    replaceRow(data);
    pushToast({
      tone: 'ok',
      text: `${data.name} 구매 정보 저장됨`
    });
  }, [patchRow, replaceRow, pushToast]);
  const mergeQty = useCallback((id, add) => {
    const it = itemsRef.current.find(x => x.id === id);
    if (it) updateItem(id, {
      qty: +(Number(it.qty) + add).toFixed(3)
    });
  }, [updateItem]);
  const removeRef = useRef(null);
  const removeItem = useCallback(async (id, silent) => {
    const snap = itemsRef.current.find(x => x.id === id);
    if (!snap) return;
    setItems(list => list.filter(x => x.id !== id));
    setExpanded(e => e?.id === id ? null : e);
    const {
      error
    } = await track(sb.from(TABLE).update({
      archived: true
    }).eq('id', id));
    if (error) {
      setItems(list => [snap, ...list]);
      pushToast({
        tone: 'error',
        text: `삭제 실패: ${errMsg(error)}`
      });
      return;
    }
    if (!silent) pushToast({
      tone: 'warn',
      ttl: 7000,
      text: `${snap.name} 삭제됨`,
      action: {
        label: '되돌리기',
        fn: async () => {
          const {
            data,
            error: e2
          } = await sb.from(TABLE).update({
            archived: false
          }).eq('id', id).select().single();
          if (e2) pushToast({
            tone: 'error',
            text: `복구 실패: ${errMsg(e2)}`
          });else setItems(list => [data, ...list.filter(x => x.id !== id)]);
        }
      }
    });
  }, [pushToast]);
  removeRef.current = removeItem;
  const toggleExpand = useCallback((id, toComment) => setExpanded(e => e?.id === id && !toComment ? null : {
    id,
    mode: toComment ? 'comment' : 'detail'
  }), []);
  useEffect(() => {
    const h = e => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);
  const toggleIn = setter => v => setter(a => a.includes(v) ? a.filter(x => x !== v) : [...a, v]);
  const tVerdict = useCallback(toggleIn(setFVerdict), []);
  const tCat = useCallback(toggleIn(setFCat), []);
  const tBrand = useCallback(toggleIn(setFBrand), []);
  const tPlace = useCallback(toggleIn(setFPlace), []);
  const searched = useMemo(() => {
    const tokens = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return items.filter(it => {
      if (tokens.length) {
        const h = derive(it).hay;
        if (!tokens.every(tk => h.includes(tk))) return false;
      }
      if (fCat.length && !fCat.includes(it.category)) return false;
      if (fBrand.length && !fBrand.includes(it.brand || '')) return false;
      if (fPlace.length && !fPlace.includes(it.purchase_place || '')) return false;
      return true;
    });
  }, [items, q, fCat, fBrand, fPlace]);
  const periodFrom = useMemo(() => {
    const d = new Date();
    if (period === 'm1') return ymd(new Date(d.getFullYear(), d.getMonth(), 1));
    if (period === 'm3') return ymd(new Date(d.getFullYear(), d.getMonth() - 2, 1));
    return '';
  }, [period]);
  const inPeriod = useMemo(() => periodFrom ? searched.filter(it => it.date >= periodFrom) : searched, [searched, periodFrom]);
  const vCounts = useMemo(() => {
    const c = {
      usable: 0,
      later: 0,
      unusable: 0,
      none: 0
    };
    inPeriod.forEach(it => {
      c[it.ev_v || 'none'] += 1;
    });
    return c;
  }, [inPeriod]);
  const byVerdict = list => fVerdict.length ? list.filter(it => fVerdict.includes(it.ev_v || 'none')) : list;
  const filtered = useMemo(() => [...byVerdict(inPeriod)].sort(byDateDesc), [inPeriod, fVerdict]);
  const calItems = useMemo(() => byVerdict(searched), [searched, fVerdict]);
  const kpi = useMemo(() => {
    const k = {
      spend: 0,
      count: filtered.length,
      usable: [0, 0],
      later: [0, 0],
      unusable: [0, 0],
      none: 0
    };
    filtered.forEach(it => {
      const a = derive(it).amount;
      k.spend += a;
      if (it.ev_v) {
        k[it.ev_v][0] += 1;
        k[it.ev_v][1] += a;
      } else k.none += 1;
    });
    return k;
  }, [filtered]);
  const names = useMemo(() => [...new Set(items.map(i => i.name))].slice(0, 300), [items]);
  const suppliers = useMemo(() => [...new Set(items.map(i => i.supplier).filter(Boolean))].slice(0, 300), [items]);
  const places = useMemo(() => [...new Set([...items].sort(byDateDesc).map(i => i.purchase_place).filter(Boolean))].slice(0, 8), [items]);
  const allPlaces = useMemo(() => [...new Set(items.map(i => i.purchase_place).filter(Boolean))].slice(0, 300), [items]);
  const brandChips = useMemo(() => [...new Set([...BRANDS, ...items.map(i => i.brand).filter(Boolean)])], [items]);
  const filterActive = q || fVerdict.length || fCat.length || fBrand.length || fPlace.length;
  const clearFilters = () => {
    setQuery('');
    setFVerdict([]);
    setFCat([]);
    setFBrand([]);
    setFPlace([]);
  };
  const renderRow = useCallback(it => React.createElement(PartRow, {
    key: it.id,
    item: it,
    places: places,
    expanded: expanded?.id === it.id ? expanded.mode : false,
    onVerdict: setVerdict,
    onEval: commitEval,
    onToggleExpand: toggleExpand,
    onUpdate: updateItem,
    onRemove: removeItem
  }), [expanded, places, setVerdict, commitEval, toggleExpand, updateItem, removeItem]);
  const saveAuthor = e => {
    e.preventDefault();
    const n = authorDraft.trim().slice(0, 20);
    if (!n) return;
    setAuthor(n);
    lsSet('pur_author', n);
    setAuthorDraft('');
  };
  const VIEWS = [{
    k: 'list',
    label: '리스트',
    icon: List
  }, {
    k: 'calendar',
    label: '달력',
    icon: CalendarDays
  }, {
    k: 'stats',
    label: '통계',
    icon: BarChart3
  }];
  const rtLabel = inflight ? `저장 중 ${inflight}` : rt === 'live' ? '실시간 연결' : rt === 'down' ? '실시간 끊김' : '연결 중';
  return React.createElement("div", {
    className: "min-h-screen bg-slate-100 text-slate-900"
  }, React.createElement("datalist", {
    id: "dl-names"
  }, names.map(n => React.createElement("option", {
    key: n,
    value: n
  }))), React.createElement("datalist", {
    id: "dl-places"
  }, allPlaces.map(n => React.createElement("option", {
    key: n,
    value: n
  }))), React.createElement("datalist", {
    id: "dl-suppliers"
  }, suppliers.map(n => React.createElement("option", {
    key: n,
    value: n
  }))), React.createElement("header", {
    className: "sticky top-0 z-40 border-b border-slate-800 bg-slate-900 text-white",
    style: {
      paddingTop: 'env(safe-area-inset-top, 0px)'
    }
  }, React.createElement("div", {
    className: "mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3"
  }, React.createElement("div", {
    className: "flex items-center gap-2"
  }, React.createElement("span", {
    className: "grid h-10 w-10 place-items-center rounded-xl bg-orange-600"
  }, React.createElement(ShoppingBasket, {
    size: 22
  })), React.createElement("div", null, React.createElement("h1", {
    className: "text-base font-extrabold leading-tight sm:text-lg"
  }, "식자재 구매·평가 보드"), React.createElement("p", {
    className: "text-xs text-slate-400"
  }, "인생푸드 메뉴개발 · 샘플 구매 기록과 사용 판정"))), React.createElement("div", {
    className: "ml-auto flex flex-wrap items-center gap-2"
  }, React.createElement("span", {
    className: `inline-flex h-10 items-center gap-2 rounded-full px-3 text-xs font-bold ${inflight ? 'bg-orange-500/20 text-orange-300' : rt === 'live' ? 'bg-emerald-500/15 text-emerald-300' : rt === 'down' ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-700 text-slate-300'}`
  }, inflight ? React.createElement(Loader2, {
    size: 14,
    className: "animate-spin"
  }) : React.createElement(Radio, {
    size: 14
  }), rtLabel), author && React.createElement("button", {
    type: "button",
    onClick: () => {
      setAuthorDraft(author);
      setAuthor('');
    },
    className: "inline-flex h-10 items-center gap-2 rounded-full bg-slate-800 px-3 text-sm font-bold text-white hover:bg-slate-700",
    title: "이름 바꾸기"
  }, React.createElement(User, {
    size: 15
  }), author)))), React.createElement("main", {
    className: "mx-auto max-w-7xl space-y-4 px-4 py-4 sm:py-6"
  }, !author && React.createElement("form", {
    onSubmit: saveAuthor,
    className: "flex flex-col gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 sm:flex-row sm:items-center"
  }, React.createElement("p", {
    className: "flex-1 text-sm text-sky-900"
  }, React.createElement("b", null, "이름을 한 번만 입력해 주세요."), " 누가 등록·판정했는지 기록에 남습니다. 이 기기에만 저장됩니다."), React.createElement("div", {
    className: "flex gap-2"
  }, React.createElement("input", {
    id: "author",
    value: authorDraft,
    onChange: e => setAuthorDraft(e.target.value),
    maxLength: 20,
    placeholder: "예: 이종욱",
    className: "h-12 w-40 rounded-xl border border-sky-300 bg-white px-3 text-base focus:border-slate-900 focus:outline-none"
  }), React.createElement("button", {
    type: "submit",
    className: "h-12 rounded-xl bg-sky-700 px-5 text-sm font-bold text-white"
  }, "저장"))), React.createElement("section", {
    className: "grid grid-cols-2 gap-3 lg:grid-cols-4"
  }, status === 'loading' ? Array.from({
    length: 4
  }).map((_, i) => React.createElement(Skel, {
    key: i,
    className: "h-24"
  })) : [{
    label: `총 지출 · ${PERIODS.find(p => p.k === period).label}`,
    value: fmtKRW(kpi.spend),
    sub: `${kpi.count}건${kpi.none ? ` · 평가 전 ${kpi.none}` : ''}`,
    tone: 'text-slate-900'
  }, {
    label: '사용 가능',
    value: `${kpi.usable[0]}건`,
    sub: fmtKRW(kpi.usable[1]),
    tone: 'text-emerald-700'
  }, {
    label: '추후 사용',
    value: `${kpi.later[0]}건`,
    sub: `${fmtKRW(kpi.later[1])} 보관`,
    tone: 'text-sky-700'
  }, {
    label: '사용 불가',
    value: `${kpi.unusable[0]}건`,
    sub: `${fmtKRW(kpi.unusable[1])} 반품·클레임 검토`,
    tone: 'text-rose-700'
  }].map(k => React.createElement("div", {
    key: k.label,
    className: "rounded-2xl border border-slate-200 bg-white px-4 py-3"
  }, React.createElement("p", {
    className: "truncate text-xs font-semibold text-slate-500"
  }, k.label), React.createElement("p", {
    className: `mt-1 truncate text-2xl font-extrabold tabular-nums ${k.tone}`
  }, k.value), React.createElement("p", {
    className: "truncate text-xs text-slate-500"
  }, k.sub)))), React.createElement("section", {
    className: "space-y-3 rounded-2xl border border-slate-200 bg-white p-4"
  }, React.createElement("div", {
    className: "flex flex-col gap-3 md:flex-row md:items-center"
  }, React.createElement("div", {
    className: "relative flex-1"
  }, React.createElement(Search, {
    size: 18,
    className: "absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
  }), React.createElement("input", {
    id: "search",
    ref: searchRef,
    value: query,
    onChange: e => setQuery(e.target.value),
    placeholder: "품목·구매처·거래처·한 줄 평·작성자 검색  ( / )",
    className: "h-12 w-full rounded-xl border border-slate-300 bg-slate-50 pl-11 pr-24 text-base focus:border-slate-900 focus:bg-white focus:outline-none"
  }), React.createElement("span", {
    className: "absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1"
  }, query !== q && React.createElement(Loader2, {
    size: 14,
    className: "animate-spin text-slate-400"
  }), query && React.createElement("button", {
    type: "button",
    onClick: () => setQuery(''),
    className: "rounded-lg p-2 text-slate-400 hover:bg-slate-200",
    "aria-label": "검색어 지우기"
  }, React.createElement(X, {
    size: 16
  })))), React.createElement("div", {
    className: "grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1"
  }, VIEWS.map(v => {
    const I = v.icon;
    return React.createElement("button", {
      key: v.k,
      type: "button",
      onClick: () => setView(v.k),
      className: `inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold ${view === v.k ? 'bg-white text-slate-900 shadow' : 'text-slate-500 hover:text-slate-800'}`
    }, React.createElement(I, {
      size: 16
    }), v.label);
  }))), React.createElement("div", {
    className: "flex gap-2 overflow-x-auto pb-1"
  }, view !== 'calendar' && PERIODS.map(p => React.createElement(Chip, {
    key: p.k,
    active: period === p.k,
    onClick: () => setPeriod(p.k)
  }, p.label)), view !== 'calendar' && React.createElement("span", {
    className: "mx-1 w-px shrink-0 bg-slate-200"
  }), VKEYS.map(k => React.createElement(Chip, {
    key: k,
    active: fVerdict.includes(k),
    onClick: () => tVerdict(k),
    dot: VERDICT[k].dot
  }, VERDICT[k].label, " ", React.createElement("span", {
    className: "tabular-nums opacity-70"
  }, vCounts[k]))), React.createElement(Chip, {
    active: fVerdict.includes('none'),
    onClick: () => tVerdict('none'),
    dot: NONE.dot
  }, NONE.label, " ", React.createElement("span", {
    className: "tabular-nums opacity-70"
  }, vCounts.none))), React.createElement("div", {
    className: "flex gap-2 overflow-x-auto pb-1"
  }, CATS.map(c => React.createElement(Chip, {
    key: c,
    active: fCat.includes(c),
    onClick: () => tCat(c)
  }, c)), React.createElement("span", {
    className: "mx-1 w-px shrink-0 bg-slate-200"
  }), brandChips.map(b => React.createElement(Chip, {
    key: b,
    active: fBrand.includes(b),
    onClick: () => tBrand(b)
  }, b)), places.length > 0 && React.createElement("span", {
    className: "mx-1 w-px shrink-0 bg-slate-200"
  }), places.map(p => React.createElement(Chip, {
    key: p,
    active: fPlace.includes(p),
    onClick: () => tPlace(p),
    dot: "bg-sky-500"
  }, p)), filterActive ? React.createElement("button", {
    type: "button",
    onClick: clearFilters,
    className: "inline-flex h-11 shrink-0 items-center gap-1 rounded-full px-4 text-sm font-bold text-orange-700 hover:bg-orange-50"
  }, React.createElement(RotateCcw, {
    size: 14
  }), "필터 초기화") : null)), conflicts.map(c => React.createElement("div", {
    key: c.id,
    className: "flex flex-col gap-3 rounded-2xl border-2 border-amber-400 bg-amber-50 p-4 md:flex-row md:items-center"
  }, React.createElement(AlertTriangle, {
    className: "shrink-0 text-amber-600"
  }), React.createElement("div", {
    className: "flex-1 text-sm text-amber-950"
  }, React.createElement("b", null, c.name), " · 동시 편집 충돌", React.createElement("br", null), React.createElement("span", {
    className: "text-amber-800"
  }, c.theirs.ev_by || '다른 사람', "님이 먼저 ", React.createElement("b", null, vmeta(c.theirs.ev_v).label), c.theirs.ev_comment ? ` (“${c.theirs.ev_comment}”)` : '', "로 저장했습니다. 내 입력: ", React.createElement("b", null, vmeta(c.mine.ev_v).label), c.mine.ev_comment ? ` (“${c.mine.ev_comment}”)` : '')), React.createElement("div", {
    className: "flex gap-2"
  }, React.createElement("button", {
    type: "button",
    onClick: () => resolveConflict(c, false),
    className: "h-12 flex-1 rounded-xl border border-amber-500 bg-white px-4 text-sm font-bold text-amber-900 md:flex-none"
  }, "상대 값 유지"), React.createElement("button", {
    type: "button",
    onClick: () => resolveConflict(c, true),
    className: "h-12 flex-1 rounded-xl bg-amber-600 px-4 text-sm font-bold text-white md:flex-none"
  }, "내 값으로 덮어쓰기")))), status === 'error' ? React.createElement("div", {
    className: "rounded-2xl border-2 border-rose-300 bg-rose-50 p-6 text-center"
  }, React.createElement("p", {
    className: "font-bold text-rose-800"
  }, "데이터를 불러오지 못했습니다."), React.createElement("p", {
    className: "mt-1 text-sm text-rose-700"
  }, loadErr), React.createElement("button", {
    type: "button",
    onClick: load,
    className: "mt-4 inline-flex h-12 items-center gap-2 rounded-xl bg-rose-700 px-5 text-sm font-bold text-white"
  }, React.createElement(RefreshCw, {
    size: 16
  }), "다시 시도")) : status === 'loading' ? React.createElement("div", {
    className: "space-y-3"
  }, React.createElement(Skel, {
    className: "h-40"
  }), Array.from({
    length: 4
  }).map((_, i) => React.createElement("div", {
    key: i,
    className: "grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 lg:grid-cols-12"
  }, React.createElement("div", {
    className: "space-y-2 lg:col-span-4"
  }, React.createElement(Skel, {
    className: "h-4 w-32"
  }), React.createElement(Skel, {
    className: "h-5 w-3/4"
  }), React.createElement(Skel, {
    className: "h-3 w-1/2"
  })), React.createElement("div", {
    className: "space-y-2 lg:col-span-2"
  }, React.createElement(Skel, {
    className: "h-6 w-24"
  }), React.createElement(Skel, {
    className: "h-3 w-20"
  })), React.createElement("div", {
    className: "space-y-2 lg:col-span-5"
  }, React.createElement("div", {
    className: "grid grid-cols-3 gap-2"
  }, [0, 1, 2].map(j => React.createElement(Skel, {
    key: j,
    className: "h-12"
  }))), React.createElement(Skel, {
    className: "h-4 w-2/3"
  }))))) : view === 'list' ? React.createElement("div", {
    className: "space-y-3"
  }, React.createElement(QuickAdd, {
    items: items,
    places: places,
    onAdd: addItem,
    onMerge: mergeQty
  }), React.createElement("div", {
    className: "flex items-center justify-between px-1 text-sm text-slate-500"
  }, React.createElement("span", null, React.createElement("b", {
    className: "text-slate-900"
  }, filtered.length), "건 ", filterActive || period !== 'all' ? `(전체 ${items.length}건)` : ''), filtered.length > 0 && !q && React.createElement("span", {
    className: "flex gap-1"
  }, React.createElement("button", {
    type: "button",
    onClick: () => setOpenAll({
      v: true,
      t: Date.now()
    }),
    className: "h-9 rounded-lg px-3 text-sm font-semibold text-slate-600 hover:bg-slate-200"
  }, "모두 펼치기"), React.createElement("button", {
    type: "button",
    onClick: () => setOpenAll({
      v: false,
      t: Date.now()
    }),
    className: "h-9 rounded-lg px-3 text-sm font-semibold text-slate-600 hover:bg-slate-200"
  }, "모두 접기"))), filtered.length ? React.createElement(GroupedList, {
    items: filtered,
    renderRow: renderRow,
    forceOpen: !!q,
    openAll: openAll
  }) : React.createElement("div", {
    className: "rounded-2xl border border-slate-200 bg-white p-10 text-center"
  }, items.length === 0 ? React.createElement(React.Fragment, null, React.createElement("p", {
    className: "font-bold text-slate-700"
  }, "아직 등록된 구매 내역이 없습니다."), React.createElement("p", {
    className: "mt-1 text-sm text-slate-500"
  }, "위 칸에 첫 품목을 추가해 보세요.")) : React.createElement(React.Fragment, null, React.createElement("p", {
    className: "font-bold text-slate-700"
  }, "조건에 맞는 품목이 없습니다."), React.createElement("button", {
    type: "button",
    onClick: () => {
      clearFilters();
      setPeriod('all');
    },
    className: "mt-3 h-11 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white"
  }, "필터 초기화 · 전체 기간")))) : view === 'calendar' ? React.createElement(CalendarView, {
    items: calItems,
    month: month,
    setMonth: setMonth,
    selDay: selDay,
    setSelDay: setSelDay,
    renderRow: renderRow
  }) : React.createElement(StatsView, {
    items: filtered,
    activity: activity
  })), React.createElement("div", {
    className: "pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 px-4 sm:items-end",
    style: {
      paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))'
    }
  }, toasts.map(t => React.createElement("div", {
    key: t.id,
    className: `pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-2xl ${t.tone === 'error' ? 'bg-rose-700' : t.tone === 'warn' ? 'bg-amber-700' : 'bg-slate-900'}`
  }, React.createElement("span", {
    className: "flex-1"
  }, t.text), t.action && React.createElement("button", {
    type: "button",
    onClick: () => {
      t.action.fn();
      dismissToast(t.id);
    },
    className: "h-10 shrink-0 rounded-lg bg-white/15 px-3 font-bold hover:bg-white/25"
  }, t.action.label), React.createElement("button", {
    type: "button",
    onClick: () => dismissToast(t.id),
    className: "shrink-0 rounded-lg p-1 opacity-70 hover:opacity-100",
    "aria-label": "닫기"
  }, React.createElement(X, {
    size: 16
  }))))));
}
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App, null));