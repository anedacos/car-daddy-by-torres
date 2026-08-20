import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowRight,
  Download,
  ExternalLink,
  Facebook,
  FileText,
  Mail,
  Menu,
  MessageCircle,
  Phone,
  Play,
  Plus,
  Printer,
  Settings,
  ShieldCheck,
  Users,
  Video,
  X,
  Youtube,
} from 'lucide-react';
import './styles.css';
import youtubeCatalog from './data/youtube-videos.json';
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
} from './lib/storage';
import { installMobileKeyboardGuard } from './lib/mobile-keyboard';
import { PlatformPage, getPlatformRoute } from './platform/PlatformPages';
import { PlatformAdmin, platformAdminNav } from './platform/PlatformAdmin';
import {
  authenticateAdmin,
  isPlatformMockMode,
  restoreAdminSession,
  signOutAdmin,
} from './platform/storage';

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
  const whatsappIntro =
    t.code === 'es'
      ? 'Hola, necesito servicio de mecanico movil o remolque. Mi ZIP code es _____. El problema es _____.'
      : 'Hi, I need mobile mechanic or towing service. My ZIP code is _____. The issue is _____.';
  return (
    <div className="contact-actions">
      <a className={`${buttonClass} btn-primary`} href={`tel:${business.phone}`}>
        <Phone size={18} /> {t.buttons.call}
      </a>
      <a className={`${buttonClass} btn-green`} href={buildWhatsAppUrl(whatsappIntro)} target="_blank" rel="noreferrer">
        <MessageCircle size={18} /> {t.buttons.whatsapp}
      </a>
      <a className={`${buttonClass} btn-muted`} href={`mailto:${business.email}`}>
        <Mail size={18} /> {t.buttons.email}
      </a>
      <a className={`${buttonClass} btn-muted`} href={business.facebook} target="_blank" rel="noreferrer">
        <Facebook size={18} /> Facebook
      </a>
      {instagramReady ? (
        <a className={`${buttonClass} btn-muted`} href={business.instagram} target="_blank" rel="noreferrer">
          Instagram
        </a>
      ) : null}
    </div>
  );
}

function Header({ lang, setLang, t, page = 'home' }) {
  const [open, setOpen] = useState(false);
  const switchLang = (next) => {
    setLang(next);
    const nextBase = languages[next].homePath === '/' ? '' : languages[next].homePath;
    const platformPath = window.location.pathname.replace(/^\/es(?=\/)/, '');
    const nextPath = page === 'videos'
      ? `${nextBase}/videos`
      : page === 'platform' ? `${nextBase}${platformPath}` : languages[next].homePath;
    window.history.pushState({}, '', nextPath || '/videos');
    setOpen(false);
  };
  const homePath = t.homePath;
  const sectionHref = (id) => page === 'home' ? `#${id}` : `${homePath}#${id}`;
  const routeBase = homePath === '/' ? '' : homePath;
  const navItems = [
    [page === 'home' ? '#home' : homePath, t.nav[0]],
    [sectionHref('services'), t.nav[1]],
    [`${routeBase}/videos`, t.nav[2]],
    [`${routeBase}/solicitar-servicio`, t.nav[3]],
    [`${routeBase}/unete-a-la-red`, t.nav[4]],
    [`${routeBase}/portal`, t.nav[5]],
  ];
  return (
    <header className="site-header">
      <a className="brand" href={t.homePath}>
        <img src={assets.profile} alt="" />
        <span>{business.name}</span>
      </a>
      <button className="icon-button menu-toggle" onClick={() => setOpen(!open)} aria-label="Open menu">
        {open ? <X /> : <Menu />}
      </button>
      <nav className={open ? 'nav nav-open' : 'nav'}>
        {navItems.map(([href, label]) => (
          <a key={href} href={href} onClick={() => setOpen(false)}>
            {label}
          </a>
        ))}
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
          <a className="btn btn-light" href={`${t.homePath === '/' ? '' : t.homePath}/solicitar-servicio`}>
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
        <img src={assets.towing} alt="" />
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

const videoCopy = {
  en: {
    eyebrow: 'From the shop',
    title: 'Videos & Projects',
    intro: 'Real mechanical projects, diagnostics, repairs, and equipment work from our YouTube playlists.',
    viewAll: 'View All Videos',
    visitChannel: 'Visit YouTube Channel',
    openYoutube: 'Open in YouTube',
    play: 'Play video',
    all: 'All Videos',
    loadMore: 'Load More',
    empty: 'New projects from this playlist will appear here when they are published.',
    pageIntro: 'Browse real automotive, marine, powersports, and equipment projects. Select a video to watch it here.',
    short: 'Short',
  },
  es: {
    eyebrow: 'Desde el taller',
    title: 'Videos y Proyectos',
    intro: 'Proyectos reales de mecánica, diagnósticos, reparaciones y equipos desde nuestras playlists de YouTube.',
    viewAll: 'Ver Todos los Videos',
    visitChannel: 'Visitar Canal de YouTube',
    openYoutube: 'Abrir en YouTube',
    play: 'Reproducir video',
    all: 'Todos los Videos',
    loadMore: 'Cargar Más',
    empty: 'Los nuevos proyectos de esta playlist aparecerán aquí cuando sean publicados.',
    pageIntro: 'Explora proyectos reales de autos, marina, powersports y equipos. Selecciona un video para verlo aqui.',
    short: 'Short',
  },
};

function uniqueVideos(categories) {
  const seen = new Set();
  return categories
    .flatMap((category) => category.videos)
    .filter((video) => !seen.has(video.id) && seen.add(video.id));
}

function VideoPlayer({ video }) {
  if (!video) return null;
  return (
    <div className="video-player">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${video.id}?rel=0&list=${video.playlistId}`}
        title={video.title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
}

function VideoThumbnail({ video, copy, onPlay }) {
  return (
    <article className="video-card">
      <button type="button" className="video-thumbnail" onClick={() => onPlay(video)} aria-label={`${copy.play}: ${video.title}`}>
        <img src={video.thumbnail} alt="" loading="lazy" />
        <span className="video-play"><Play fill="currentColor" size={22} /></span>
        <span className="video-duration">{video.isShort ? copy.short : video.duration}</span>
      </button>
      <div className="video-card-body">
        <h3>{video.title}</h3>
        <a href={video.youtubeUrl} target="_blank" rel="noreferrer">
          {copy.openYoutube} <ExternalLink size={15} />
        </a>
      </div>
    </article>
  );
}

function VideosHomeSection({ lang, t }) {
  const copy = videoCopy[lang];
  const videos = uniqueVideos(youtubeCatalog.categories);
  const [featured, setFeatured] = useState(videos[0]);
  if (!featured) return null;
  return (
    <section id="videos" className="section videos-home">
      <div className="section-heading">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2>{copy.title}</h2>
        <p>{copy.intro}</p>
      </div>
      <div className="video-feature-layout">
        <div>
          <VideoPlayer video={featured} />
          <h3 className="featured-video-title">{featured.title}</h3>
        </div>
        <div className="video-recent-grid">
          {videos.slice(0, 3).map((video) => (
            <VideoThumbnail key={video.id} video={video} copy={copy} onPlay={setFeatured} />
          ))}
        </div>
      </div>
      <div className="video-section-actions">
        <a className="btn btn-primary" href={`${t.homePath === '/' ? '' : t.homePath}/videos`}>
          <Video size={18} /> {copy.viewAll}
        </a>
      </div>
    </section>
  );
}

function VideosPage({ lang, setLang }) {
  const t = languages[lang];
  const copy = videoCopy[lang];
  const [activeCategory, setActiveCategory] = useState('all');
  const [visibleCount, setVisibleCount] = useState(4);
  const categories = youtubeCatalog.categories;
  const filteredCategories = activeCategory === 'all'
    ? categories
    : categories.filter((category) => category.id === activeCategory);
  const videos = uniqueVideos(filteredCategories);
  const [featured, setFeatured] = useState(() => uniqueVideos(categories)[0]);

  const chooseCategory = (categoryId) => {
    setActiveCategory(categoryId);
    setVisibleCount(4);
    const firstVideo = uniqueVideos(
      categoryId === 'all' ? categories : categories.filter((category) => category.id === categoryId),
    )[0];
    if (firstVideo) setFeatured(firstVideo);
  };

  const playVideo = (video) => {
    setFeatured(video);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <Header lang={lang} setLang={setLang} t={t} page="videos" />
      <main className="videos-page">
        <section className="videos-page-hero">
          <div>
            <p className="eyebrow">Car Daddy By Torres LLC</p>
            <h1>{copy.title}</h1>
            <p>{copy.pageIntro}</p>
            <a className="btn btn-light" href={youtubeCatalog.channelUrl} target="_blank" rel="noreferrer">
              <Youtube size={19} /> {copy.visitChannel}
            </a>
          </div>
          <div>
            <VideoPlayer video={featured} />
            {featured ? <h2>{featured.title}</h2> : null}
          </div>
        </section>

        <section className="section video-library">
          <div className="video-tabs" role="tablist" aria-label={copy.title}>
            <button type="button" className={activeCategory === 'all' ? 'active' : ''} onClick={() => chooseCategory('all')}>
              {copy.all}
            </button>
            {categories.map((category) => (
              <button
                type="button"
                key={category.id}
                className={activeCategory === category.id ? 'active' : ''}
                onClick={() => chooseCategory(category.id)}
              >
                {lang === 'es' ? category.titleEs : category.title}
              </button>
            ))}
          </div>

          {videos.length ? (
            <div className="video-library-grid">
              {videos.slice(0, visibleCount).map((video) => (
                <VideoThumbnail key={video.id} video={video} copy={copy} onPlay={playVideo} />
              ))}
            </div>
          ) : (
            <div className="video-empty">
              <Youtube size={34} />
              <p>{copy.empty}</p>
            </div>
          )}

          {visibleCount < videos.length ? (
            <div className="video-section-actions">
              <button type="button" className="btn btn-primary" onClick={() => setVisibleCount((count) => count + 4)}>
                <Plus size={18} /> {copy.loadMore}
              </button>
            </div>
          ) : null}

          <div className="video-section-actions">
            <a className="btn btn-muted" href={youtubeCatalog.channelUrl} target="_blank" rel="noreferrer">
              <Youtube size={19} /> {copy.visitChannel}
            </a>
          </div>
        </section>
      </main>
      <Footer t={t} lang={lang} setLang={setLang} />
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

function NetworkSection({ lang }) {
  const base = lang === 'es' ? '/es' : '';
  return (
    <section id="team" className="section network-section">
      <div className="network-section-copy">
        <p className="eyebrow">CarDaddy Network</p>
        <h2>{lang === 'es' ? 'Únete a la red CarDaddy' : 'Join the CarDaddy Network'}</h2>
        <p>{lang === 'es'
          ? 'Solicita participar como proveedor automotriz independiente. Tú decides qué oportunidades aceptar, tus horarios, precios y zona de servicio.'
          : 'Apply as an independent automotive provider. You decide which opportunities to accept, your schedule, prices, and service area.'}</p>
        <a className="btn btn-primary" href={`${base}/unete-a-la-red`}><Users size={18} /> {lang === 'es' ? 'Solicitar Ingreso' : 'Apply to the Network'}</a>
      </div>
      <div className="network-points">
        <article><strong>01</strong><span>{lang === 'es' ? 'Perfil y especialidades' : 'Profile and specialties'}</span></article>
        <article><strong>02</strong><span>{lang === 'es' ? 'Disponibilidad propia' : 'Your own availability'}</span></article>
        <article><strong>03</strong><span>{lang === 'es' ? 'Oportunidades compatibles' : 'Compatible opportunities'}</span></article>
      </div>
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
        <VideosHomeSection lang={lang} t={t} />
        <RequestForm lang={lang} t={t} />
        <NetworkSection lang={lang} />
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [allowed, setAllowed] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState('');
  const [active, setActive] = useState('operations');
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

  useEffect(() => {
    restoreAdminSession()
      .then((profile) => setAllowed(Boolean(profile)))
      .finally(() => setCheckingSession(false));
  }, []);

  async function unlock(event) {
    event.preventDefault();
    try {
      await authenticateAdmin(email, password);
      setAllowed(true);
      setError('');
    } catch (authError) {
      setError(authError.message || t.admin.badPassword);
    }
  }

  if (checkingSession) return <main className="admin-login"><p className="mock-banner">Checking secure session...</p></main>;

  if (!allowed) {
    return (
      <main className="admin-login">
        <form onSubmit={unlock}>
          <ShieldCheck size={42} />
          <h1>CarDaddy Admin</h1>
          <Field label="Admin email"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required={!isPlatformMockMode} /></Field>
          <Field label={t.admin.password}><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          <button className="btn btn-primary"><ShieldCheck size={18} /> {t.buttons.unlock}</button>
          {error ? <p className="status-message">{error}</p> : null}
          <p className="small">{isPlatformMockMode
            ? 'Local test mode. Password: local-test-only. Uses synthetic browser data and sends nothing.'
            : 'Supabase Auth and an active administrator role are required.'}</p>
        </form>
      </main>
    );
  }

  const navItems = [
    ...platformAdminNav,
    ['leads', 'Legacy Requests'],
    ['applications', 'Legacy Applications'],
    ['invoices', 'Invoices / Receipts'],
    ['settings', 'Settings'],
  ];

  return (
    <main className="admin-layout">
      <aside>
        <h1>{business.name}</h1>
        {navItems.map(([key, label], index) => (
          <button key={key} className={active === key ? 'active' : ''} onClick={() => setActive(key)}>
            {index === 0 ? <ShieldCheck /> : key === 'providers' ? <Users /> : key === 'settings' ? <Settings /> : <FileText />}
            {label}
          </button>
        ))}
        <a href={languages[lang].homePath}>Back to site</a>
        <button type="button" onClick={async () => { await signOutAdmin(); setAllowed(false); }}>Sign out</button>
      </aside>
      <section className="admin-main">
        {['operations', 'cases', 'providers', 'complaints'].includes(active) ? <PlatformAdmin active={active} /> : null}
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
            <p>Supabase: {isSupabaseConfigured ? 'Configured; authenticated admin policies required' : 'Mock/local mode'}</p>
            <p>Beta notifications: email outbox and portal enabled. SMS, paid WhatsApp, and push delivery disabled.</p>
            <p>Membership billing: disabled for the free beta.</p>
            <p>Assignment: manual in Phase 1. Compatibility scoring is advisory until Phase 3.</p>
            <p>Legacy records: {leads.length} requests, {apps.length} applications, {invoices.length} invoices.</p>
          </section>
        ) : null}
      </section>
    </main>
  );
}

function Root() {
  const [lang, setLang] = useState(getLangFromPath());
  const isAdmin = window.location.pathname.startsWith('/admin');
  const isVideos = /^\/(?:es\/)?videos\/?$/.test(window.location.pathname);
  const platformRoute = getPlatformRoute(window.location.pathname);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  useEffect(() => installMobileKeyboardGuard(), []);
  if (isAdmin) return <AdminApp lang={lang} />;
  if (isVideos) return <VideosPage lang={lang} setLang={setLang} />;
  if (platformRoute) return <PlatformPage route={platformRoute} lang={lang} setLang={setLang} header={Header} footer={Footer} />;
  return <LandingApp lang={lang} setLang={setLang} />;
}

createRoot(document.getElementById('root')).render(<Root />);
