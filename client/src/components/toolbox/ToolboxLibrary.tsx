import { useMemo, useState } from 'react';
import { ArrowRight, BookOpen, Calculator, Clock3, Search, SlidersHorizontal, Star, Wrench, LockKeyhole } from 'lucide-react';
import { normalizeToolSearch } from '@/lib/toolboxPreferences';
export type ToolboxItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  kind: 'calculator' | 'protocol' | 'utility';
  locked?: boolean;
  open: () => void;
};
const kindLabels = { calculator: 'Tính toán', protocol: 'Quy trình', utility: 'Tiện ích' };
const kindIcons = { calculator: Calculator, protocol: BookOpen, utility: Wrench };
export function ToolboxLibrary({ items, favorites, recent, onFavorite, onOpen, loading, error, onRetry }: {
  items: ToolboxItem[];
  favorites: string[];
  recent: string[];
  onFavorite: (id: string) => void;
  onOpen: (item: ToolboxItem) => void;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  const [query, setQuery] = useState('');
  const [collection, setCollection] = useState<'all' | 'favorites' | 'recent'>('all');
  const [kind, setKind] = useState('all');
  const [category, setCategory] = useState('all');
  const categories = [...new Set(items.filter(item => kind === 'all' || item.kind === kind).map(item => item.category))].sort((a, b) => a.localeCompare(b, 'vi'));
  const results = useMemo(() => {
    const words = normalizeToolSearch(query).split(/\s+/).filter(Boolean);
    const filtered = items.filter(item => (kind === 'all' || item.kind === kind) && (category === 'all' || category === item.category) && (collection !== 'favorites' || favorites.includes(item.id)) && (collection !== 'recent' || recent.includes(item.id)) && words.every(word => normalizeToolSearch(`${item.name} ${item.description} ${item.category} ${kindLabels[item.kind]}`).includes(word)));
    return collection === 'recent' ? filtered.sort((a, b) => recent.indexOf(a.id) - recent.indexOf(b.id)) : filtered;
  }, [items, query, kind, category, collection, favorites, recent]);
  const reset = () => { setQuery(''); setKind('all'); setCategory('all'); setCollection('all'); };
  return <section className="toolbox-library" aria-labelledby="toolbox-title">
    <div className="bench-intro"><div><h1 id="toolbox-title">Hộp công cụ</h1><p>Tìm công cụ, mở quy trình, tiếp tục công việc.</p></div><span className="local-preference-note">Yêu thích & gần đây lưu trên trình duyệt này</span></div>
    <div className="toolbox-toolbar">
      <div className="toolbox-search"><Search size={18} aria-hidden="true"/><input id="toolbox-search" type="search" aria-label="Tìm công cụ hoặc quy trình" placeholder="Tìm tên, mục đích hoặc nhóm công cụ…" value={query} onChange={event => setQuery(event.target.value)}/><kbd>⌘ / Ctrl K</kbd></div>
      <label className="toolbox-select"><SlidersHorizontal size={16} aria-hidden="true"/><span className="sr-only">Loại tài nguyên</span><select value={kind} onChange={event => { setKind(event.target.value); setCategory('all'); }}><option value="all">Mọi loại</option><option value="calculator">Tính toán</option><option value="protocol">Quy trình</option><option value="utility">Tiện ích</option></select></label>
      <label className="toolbox-select"><span className="sr-only">Nhóm công việc</span><select value={category} onChange={event => setCategory(event.target.value)}><option value="all">Mọi nhóm công việc</option>{categories.map(value => <option key={value}>{value}</option>)}</select></label>
    </div>
    <div className="toolbox-collections"><div role="group" aria-label="Bộ sưu tập công cụ">{([{ id: 'all', name: 'Tất cả', icon: null }, { id: 'favorites', name: 'Yêu thích', icon: Star }, { id: 'recent', name: 'Gần đây', icon: Clock3 }] as const).map(tab => <button key={tab.id} type="button" className={collection === tab.id ? 'active' : ''} aria-pressed={collection === tab.id} onClick={() => setCollection(tab.id)}>{tab.icon && <tab.icon size={15}/>} {tab.name}</button>)}</div><span role="status">{results.length} mục{query && ' khớp tìm kiếm'}</span></div>
    {error && <div className="toolbox-load-error" role="alert"><span>Chưa tải được toàn bộ thư viện. Các công cụ có sẵn vẫn có thể sử dụng.</span><button type="button" onClick={onRetry}>Thử lại</button></div>}
    {loading && <p className="toolbox-loading" role="status">Đang cập nhật thư viện…</p>}
    <div className="toolbox-list" aria-label="Danh sách công cụ" aria-busy={loading}>
      <div className="toolbox-list-head" aria-hidden="true"><span>Công cụ / quy trình</span><span>Nhóm công việc</span><span>Loại</span><span/></div>
      {results.map(item => { const Icon = kindIcons[item.kind]; return <div key={item.id} className="toolbox-row">
        <button type="button" className="toolbox-open" onClick={() => onOpen(item)} aria-label={`Mở ${item.name}${item.locked ? ' — cần tài khoản thành viên' : ''}`}><Icon size={18} aria-hidden="true"/><span><strong>{item.name}{item.locked && <LockKeyhole className="resource-lock" size={13} aria-label="Cần tài khoản thành viên"/>}</strong><small>{item.description || 'Mở để xem nội dung và hướng dẫn sử dụng.'}</small></span><span className="toolbox-category">{item.category}</span><span className="toolbox-kind">{item.locked ? <><LockKeyhole size={13}/> Thành viên</> : kindLabels[item.kind]}</span><ArrowRight className="toolbox-row-arrow" size={16} aria-hidden="true"/></button>
        <button type="button" className={`toolbox-favorite ${favorites.includes(item.id) ? 'selected' : ''}`} onClick={() => onFavorite(item.id)} aria-label={`${favorites.includes(item.id) ? 'Bỏ yêu thích' : 'Yêu thích'} ${item.name}`} aria-pressed={favorites.includes(item.id)} title="Lưu vào yêu thích"><Star size={17} fill={favorites.includes(item.id) ? 'currentColor' : 'none'}/></button>
      </div>; })}
    </div>
    {!loading && !results.length && <div className="toolbox-empty"><Search size={24}/><h2>{collection === 'favorites' ? 'Chưa có công cụ yêu thích phù hợp' : collection === 'recent' ? 'Chưa có công cụ gần đây phù hợp' : 'Không tìm thấy tài nguyên'}</h2><p>{collection === 'favorites' ? 'Dùng ngôi sao cạnh mỗi mục để lưu công cụ thường dùng.' : collection === 'recent' ? 'Các công cụ bạn mở sẽ xuất hiện tại đây.' : 'Thử tên ngắn hơn hoặc bỏ bớt bộ lọc.'}</p><button type="button" onClick={reset}>Xem toàn bộ thư viện</button></div>}
  </section>;
}
