import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowRight,
  Download,
  Facebook,
  FileText,
  Mail,
  Menu,
  MessageCircle,
  Phone,
  Plus,
  Printer,
  Settings,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import './styles.css';
import {
  assets,
  business,
  faqs,
  invoiceLabels,
  languages,
  selectOptions,
  services,
} from './data/content';
import {
  buildWhatsAppUrl,
  insertRecord,
  isSupabaseConfigured,
  listRecords,
  mailTo,
  updateRecord,
  uploadResume,
} from './lib/storage';

const initialLead = {
  preferred_language: 'English',
  name: '',
  phone: '',
  email: '',
  zip_code: '',
  address_notes: '',
  service_needed: 'Mobile mechanic',
  vehicle_type: 'Car',
  year: '',
  make: '',
  model: '',
  engine_type: '',
  issue_description: '',
  urgency: 'Emergency / Now',
  photo_urls: [],
  status: 'New',
  internal_notes: '',
};

const initialApplication = {
  preferred_language: 'English',
  full_name: '',
  phone: '',
  email: '',
  city_zip: '',
  position_interest: 'Mechanic',
  experience_summary: '',
  skills: '',
  has_tools: 'Yes',
  has_transportation: 'Yes',
  availability: 'Full-time',
  resume_url: '',
  additional_notes: '',
  status: 'New',
  internal_notes: '',
};

const initialInvoice = {
  invoice_number: '',
  invoice_type: 'Invoice',
  status: 'Draft',
  preferred_language: 'English',
  date: new Date().toISOString().slice(0, 10),
  business_name: business.legalName,
  mechanic_name: '',
  business_phone: business.phone,
  client_name: '',
  client_address: '',
  client_phone: '',
  client_email: '',
  make: '',
  model: '',
  year: '',
  miles: '',
  hours: '',
  job_description: '',
  tax_rate: 0,
  payment_method: 'Cash',
  signature_name: '',
  notes: '',
  items: [
    { category: 'Labor', description: 'Labor', quantity: 1, unit_price: 0 },
    { category: 'Parts', description: 'Parts', quantity: 1, unit_price: 0 },
  ],
};

function getLangFromPath() {
  return window.location.pathname.startsWith('/es') ? 'es' : 'en';
}

function money(value) {
  return Number(value || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function optionLabel(pair, lang) {
  return lang === 'es' ? pair[1] : pair[0];
}

function ContactButtons({ t, compact = false }) {
  const instagramReady = business.instagram && !business.instagram.includes('ADD_');
  const buttonClass = compact ? 'btn btn-small' : 'btn';
  return (
    <div className="contact-actions">
      <a className={`${buttonClass} btn-primary`} href={`tel:${business.phone}`}>
        <Phone size={18} /> {t.buttons.call}
      </a>
      <a className={`${buttonClass} btn-green`} href={buildWhatsAppUrl('Hello Car Daddy By Torres, I need service.')} target="_blank" rel="noreferrer">
        <MessageCircle size={18} /> {t.buttons.whatsapp}
      </a>
      <a className={`${buttonClass} btn-muted`} href={`mailto:${business.email}`}>
        <Mail size={18} /> {t.buttons.email}
      </a>
      <a className={`${buttonClass} btn-muted`} href={business.facebook} target="_blank" rel="noreferrer">
        <Facebook size={18} /> Facebook
      </a>
      <a className={`${buttonClass} btn-muted ${instagramReady ? '' : 'is-placeholder'}`} href={instagramReady ? business.instagram : '#contact'} title="Add Instagram URL in src/data/content.js">
        Instagram
      </a>
    </div>
  );
}

function Header({ lang, setLang, t }) {
  const [open, setOpen] = useState(false);
  const switchLang = (next) => {
    setLang(next);
    window.history.pushState({}, '', languages[next].homePath);
    setOpen(false);
  };
  return (
    <header className="site-header">
      <a className="brand" href={t.homePath} onClick={(event) => event.preventDefault()}>
        <img src={assets.profile} alt="" />
        <span>{business.name}</span>
      </a>
      <button className="icon-button menu-toggle" onClick={() => setOpen(!open)} aria-label="Open menu">
        {open ? <X /> : <Menu />}
      </button>
      <nav className={open ? 'nav nav-open' : 'nav'}>
        {['home', 'services', 'towing', 'request', 'team', 'faq', 'contact'].map((id, index) => (
          <a key={id} href={`#${id}`} onClick={() => setOpen(false)}>
            {t.nav[index]}
          </a>
        ))}
        <a href="/admin">Admin</a>
        <div className="language-switch" aria-label="Language switcher">
          <button className={lang === 'en' ? 'active' : ''} onClick={() => switchLang('en')}>EN</button>
          <span>|</span>
          <button className={lang === 'es' ? 'active' : ''} onClick={() => switchLang('es')}>ES</button>
        </div>
      </nav>
    </header>
  );
}

function Hero({ t }) {
  return (
    <section id="home" className="hero">
      <img src={assets.hero} alt="" className="hero-bg" />
      <div className="hero-overlay" />
      <div className="hero-content">
        <p className="eyebrow">{t.hero.eyebrow}</p>
        <h1>{t.hero.title}</h1>
        <p className="hero-subtitle">{t.hero.subtitle}</p>
        <p className="hero-support">{t.hero.support}</p>
        <div className="hero-actions">
          <ContactButtons t={t} />
          <a className="btn btn-light" href="#request">
            {t.buttons.request} <ArrowRight size={18} />
          </a>
        </div>
      </div>
    </section>
  );
}

function ServicesSection({ lang, t }) {
  return (
    <section id="services" className="section">
      <div className="section-heading">
        <p className="eyebrow">Car Daddy By Torres LLC</p>
        <h2>{t.servicesTitle}</h2>
        <p>{t.servicesIntro}</p>
      </div>
      <div className="service-grid">
        {services.map(([en, es, ServiceIcon, assetKey]) => {
          const icon = React.createElement(ServiceIcon, { className: 'service-icon' });
          return (
            <article className="service-card" key={en}>
              <img src={assets[assetKey]} alt="" />
              <div>
                {icon}
                <h3>{lang === 'es' ? es : en}</h3>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function InfoBands({ t }) {
  return (
    <>
      <section id="towing" className="split-band">
        <div>
          <p className="eyebrow">24/7</p>
          <h2>{t.towing.title}</h2>
          <p>{t.towing.body}</p>
          <ContactButtons t={t} compact />
        </div>
        <img src={assets.diesel} alt="" />
      </section>
      <section className="section compact-section">
        <div className="two-col">
          <article>
            <h2>{t.area.title}</h2>
            <p>{t.area.body}</p>
          </article>
          <article>
            <h2>{t.about.title}</h2>
            <p>{t.about.body}</p>
          </article>
        </div>
      </section>
    </>
  );
}

function Field({ label, children, required }) {
  return (
    <label className="field">
      <span>
        {label} {required ? <b>*</b> : null}
      </span>
      {children}
    </label>
  );
}

function SelectField({ label, value, onChange, options, lang, required }) {
  return (
    <Field label={label} required={required}>
      <select value={value} onChange={(event) => onChange(event.target.value)} required={required}>
        {options.map((pair) => (
          <option key={pair[0]} value={pair[0]}>
            {optionLabel(pair, lang)}
          </option>
        ))}
      </select>
    </Field>
  );
}

function RequestForm({ lang, t, onSaved }) {
  const [form, setForm] = useState({ ...initialLead, preferred_language: lang === 'es' ? 'Español' : 'English' });
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState('');
  const labels = t.form.labels;
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event) {
    event.preventDefault();
    if (!form.name || !form.phone || !form.zip_code || !form.issue_description || !consent) {
      setMessage(t.form.required);
      return;
    }
    const saved = await insertRecord('service_requests', form);
    onSaved?.(saved);
    setMessage(t.form.success);
  }

  const whatsappMessage = [
    `${business.name} service request`,
    `Name: ${form.name}`,
    `Phone: ${form.phone}`,
    `ZIP: ${form.zip_code}`,
    `Service: ${form.service_needed}`,
    `Vehicle: ${form.year} ${form.make} ${form.model}`,
    `Issue: ${form.issue_description}`,
  ].join('\n');

  return (
    <section id="request" className="section form-section">
      <div className="section-heading">
        <h2>{t.form.title}</h2>
        <p>{t.form.note}</p>
      </div>
      <form className="form-grid" onSubmit={submit}>
        <SelectField label={labels.preferred_language} value={form.preferred_language} onChange={(v) => set('preferred_language', v)} options={selectOptions.language} lang={lang} required />
        <Field label={labels.name} required><input value={form.name} onChange={(e) => set('name', e.target.value)} required /></Field>
        <Field label={labels.phone} required><input value={form.phone} onChange={(e) => set('phone', e.target.value)} required /></Field>
        <Field label={labels.email}><input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
        <Field label={labels.zip_code} required><input value={form.zip_code} onChange={(e) => set('zip_code', e.target.value)} required /></Field>
        <Field label={labels.address_notes}><input value={form.address_notes} onChange={(e) => set('address_notes', e.target.value)} /></Field>
        <SelectField label={labels.service_needed} value={form.service_needed} onChange={(v) => set('service_needed', v)} options={selectOptions.service} lang={lang} required />
        <SelectField label={labels.vehicle_type} value={form.vehicle_type} onChange={(v) => set('vehicle_type', v)} options={selectOptions.vehicle} lang={lang} required />
        <Field label={labels.year} required><input value={form.year} onChange={(e) => set('year', e.target.value)} required /></Field>
        <Field label={labels.make} required><input value={form.make} onChange={(e) => set('make', e.target.value)} required /></Field>
        <Field label={labels.model} required><input value={form.model} onChange={(e) => set('model', e.target.value)} required /></Field>
        <Field label={labels.engine_type}><input value={form.engine_type} onChange={(e) => set('engine_type', e.target.value)} /></Field>
        <SelectField label={labels.urgency} value={form.urgency} onChange={(v) => set('urgency', v)} options={selectOptions.urgency} lang={lang} required />
        <Field label={labels.photos}><input type="file" multiple accept="image/*" /></Field>
        <label className="field full">
          <span>{labels.issue_description} *</span>
          <textarea value={form.issue_description} onChange={(e) => set('issue_description', e.target.value)} required />
        </label>
        <label className="checkbox full">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>{t.form.consent}</span>
        </label>
        <div className="form-actions full">
          <button className="btn btn-primary" type="submit">{t.buttons.submit}</button>
          <a className="btn btn-green" href={buildWhatsAppUrl(whatsappMessage)} target="_blank" rel="noreferrer">
            <MessageCircle size={18} /> {t.buttons.whatsappReady}
          </a>
        </div>
        {message ? <p className="status-message full">{message}</p> : null}
      </form>
    </section>
  );
}

function TeamForm({ lang, t, onSaved }) {
  const [form, setForm] = useState({ ...initialApplication, preferred_language: lang === 'es' ? 'Español' : 'English' });
  const [file, setFile] = useState(null);
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState('');
  const labels = t.team.labels;
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event) {
    event.preventDefault();
    if (!form.full_name || !form.phone || !form.email || !form.experience_summary || !consent) {
      setMessage(t.form.required);
      return;
    }
    const resumeUrl = await uploadResume(file);
    const saved = await insertRecord('team_applications', { ...form, resume_url: resumeUrl });
    onSaved?.(saved);
    setMessage(t.team.success);
  }

  return (
    <section id="team" className="section form-section alt">
      <div className="section-heading">
        <h2>{t.team.title}</h2>
        <p>{t.team.body}</p>
      </div>
      <form className="form-grid" onSubmit={submit}>
        <SelectField label={t.form.labels.preferred_language} value={form.preferred_language} onChange={(v) => set('preferred_language', v)} options={selectOptions.language} lang={lang} required />
        <Field label={labels.full_name} required><input value={form.full_name} onChange={(e) => set('full_name', e.target.value)} required /></Field>
        <Field label={labels.phone} required><input value={form.phone} onChange={(e) => set('phone', e.target.value)} required /></Field>
        <Field label={labels.email} required><input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required /></Field>
        <Field label={labels.city_zip} required><input value={form.city_zip} onChange={(e) => set('city_zip', e.target.value)} required /></Field>
        <SelectField label={labels.position_interest} value={form.position_interest} onChange={(v) => set('position_interest', v)} options={selectOptions.positions} lang={lang} required />
        <SelectField label={labels.has_tools} value={form.has_tools} onChange={(v) => set('has_tools', v)} options={selectOptions.yesNo} lang={lang} required />
        <SelectField label={labels.has_transportation} value={form.has_transportation} onChange={(v) => set('has_transportation', v)} options={selectOptions.yesNo} lang={lang} required />
        <SelectField label={labels.availability} value={form.availability} onChange={(v) => set('availability', v)} options={selectOptions.availability} lang={lang} required />
        <Field label={labels.resume}><input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0])} /></Field>
        <label className="field full"><span>{labels.experience_summary} *</span><textarea value={form.experience_summary} onChange={(e) => set('experience_summary', e.target.value)} required /></label>
        <label className="field full"><span>{labels.skills}</span><textarea value={form.skills} onChange={(e) => set('skills', e.target.value)} /></label>
        <label className="field full"><span>{labels.additional_notes}</span><textarea value={form.additional_notes} onChange={(e) => set('additional_notes', e.target.value)} /></label>
        <label className="checkbox full">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>{t.team.consent}</span>
        </label>
        <button className="btn btn-primary full" type="submit">{t.buttons.apply}</button>
        {message ? <p className="status-message full">{message}</p> : null}
      </form>
    </section>
  );
}

function FAQ({ lang, t }) {
  return (
    <section id="faq" className="section">
      <div className="section-heading">
        <h2>{t.faqTitle}</h2>
      </div>
      <div className="faq-grid">
        {faqs.map(([qEn, qEs, aEn, aEs]) => (
          <details key={qEn}>
            <summary>{lang === 'es' ? qEs : qEn}</summary>
            <p>{lang === 'es' ? aEs : aEn}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function Footer({ t, lang, setLang }) {
  return (
    <footer id="contact" className="footer">
      <div>
        <h2>{business.name}</h2>
        <p>{business.legalName}</p>
        <p>{t.area.body}</p>
      </div>
      <ContactButtons t={t} compact />
      <p>{t.footerPrivacy}</p>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} {business.legalName}</span>
        <div className="language-switch">
          <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
          <span>|</span>
          <button className={lang === 'es' ? 'active' : ''} onClick={() => setLang('es')}>ES</button>
        </div>
      </div>
    </footer>
  );
}

function LandingApp({ lang, setLang }) {
  const t = languages[lang];
  return (
    <>
      <Header lang={lang} setLang={setLang} t={t} />
      <main>
        <Hero t={t} />
        <ServicesSection lang={lang} t={t} />
        <InfoBands t={t} />
        <RequestForm lang={lang} t={t} />
        <TeamForm lang={lang} t={t} />
        <FAQ lang={lang} t={t} />
      </main>
      <Footer t={t} lang={lang} setLang={setLang} />
    </>
  );
}

function InvoicePreview({ invoice, labels, totals }) {
  return (
    <article className="invoice-preview" id="invoice-print">
      <header>
        <div>
          <h2>{labels.title}</h2>
          <p>{invoice.business_name}</p>
          <p>{invoice.business_phone}</p>
        </div>
        <div className="invoice-meta">
          <strong>{invoice.invoice_type}</strong>
          <span>{labels.invoiceNumber}: {invoice.invoice_number}</span>
          <span>{labels.date}: {invoice.date}</span>
        </div>
      </header>
      <section className="invoice-columns">
        <div>
          <h3>{labels.client}</h3>
          <p>{invoice.client_name}</p>
          <p>{labels.address}: {invoice.client_address}</p>
          <p>{labels.phone}: {invoice.client_phone}</p>
          <p>{labels.email}: {invoice.client_email}</p>
        </div>
        <div>
          <h3>{labels.vehicle}</h3>
          <p>{invoice.year} {invoice.make} {invoice.model}</p>
          <p>{labels.miles}: {invoice.miles}</p>
          <p>{labels.hours}: {invoice.hours}</p>
        </div>
      </section>
      <p><strong>{labels.job}:</strong> {invoice.job_description}</p>
      <table>
        <thead>
          <tr><th>{labels.description}</th><th>{labels.qty}</th><th>{labels.unit}</th><th>{labels.total}</th></tr>
        </thead>
        <tbody>
          {invoice.items.map((item, index) => (
            <tr key={`${item.category}-${index}`}>
              <td>{item.category}: {item.description}</td>
              <td>{item.quantity}</td>
              <td>{money(item.unit_price)}</td>
              <td>{money(Number(item.quantity) * Number(item.unit_price))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="totals">
        <span>{labels.subtotal}: {money(totals.subtotal)}</span>
        <span>{labels.tax}: {money(totals.tax)}</span>
        <strong>{labels.due}: {money(totals.total)}</strong>
      </div>
      <footer>
        <p>{labels.payment}: {invoice.payment_method}</p>
        <p>{labels.mechanic}: {invoice.mechanic_name}</p>
        <p>{labels.signature}: {invoice.signature_name}</p>
      </footer>
    </article>
  );
}

function InvoiceBuilder({ t, onSaved }) {
  const [invoice, setInvoice] = useState({
    ...initialInvoice,
    invoice_number: `CDT-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`,
  });

  const invoiceLang = invoice.preferred_language === 'Español' ? 'es' : 'en';
  const labels = invoiceLabels[invoiceLang];
  const totals = useMemo(() => {
    const subtotal = invoice.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0), 0);
    const tax = subtotal * (Number(invoice.tax_rate || 0) / 100);
    return { subtotal, tax, total: subtotal + tax };
  }, [invoice]);

  const set = (key, value) => setInvoice((current) => ({ ...current, [key]: value }));
  const setItem = (index, key, value) => {
    setInvoice((current) => ({
      ...current,
      items: current.items.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    }));
  };

  async function saveInvoice() {
    const payload = { ...invoice, subtotal: totals.subtotal, tax_amount: totals.tax, total: totals.total };
    await insertRecord('invoices', payload);
    onSaved?.();
  }

  const sendBody = `${invoice.invoice_type} ${invoice.invoice_number}\nClient: ${invoice.client_name}\nTotal: ${money(totals.total)}`;

  return (
    <section className="admin-panel">
      <div className="admin-form">
        <h2>Invoices / Receipts</h2>
        <div className="form-grid">
          <Field label="Invoice number"><input value={invoice.invoice_number} onChange={(e) => set('invoice_number', e.target.value)} /></Field>
          <Field label="Type"><select value={invoice.invoice_type} onChange={(e) => set('invoice_type', e.target.value)}><option>Estimate</option><option>Invoice</option><option>Paid Receipt</option></select></Field>
          <Field label="Status"><select value={invoice.status} onChange={(e) => set('status', e.target.value)}><option>Draft</option><option>Sent</option><option>Paid</option><option>Canceled</option></select></Field>
          <SelectField label="Preferred language" value={invoice.preferred_language} onChange={(v) => set('preferred_language', v)} options={selectOptions.language} lang="en" />
          <Field label="Date"><input type="date" value={invoice.date} onChange={(e) => set('date', e.target.value)} /></Field>
          <Field label="Mechanic name"><input value={invoice.mechanic_name} onChange={(e) => set('mechanic_name', e.target.value)} /></Field>
          <Field label="Client name"><input value={invoice.client_name} onChange={(e) => set('client_name', e.target.value)} /></Field>
          <Field label="Client phone"><input value={invoice.client_phone} onChange={(e) => set('client_phone', e.target.value)} /></Field>
          <Field label="Client email"><input value={invoice.client_email} onChange={(e) => set('client_email', e.target.value)} /></Field>
          <Field label="Client address"><input value={invoice.client_address} onChange={(e) => set('client_address', e.target.value)} /></Field>
          <Field label="Make"><input value={invoice.make} onChange={(e) => set('make', e.target.value)} /></Field>
          <Field label="Model"><input value={invoice.model} onChange={(e) => set('model', e.target.value)} /></Field>
          <Field label="Year"><input value={invoice.year} onChange={(e) => set('year', e.target.value)} /></Field>
          <Field label="Miles"><input value={invoice.miles} onChange={(e) => set('miles', e.target.value)} /></Field>
          <Field label="Hours"><input value={invoice.hours} onChange={(e) => set('hours', e.target.value)} /></Field>
          <Field label="Tax %"><input type="number" value={invoice.tax_rate} onChange={(e) => set('tax_rate', e.target.value)} /></Field>
          <Field label="Payment method"><select value={invoice.payment_method} onChange={(e) => set('payment_method', e.target.value)}><option>Cash</option><option>Bank transfer</option><option>Check</option><option>Card</option><option>Zelle</option><option>Other</option></select></Field>
          <Field label="Signature name"><input value={invoice.signature_name} onChange={(e) => set('signature_name', e.target.value)} /></Field>
          <label className="field full"><span>Job description</span><textarea value={invoice.job_description} onChange={(e) => set('job_description', e.target.value)} /></label>
        </div>
        <h3>Line items</h3>
        {invoice.items.map((item, index) => (
          <div className="line-item" key={index}>
            <select value={item.category} onChange={(e) => setItem(index, 'category', e.target.value)}>
              {['Parts', 'Labor', 'Diagnostics', 'Mobile service / travel fee', 'Towing fee', 'Shop supplies', 'Fuel', 'Cleaning consumables', 'Parts sourcing / pickup', 'Compatibility verification', 'Other'].map((category) => <option key={category}>{category}</option>)}
            </select>
            <input value={item.description} onChange={(e) => setItem(index, 'description', e.target.value)} placeholder="Description" />
            <input type="number" value={item.quantity} onChange={(e) => setItem(index, 'quantity', e.target.value)} placeholder="Qty" />
            <input type="number" value={item.unit_price} onChange={(e) => setItem(index, 'unit_price', e.target.value)} placeholder="Unit price" />
          </div>
        ))}
        <div className="admin-actions">
          <button className="btn btn-muted" onClick={() => set('items', [...invoice.items, { category: 'Other', description: '', quantity: 1, unit_price: 0 }])}><Plus size={18} /> {t.buttons.addItem}</button>
          <button className="btn btn-primary" onClick={saveInvoice}><FileText size={18} /> {t.buttons.saveInvoice}</button>
          <button className="btn btn-muted" onClick={() => window.print()}><Printer size={18} /> {t.buttons.print}</button>
          <button className="btn btn-muted" onClick={() => window.print()}><Download size={18} /> {t.buttons.download}</button>
          <a className="btn btn-muted" href={mailTo(`Invoice ${invoice.invoice_number}`, sendBody, invoice.client_email || business.email)}><Mail size={18} /> {t.buttons.emailDraft}</a>
          <a className="btn btn-green" href={buildWhatsAppUrl(sendBody)} target="_blank" rel="noreferrer"><MessageCircle size={18} /> {t.buttons.whatsappReady}</a>
        </div>
      </div>
      <InvoicePreview invoice={invoice} labels={labels} totals={totals} />
    </section>
  );
}

function DataTable({ title, rows, fields, statuses, table, reload }) {
  async function changeStatus(id, status) {
    await updateRecord(table, id, { status });
    reload();
  }
  return (
    <section className="admin-table">
      <h2>{title}</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {fields.map(([key, label]) => <th key={key}>{label}</th>)}
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                {fields.map(([key]) => <td key={key}>{Array.isArray(row[key]) ? row[key].join(', ') : row[key]}</td>)}
                <td>
                  <select value={row.status || 'New'} onChange={(e) => changeStatus(row.id, e.target.value)}>
                    {statuses.map((status) => <option key={status}>{status}</option>)}
                  </select>
                </td>
              </tr>
            ))}
            {!rows.length ? <tr><td colSpan={fields.length + 1}>No records yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AdminApp({ lang }) {
  const t = languages[lang];
  const [password, setPassword] = useState('');
  const [allowed, setAllowed] = useState(sessionStorage.getItem('carDaddy.admin') === 'true');
  const [error, setError] = useState('');
  const [active, setActive] = useState('dashboard');
  const [leads, setLeads] = useState([]);
  const [apps, setApps] = useState([]);
  const [invoices, setInvoices] = useState([]);

  const reload = async () => {
    setLeads(await listRecords('service_requests'));
    setApps(await listRecords('team_applications'));
    setInvoices(await listRecords('invoices'));
  };

  useEffect(() => {
    if (allowed) reload();
  }, [allowed]);

  function unlock(event) {
    event.preventDefault();
    const expected = import.meta.env.VITE_ADMIN_PASSWORD || 'admin';
    if (password === expected) {
      sessionStorage.setItem('carDaddy.admin', 'true');
      setAllowed(true);
      setError('');
    } else {
      setError(t.admin.badPassword);
    }
  }

  if (!allowed) {
    return (
      <main className="admin-login">
        <form onSubmit={unlock}>
          <ShieldCheck size={42} />
          <h1>{t.admin.title}</h1>
          <Field label={t.admin.password}><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          <button className="btn btn-primary">{t.buttons.unlock}</button>
          {error ? <p className="status-message">{error}</p> : null}
          <p className="small">MVP password gate. Set VITE_ADMIN_PASSWORD before deploying.</p>
        </form>
      </main>
    );
  }

  return (
    <main className="admin-layout">
      <aside>
        <h1>{business.name}</h1>
        {['dashboard', 'leads', 'applications', 'invoices', 'settings'].map((key, index) => (
          <button key={key} className={active === key ? 'active' : ''} onClick={() => setActive(key)}>
            {index === 0 ? <ShieldCheck /> : index === 2 ? <Users /> : index === 4 ? <Settings /> : <FileText />}
            {t.admin.sections[index]}
          </button>
        ))}
        <a href={languages[lang].homePath}>Back to site</a>
      </aside>
      <section className="admin-main">
        {!isSupabaseConfigured ? <p className="mock-banner">{t.admin.mockNotice}</p> : null}
        {active === 'dashboard' ? (
          <div className="dashboard-grid">
            <article><strong>{leads.length}</strong><span>Service Requests</span></article>
            <article><strong>{apps.length}</strong><span>Team Applications</span></article>
            <article><strong>{invoices.length}</strong><span>Invoices</span></article>
          </div>
        ) : null}
        {active === 'leads' ? (
          <DataTable
            title="Service Requests / Leads"
            rows={leads}
            table="service_requests"
            reload={reload}
            statuses={['New', 'Contacted', 'Scheduled', 'In Progress', 'Completed', 'Lost', 'Canceled']}
            fields={[
              ['name', 'Name'],
              ['phone', 'Phone'],
              ['preferred_language', 'Language'],
              ['service_needed', 'Service'],
              ['zip_code', 'ZIP'],
              ['urgency', 'Urgency'],
              ['vehicle_type', 'Vehicle'],
              ['issue_description', 'Issue Summary'],
            ]}
          />
        ) : null}
        {active === 'applications' ? (
          <DataTable
            title="Team Applications"
            rows={apps}
            table="team_applications"
            reload={reload}
            statuses={['New', 'Reviewed', 'Contacted', 'Interview', 'Accepted', 'Rejected']}
            fields={[
              ['full_name', 'Name'],
              ['phone', 'Phone'],
              ['email', 'Email'],
              ['position_interest', 'Position'],
              ['experience_summary', 'Experience'],
              ['has_tools', 'Tools'],
              ['has_transportation', 'Transportation'],
              ['availability', 'Availability'],
              ['resume_url', 'Resume'],
            ]}
          />
        ) : null}
        {active === 'invoices' ? <InvoiceBuilder t={t} onSaved={reload} /> : null}
        {active === 'settings' ? (
          <section className="admin-table">
            <h2>Settings / Configuration</h2>
            <p>Supabase: {isSupabaseConfigured ? 'Configured' : 'Mock/local mode'}</p>
            <p>Instagram placeholder: {business.instagram}</p>
            <p>Tax rate is set per invoice. Configure defaults later in Supabase or a settings table.</p>
          </section>
        ) : null}
      </section>
    </main>
  );
}

function Root() {
  const [lang, setLang] = useState(getLangFromPath());
  const isAdmin = window.location.pathname.startsWith('/admin');
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return isAdmin ? <AdminApp lang={lang} /> : <LandingApp lang={lang} setLang={setLang} />;
}

createRoot(document.getElementById('root')).render(<Root />);
