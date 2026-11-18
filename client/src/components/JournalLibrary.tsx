import { useEffect, useMemo, useState } from "react";
import type {
  JournalDocument,
  JournalLanguage,
  JournalStatus,
  JournalTranslation,
} from "../lib/journalTypes";
import "./journalLibrary.css";

const STORAGE_KEY = "rebiomed.journal-library.v1";

const languageOptions: JournalLanguage[] = [
  "English",
  "Vietnamese",
  "Chinese",
  "Japanese",
  "Other",
];

const statusLabels: Record<JournalStatus, string> = {
  draft: "Bản nháp",
  published: "Đã duyệt",
  archived: "Lưu trữ",
};

const demoDocument: JournalDocument = {
  id: "demo-journal-001",
  title: "Example scientific article",
  authors: "Add authors",
  journal: "Add journal name",
  year: "2026",
  doi: "",
  sourceLanguage: "English",
  sourceUrl: "",
  abstract: "Thêm phần tóm tắt của tài liệu tại đây.",
  tags: ["demo", "translation"],
  status: "draft",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  translations: [
    {
      id: "demo-translation-001",
      language: "Vietnamese",
      title: "Bản dịch tiếng Việt",
      content: "Dán bản dịch khoa học vào đây để bắt đầu.",
      translator: "",
      status: "draft",
      updatedAt: new Date().toISOString(),
    },
  ],
};

function readDocuments(): JournalDocument[] {
  if (typeof window === "undefined") return [demoDocument];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [demoDocument];
    const parsed = JSON.parse(raw) as JournalDocument[];
    return Array.isArray(parsed) ? parsed : [demoDocument];
  } catch {
    return [demoDocument];
  }
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function statusClass(status: JournalStatus) {
  return `journal-status journal-status-${status}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function JournalLibrary() {
  const [documents, setDocuments] = useState<JournalDocument[]>(readDocuments);
  const [selectedId, setSelectedId] = useState<string | null>(documents[0]?.id ?? null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | JournalStatus>("all");
  const [languageFilter, setLanguageFilter] = useState<"all" | JournalLanguage>("all");
  const [activeTranslationId, setActiveTranslationId] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showTranslationEditor, setShowTranslationEditor] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return documents.filter((document) => {
      const matchesQuery = !normalized || [
        document.title,
        document.authors,
        document.journal,
        document.doi,
        ...document.tags,
      ].join(" ").toLowerCase().includes(normalized);
      const matchesStatus = statusFilter === "all" || document.status === statusFilter;
      const matchesLanguage = languageFilter === "all" || document.sourceLanguage === languageFilter;
      return matchesQuery && matchesStatus && matchesLanguage;
    });
  }, [documents, languageFilter, query, statusFilter]);

  const selectedDocument = documents.find((document) => document.id === selectedId) ?? filteredDocuments[0] ?? null;
  const selectedTranslation = selectedDocument?.translations.find((item) => item.id === activeTranslationId)
    ?? selectedDocument?.translations[0]
    ?? null;

  useEffect(() => {
    if (selectedDocument && selectedDocument.id !== selectedId) setSelectedId(selectedDocument.id);
    if (selectedTranslation && selectedTranslation.id !== activeTranslationId) setActiveTranslationId(selectedTranslation.id);
  }, [activeTranslationId, selectedDocument, selectedId, selectedTranslation]);

  function updateDocument(id: string, patch: Partial<JournalDocument>) {
    setDocuments((current) => current.map((document) => document.id === id
      ? { ...document, ...patch, updatedAt: new Date().toISOString() }
      : document));
  }

  function updateTranslation(documentId: string, translationId: string, patch: Partial<JournalTranslation>) {
    setDocuments((current) => current.map((document) => document.id === documentId
      ? {
        ...document,
        updatedAt: new Date().toISOString(),
        translations: document.translations.map((translation) => translation.id === translationId
          ? { ...translation, ...patch, updatedAt: new Date().toISOString() }
          : translation),
      }
      : document));
  }

  function createDocument() {
    const now = new Date().toISOString();
    const document: JournalDocument = {
      id: makeId("journal"),
      title: "Tài liệu khoa học mới",
      authors: "",
      journal: "",
      year: String(new Date().getFullYear()),
      doi: "",
      sourceLanguage: "English",
      sourceUrl: "",
      abstract: "",
      tags: [],
      status: "draft",
      createdAt: now,
      updatedAt: now,
      translations: [],
    };
    setDocuments((current) => [document, ...current]);
    setSelectedId(document.id);
    setActiveTranslationId(null);
    setShowEditor(true);
    setNotice("Đã tạo tài liệu nháp.");
  }

  function createTranslation() {
    if (!selectedDocument) return;
    const translation: JournalTranslation = {
      id: makeId("translation"),
      language: "Vietnamese",
      title: `Bản dịch: ${selectedDocument.title}`,
      content: "",
      translator: "",
      status: "draft",
      updatedAt: new Date().toISOString(),
    };
    updateDocument(selectedDocument.id, { translations: [...selectedDocument.translations, translation] });
    setActiveTranslationId(translation.id);
    setShowTranslationEditor(true);
    setNotice("Đã tạo bản dịch nháp.");
  }

  function deleteDocument() {
    if (!selectedDocument || !window.confirm("Xóa tài liệu này khỏi thư viện trên trình duyệt?")) return;
    setDocuments((current) => current.filter((document) => document.id !== selectedDocument.id));
    setSelectedId(null);
    setNotice("Đã xóa tài liệu.");
  }

  return (
    <section className="journal-library" aria-label="Thư viện Journal">
      <header className="journal-hero">
        <div>
          <span className="journal-kicker">RESEARCH REFERENCE / TRANSLATION ARCHIVE</span>
          <h1>Thư viện Journal</h1>
          <p>Lưu tài liệu khoa học, bản dịch và ghi chú nghiên cứu trong một không gian có thể tra cứu.</p>
        </div>
        <button className="journal-primary-button" type="button" onClick={createDocument}>+ Thêm tài liệu</button>
      </header>

      <div className="journal-notice" role="status">
        <span>{notice || "Bản thử nghiệm này lưu dữ liệu trên trình duyệt hiện tại."}</span>
        <span className="journal-local-badge">LOCAL DRAFT STORAGE</span>
      </div>

      <div className="journal-toolbar">
        <label className="journal-search"><span>Tìm kiếm</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên tài liệu, tác giả, DOI, từ khóa..." /></label>
        <label><span>Trạng thái</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | JournalStatus)}><option value="all">Tất cả</option><option value="draft">Bản nháp</option><option value="published">Đã duyệt</option><option value="archived">Lưu trữ</option></select></label>
        <label><span>Ngôn ngữ gốc</span><select value={languageFilter} onChange={(event) => setLanguageFilter(event.target.value as "all" | JournalLanguage)}><option value="all">Tất cả</option>{languageOptions.map((language) => <option key={language} value={language}>{language}</option>)}</select></label>
      </div>

      <div className="journal-layout">
        <aside className="journal-list" aria-label="Danh sách tài liệu">
          <div className="journal-list-heading"><strong>{filteredDocuments.length} tài liệu</strong><span>cập nhật gần đây</span></div>
          {filteredDocuments.map((document) => (
            <button key={document.id} type="button" className={`journal-list-item ${selectedDocument?.id === document.id ? "is-selected" : ""}`} onClick={() => { setSelectedId(document.id); setShowEditor(false); }}>
              <span className={statusClass(document.status)}>{statusLabels[document.status]}</span>
              <strong>{document.title}</strong>
              <small>{document.authors || "Chưa nhập tác giả"}</small>
              <small>{document.journal || "Chưa nhập tạp chí"} · {document.year}</small>
            </button>
          ))}
          {filteredDocuments.length === 0 && <div className="journal-empty">Không tìm thấy tài liệu phù hợp.</div>}
        </aside>

        <main className="journal-detail">
          {!selectedDocument ? <div className="journal-empty journal-empty-large"><strong>Chọn một tài liệu để bắt đầu.</strong><button className="journal-secondary-button" type="button" onClick={createDocument}>Tạo tài liệu đầu tiên</button></div> : <>
            <div className="journal-detail-heading">
              <div><span className={statusClass(selectedDocument.status)}>{statusLabels[selectedDocument.status]}</span><h2>{selectedDocument.title}</h2><p>{selectedDocument.authors || "Chưa nhập tác giả"} · {selectedDocument.journal || "Chưa nhập tạp chí"} · {selectedDocument.year}</p></div>
              <div className="journal-actions"><button type="button" onClick={() => setShowEditor((value) => !value)}>{showEditor ? "Đóng chỉnh sửa" : "Chỉnh sửa"}</button><button type="button" className="journal-danger-button" onClick={deleteDocument}>Xóa</button></div>
            </div>

            {showEditor && <div className="journal-editor journal-card"><h3>Thông tin tài liệu</h3><div className="journal-form-grid"><label>Tiêu đề<input value={selectedDocument.title} onChange={(event) => updateDocument(selectedDocument.id, { title: event.target.value })} /></label><label>Tác giả<input value={selectedDocument.authors} onChange={(event) => updateDocument(selectedDocument.id, { authors: event.target.value })} /></label><label>Tạp chí / nguồn<input value={selectedDocument.journal} onChange={(event) => updateDocument(selectedDocument.id, { journal: event.target.value })} /></label><label>Năm xuất bản<input value={selectedDocument.year} onChange={(event) => updateDocument(selectedDocument.id, { year: event.target.value })} /></label><label>DOI<input value={selectedDocument.doi} onChange={(event) => updateDocument(selectedDocument.id, { doi: event.target.value })} placeholder="10.xxxx/xxxxx" /></label><label>Ngôn ngữ gốc<select value={selectedDocument.sourceLanguage} onChange={(event) => updateDocument(selectedDocument.id, { sourceLanguage: event.target.value as JournalLanguage })}>{languageOptions.map((language) => <option key={language}>{language}</option>)}</select></label><label className="journal-form-wide">Link tài liệu gốc<input value={selectedDocument.sourceUrl} onChange={(event) => updateDocument(selectedDocument.id, { sourceUrl: event.target.value })} placeholder="https://..." /></label><label className="journal-form-wide">Tóm tắt<textarea value={selectedDocument.abstract} onChange={(event) => updateDocument(selectedDocument.id, { abstract: event.target.value })} rows={4} /></label></div><label>Trạng thái<select value={selectedDocument.status} onChange={(event) => updateDocument(selectedDocument.id, { status: event.target.value as JournalStatus })}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>}

            <div className="journal-reading-grid">
              <article className="journal-card journal-source-card"><div className="journal-card-heading"><div><span className="journal-section-label">01 / SOURCE</span><h3>Tài liệu gốc</h3></div>{selectedDocument.sourceUrl && <a href={selectedDocument.sourceUrl} target="_blank" rel="noreferrer">Mở nguồn ↗</a>}</div><p className="journal-abstract">{selectedDocument.abstract || "Chưa có tóm tắt."}</p>{selectedDocument.doi && <p className="journal-doi">DOI: {selectedDocument.doi}</p>}</article>
              <article className="journal-card journal-translation-card"><div className="journal-card-heading"><div><span className="journal-section-label">02 / TRANSLATION</span><h3>Bản dịch</h3></div><button type="button" onClick={createTranslation}>+ Thêm bản dịch</button></div>{selectedDocument.translations.length > 0 ? <><div className="journal-translation-tabs">{selectedDocument.translations.map((translation) => <button key={translation.id} type="button" className={selectedTranslation?.id === translation.id ? "is-active" : ""} onClick={() => setActiveTranslationId(translation.id)}>{translation.language}</button>)}</div>{selectedTranslation && <div className="journal-translation-content"><div className="journal-translation-meta"><span>{selectedTranslation.translator || "Chưa nhập người dịch"}</span><span>{formatDate(selectedTranslation.updatedAt)}</span></div><h4>{selectedTranslation.title}</h4><p>{selectedTranslation.content || "Bản dịch chưa có nội dung."}</p><button type="button" className="journal-secondary-button" onClick={() => setShowTranslationEditor((value) => !value)}>{showTranslationEditor ? "Đóng trình soạn" : "Sửa bản dịch"}</button>{showTranslationEditor && <div className="journal-translation-editor"><label>Ngôn ngữ<select value={selectedTranslation.language} onChange={(event) => updateTranslation(selectedDocument.id, selectedTranslation.id, { language: event.target.value as JournalLanguage })}>{languageOptions.map((language) => <option key={language}>{language}</option>)}</select></label><label>Tiêu đề bản dịch<input value={selectedTranslation.title} onChange={(event) => updateTranslation(selectedDocument.id, selectedTranslation.id, { title: event.target.value })} /></label><label>Người dịch<input value={selectedTranslation.translator} onChange={(event) => updateTranslation(selectedDocument.id, selectedTranslation.id, { translator: event.target.value })} /></label><label>Nội dung bản dịch<textarea value={selectedTranslation.content} onChange={(event) => updateTranslation(selectedDocument.id, selectedTranslation.id, { content: event.target.value })} rows={12} /></label><label>Trạng thái<select value={selectedTranslation.status} onChange={(event) => updateTranslation(selectedDocument.id, selectedTranslation.id, { status: event.target.value as JournalStatus })}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>}</div>}</> : <div className="journal-empty">Chưa có bản dịch. Tạo bản dịch đầu tiên cho tài liệu này.</div>}</article>
            </div>
          </>}
        </main>
      </div>
    </section>
  );
}
