import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  Copy,
  FileCheck2,
  LockKeyhole,
  MailCheck,
  Network,
  Plus,
  ShieldCheck,
  Trash2,
  Upload,
  UserRoundCheck,
} from 'lucide-react';
import { business, languages } from '../data/content';
import {
  copyScheduleToDays,
  digitsOnly,
  getCitySuggestions,
  getVehicleMakeSuggestions,
  getVehicleModelSuggestions,
  incidentTypes,
  inferVehicleType,
  isValidEmail,
  isValidUsPhone,
  isValidZipCode,
  launchStates,
  specialties,
  validateProviderSkillEvidence,
} from './domain';
import {
  isPlatformMockMode,
  resendEmailVerification,
  seedPlatformMockData,
  submitComplaint,
  submitProviderApplication,
  submitServiceCase,
  uploadPrivateFiles,
  verifyCaseIdentity,
  verifyEmailToken,
} from './storage';
import { fetchVehicleModels } from './vehicle-catalog';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const vehicleTypes = ['Car', 'Light truck', 'Diesel truck', 'Heavy equipment', 'Light equipment', 'Boat', 'Motorcycle', 'ATV / Quad', 'Hybrid vehicle', 'Electric vehicle'];
const paymentMethods = ['Cash', 'Zelle', 'Cash App', 'Card', 'Check', 'Other'];
const serviceTypes = ['Diagnostics', 'Mechanical repair', 'Electrical repair', 'No-start help', 'Brakes', 'Roadside assistance', 'Car dolly towing', 'Other'];

const spanishOptions = {
  Monday: 'Lunes', Tuesday: 'Martes', Wednesday: 'Miércoles', Thursday: 'Jueves', Friday: 'Viernes', Saturday: 'Sábado', Sunday: 'Domingo',
  English: 'Inglés', Spanish: 'Español', Car: 'Automóvil', 'Light truck': 'Camioneta', 'Diesel truck': 'Camión diésel',
  'Heavy equipment': 'Maquinaria pesada', 'Light equipment': 'Equipo ligero', Boat: 'Embarcación', Motorcycle: 'Motocicleta',
  'Hybrid vehicle': 'Vehículo híbrido', 'Electric vehicle': 'Vehículo eléctrico', Cash: 'Efectivo', Card: 'Tarjeta', Check: 'Cheque', Other: 'Otro',
  Diagnostics: 'Diagnóstico', 'Mechanical repair': 'Reparación mecánica', 'Electrical repair': 'Reparación eléctrica',
  'No-start help': 'Ayuda para vehículo que no enciende', Brakes: 'Frenos', 'Roadside assistance': 'Asistencia en carretera',
  'Car dolly towing': 'Remolque con car dolly', Gasoline: 'Gasolina', Hybrid: 'Híbrido', Electric: 'Eléctrico',
  Yes: 'Sí', No: 'No', Unknown: 'No se sabe', Immediate: 'Inmediata', Scheduled: 'Programada',
  'General automotive mechanics': 'Mecánica automotriz general', Electromechanics: 'Electromecánica',
  'Electrical diagnostics': 'Diagnóstico eléctrico', 'Computer diagnostics': 'Diagnóstico computarizado',
  'Gas vehicles': 'Vehículos a gasolina', 'Diesel mechanics': 'Mecánica diésel', Engine: 'Motor', Transmission: 'Transmisión',
  'Air conditioning': 'Aire acondicionado', Suspension: 'Suspensión', Batteries: 'Baterías', Alternators: 'Alternadores',
  Starters: 'Arrancadores', Maintenance: 'Mantenimiento', 'Emergency service': 'Servicio de emergencia',
  Bodywork: 'Carrocería', Paint: 'Pintura', 'European vehicles': 'Vehículos europeos', 'Hybrid vehicles': 'Vehículos híbridos',
  'Electric vehicles': 'Vehículos eléctricos', 'Late communication': 'Comunicación tardía', Cancellation: 'Cancelación',
  'No show': 'No presentación', Punctuality: 'Puntualidad', 'Billing problem': 'Problema de cobro',
  'Price different from agreed': 'Precio diferente al acordado', 'Poor repair': 'Reparación deficiente',
  'Vehicle damage': 'Daño al vehículo', 'Inappropriate conduct': 'Conducta inapropiada',
  'Misuse of information': 'Uso indebido de información', 'Advance payment request': 'Solicitud de pago adelantado', Fraud: 'Fraude', Safety: 'Seguridad',
};

function tx(lang, en, es) {
  return lang === 'es' ? es : en;
}

function optionLabel(lang, value) {
  return lang === 'es' ? spanishOptions[value] || value : value;
}

function Field({ label, children, required, hint, fieldKey, invalid = false, error, className = '' }) {
  return (
    <label className={`field ${className} ${invalid ? 'field-invalid' : ''}`.trim()} data-field={fieldKey}>
      <span>{label} {required ? <b>*</b> : null}</span>
      {children}
      {hint ? <small>{hint}</small> : null}
      {invalid && error ? <small className="field-error" role="alert">{error}</small> : null}
    </label>
  );
}

function CompactAutocompleteField({ label, value, onChange, suggestions, hint, suggestionLabel, fieldKey, required = false, invalid = false, error, autoComplete = 'off' }) {
  const [focused, setFocused] = useState(false);
  const inputId = React.useId();
  const listId = `${inputId}-suggestions`;
  const showSuggestions = focused && suggestions.length > 0;

  function selectOption(option) {
    onChange(option);
    setFocused(false);
  }

  return (
    <div className={`field autocomplete-field ${invalid ? 'field-invalid' : ''}`} data-field={fieldKey}>
      <label htmlFor={inputId}>{label} {required ? <b>*</b> : null}</label>
      <div className="compact-autocomplete">
        <input
          id={inputId}
          type="text"
          role="combobox"
          autoComplete={autoComplete}
          aria-autocomplete="list"
          aria-controls={showSuggestions ? listId : undefined}
          aria-expanded={showSuggestions}
          aria-invalid={invalid}
          value={value}
          onBlur={() => window.setTimeout(() => setFocused(false), 120)}
          onChange={(event) => { onChange(event.target.value); setFocused(true); }}
          onFocus={(event) => {
            setFocused(true);
            window.setTimeout(() => event.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setFocused(false);
            if (event.key === 'Enter' && showSuggestions) {
              event.preventDefault();
              selectOption(suggestions[0]);
            }
          }}
        />
        {showSuggestions ? <div className="compact-suggestions" id={listId} role="listbox" aria-label={suggestionLabel}>
          {suggestions.map((option) => <button key={option} type="button" role="option" aria-selected="false" onPointerDown={(event) => { event.preventDefault(); selectOption(option); }} onClick={() => selectOption(option)}>{option}</button>)}
        </div> : null}
      </div>
      {hint ? <small>{hint}</small> : null}
      {invalid && error ? <small className="field-error" role="alert">{error}</small> : null}
    </div>
  );
}

function CityAutocompleteField({ lang, state, value, onChange, fieldKey, invalid = false, error }) {
  return <CompactAutocompleteField
    label={tx(lang, 'City', 'Ciudad')}
    value={value}
    onChange={onChange}
    suggestions={getCitySuggestions(state, value)}
    hint={tx(lang, 'Type to see up to four matching cities.', 'Escribe para ver hasta cuatro ciudades coincidentes.')}
    suggestionLabel={tx(lang, 'City suggestions', 'Sugerencias de ciudades')}
    fieldKey={fieldKey}
    required
    invalid={invalid}
    error={error}
    autoComplete="address-level2"
  />;
}

function scrollToWizardProgress() {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.querySelector('[data-wizard-progress]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
}

function PageIntro({ eyebrow, title, body }) {
  return (
    <div className="platform-page-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{body}</p>
    </div>
  );
}

function WizardProgress({ step, labels }) {
  return (
    <ol className="wizard-progress" aria-label="Progress" data-wizard-progress>
      {labels.map((label, index) => {
        const itemStep = index + 1;
        const status = itemStep < step ? 'completed' : itemStep === step ? 'current' : 'pending';
        return (
          <li key={label} className={status} aria-current={status === 'current' ? 'step' : undefined}>
            <span>{status === 'completed' ? <Check size={15} /> : itemStep}</span>
            <b>{label}</b>
          </li>
        );
      })}
    </ol>
  );
}

function WizardActions({ step, total, back, next, submitLabel, busy, lang }) {
  return (
    <div className="wizard-actions">
      {step > 1 ? <button type="button" className="btn btn-muted" onClick={back}><ArrowLeft size={18} /> {tx(lang, 'Back', 'Atrás')}</button> : <span />}
      {step < total ? (
        <button type="button" className="btn btn-primary" onClick={next}>{tx(lang, 'Continue', 'Continuar')} <ArrowRight size={18} /></button>
      ) : (
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? tx(lang, 'Saving...', 'Guardando...') : submitLabel}</button>
      )}
    </div>
  );
}

function CheckboxGroup({ label, options, values, onChange, required = false, lang = 'en', fieldKey, invalid = false, error }) {
  const toggle = (option) => onChange(values.includes(option) ? values.filter((value) => value !== option) : [...values, option]);
  return (
    <fieldset className={`choice-fieldset full ${invalid ? 'field-invalid' : ''}`} data-field={fieldKey}>
      <legend>{label} {required ? <b>*</b> : null}</legend>
      <div className="choice-grid">
        {options.map((option) => (
          <label key={option} className="choice-item">
            <input type="checkbox" checked={values.includes(option)} onChange={() => toggle(option)} />
            <span>{optionLabel(lang, option)}</span>
          </label>
        ))}
      </div>
      {invalid && error ? <small className="field-error" role="alert">{error}</small> : null}
    </fieldset>
  );
}

function BooleanChoice({ label, description, checked, onChange }) {
  return (
    <label className="choice-item boolean-choice">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span><strong>{label}</strong>{description ? <small>{description}</small> : null}</span>
    </label>
  );
}

const clockHours = Array.from({ length: 12 }, (_, index) => String(index + 1));
const clockMinutes = ['00', '15', '30', '45'];

function splitTime(value) {
  if (!value) return { hour: '', minute: '00', period: 'AM' };
  const [rawHour, minute = '00'] = value.split(':');
  const hour24 = Number(rawHour);
  return {
    hour: String(hour24 % 12 || 12),
    minute,
    period: hour24 >= 12 ? 'PM' : 'AM',
  };
}

function joinTime(current, key, value) {
  const next = { ...splitTime(current), [key]: value };
  if (!next.hour) return '';
  const hour12 = Number(next.hour);
  const hour24 = next.period === 'PM' ? (hour12 % 12) + 12 : hour12 % 12;
  return `${String(hour24).padStart(2, '0')}:${next.minute}`;
}

function TimeSelect({ label, value, onChange, lang }) {
  const time = splitTime(value);
  return (
    <div className="time-select">
      <span>{label}</span>
      <div>
        <select aria-label={`${label} ${tx(lang, 'hour', 'hora')}`} value={time.hour} onChange={(event) => onChange(joinTime(value, 'hour', event.target.value))}>
          <option value="">--</option>
          {clockHours.map((hour) => <option key={hour}>{hour}</option>)}
        </select>
        <select aria-label={`${label} ${tx(lang, 'minutes', 'minutos')}`} value={time.minute} onChange={(event) => onChange(joinTime(value, 'minute', event.target.value))}>
          {clockMinutes.map((minute) => <option key={minute}>{minute}</option>)}
        </select>
        <select aria-label={`${label} AM/PM`} value={time.period} onChange={(event) => onChange(joinTime(value, 'period', event.target.value))}>
          <option>AM</option><option>PM</option>
        </select>
      </div>
    </div>
  );
}

function ScheduleEditor({ selectedDays, schedule, onChange, lang, invalid = false, error }) {
  const [copiedFrom, setCopiedFrom] = useState('');
  const update = (day, range, key, value) => {
    const next = { ...schedule, [day]: [...(schedule[day] || [{ start: '', end: '' }])] };
    next[day][range] = { ...next[day][range], [key]: value };
    onChange(next);
  };
  const addRange = (day) => onChange({ ...schedule, [day]: [...(schedule[day] || [{ start: '', end: '' }]), { start: '', end: '' }] });
  const removeRange = (day, range) => onChange({ ...schedule, [day]: (schedule[day] || []).filter((_, index) => index !== range) });
  const copyToSelectedDays = (sourceDay) => {
    onChange(copyScheduleToDays(schedule, sourceDay, selectedDays));
    setCopiedFrom(sourceDay);
  };
  if (!selectedDays.length) return <p className="form-help full">{tx(lang, 'Select at least one available day.', 'Selecciona al menos un día disponible.')}</p>;
  return (
    <div className={`schedule-editor full ${invalid ? 'field-invalid' : ''}`} data-field="availability_schedule">
      <div className="schedule-heading">
        <div><strong>{tx(lang, 'Working hours', 'Horario de trabajo')}</strong><small>{tx(lang, 'Set one day, then copy that schedule to every other selected day.', 'Configura un día y luego copia ese horario a los demás días seleccionados.')}</small></div>
      </div>
      {selectedDays.map((day) => (
        <div className="schedule-row" key={day}>
          <div className="schedule-day-heading">
            <strong>{optionLabel(lang, day)}</strong>
            {selectedDays.length > 1 ? <button
              type="button"
              className="copy-schedule"
              disabled={!(schedule[day]?.[0]?.start && schedule[day]?.[0]?.end)}
              onClick={() => copyToSelectedDays(day)}
            ><Copy size={15} /> {tx(lang, 'Copy to selected days', 'Copiar a días seleccionados')}</button> : null}
          </div>
          <div className="day-ranges">
            {(schedule[day]?.length ? schedule[day] : [{ start: '', end: '' }]).map((rangeValue, range) => (
              <div key={range} className="time-range">
                <TimeSelect label={tx(lang, 'From', 'Desde')} value={rangeValue.start} onChange={(value) => update(day, range, 'start', value)} lang={lang} />
                <TimeSelect label={tx(lang, 'Until', 'Hasta')} value={rangeValue.end} onChange={(value) => update(day, range, 'end', value)} lang={lang} />
                {range > 0 ? <button type="button" className="range-remove" title={tx(lang, 'Remove time range', 'Eliminar horario')} aria-label={tx(lang, 'Remove time range', 'Eliminar horario')} onClick={() => removeRange(day, range)}><Trash2 size={17} /></button> : null}
              </div>
            ))}
            {(schedule[day]?.length || 1) < 2 ? <button type="button" className="add-range" onClick={() => addRange(day)}><Plus size={16} /> {tx(lang, 'Add another time range', 'Agregar otro horario')}</button> : null}
          </div>
        </div>
      ))}
      {copiedFrom ? <p className="schedule-copy-status" role="status"><Check size={15} /> {tx(lang, `${copiedFrom} schedule copied to the other selected days.`, `Horario de ${optionLabel(lang, copiedFrom)} copiado a los demás días seleccionados.`)}</p> : null}
      {invalid && error ? <small className="field-error" role="alert">{error}</small> : null}
    </div>
  );
}

function FilePicker({ label, accept, multiple = true, onChange, hint, required = false, fieldKey, invalid = false, error, files = [] }) {
  return (
    <Field label={label} hint={hint} required={required} fieldKey={fieldKey} invalid={invalid} error={error}>
      <span className="file-picker"><Upload size={18} /><input type="file" accept={accept} multiple={multiple} onChange={(event) => onChange(Array.from(event.target.files || []))} /></span>
      {files.length ? <span className="loaded-file-list">{files.map((file) => <span key={`${file.name}-${file.size}`}><FileCheck2 size={14} />{file.name}</span>)}</span> : null}
    </Field>
  );
}

function PlatformNotice({ lang }) {
  return (
    <aside className="platform-notice">
      <ShieldCheck size={24} />
      <div>
        <strong>{tx(lang, 'How CarDaddy works', 'Cómo funciona CarDaddy')}</strong>
        <p>{tx(
          lang,
          'CarDaddy is a connection platform. Independent providers decide whether to accept an opportunity, diagnose the vehicle, set their own price, collect payment directly, and agree on repair terms and warranties with the customer.',
          'CarDaddy es una plataforma de conexión. Los proveedores independientes deciden si aceptan una oportunidad, diagnostican el vehículo, fijan su propio precio, cobran directamente y acuerdan con el cliente la reparación y la garantía.',
        )}</p>
        <small>{tx(lang, 'Draft notice for legal review. Not legal advice.', 'Aviso preliminar para revisión legal. No es asesoría legal.')}</small>
      </div>
    </aside>
  );
}

function EmailDeliveryNotice({ lang, compact = false }) {
  return (
    <aside className={`email-delivery-notice ${compact ? 'compact' : ''}`}>
      <MailCheck size={24} />
      <div>
        <strong>{tx(lang, 'Beta communications are by email', 'Durante la beta nos comunicamos por correo')}</strong>
        <p>{tx(
          lang,
          'Check that CarDaddy messages reach your inbox. If you do not see them, check Spam or Junk, mark them as "Not spam," and add CarDaddy to your contacts or safe senders.',
          'Asegúrate de que los mensajes de CarDaddy lleguen a tu bandeja de entrada. Si no aparecen, revisa Spam o Correo no deseado, márcalos como “No es spam” y agrega CarDaddy a tus contactos o remitentes seguros.',
        )}</p>
        <small>{tx(lang, 'No SMS, paid WhatsApp, or paid push notifications are used during this pilot.', 'Durante este piloto no usamos SMS, WhatsApp de pago ni notificaciones push de pago.')}</small>
      </div>
    </aside>
  );
}

function EmailConfirmationNotice({ lang, email, status = 'Pending', entityType, reference }) {
  const [resendStatus, setResendStatus] = useState('');
  const resend = async () => {
    setResendStatus(tx(lang, 'Requesting another message...', 'Solicitando otro mensaje...'));
    try {
      await resendEmailVerification({ entityType, reference, email });
      setResendStatus(tx(lang, 'Another verification message was queued.', 'Se agregó otro mensaje de verificación a la cola.'));
    } catch (error) {
      setResendStatus(error.message || tx(lang, 'Unable to resend yet.', 'Todavía no se puede reenviar.'));
    }
  };
  return (
    <div className="email-confirmation-notice">
      <MailCheck size={24} />
      <div>
        <strong>{tx(lang, 'Now check your email', 'Ahora revisa tu correo electrónico')}</strong>
        <p>{tx(lang, `A confirmation and verification message for ${email} was registered for delivery.`, `Registramos para envío una confirmación y verificación a ${email}.`)}</p>
        <small>{tx(lang, 'If it is not in your inbox, check Spam or Junk, mark CarDaddy as "Not spam," and add the sender to your contacts.', 'Si no está en tu bandeja de entrada, revisa Spam o Correo no deseado, marca a CarDaddy como “No es spam” y agrega el remitente a tus contactos.')} · {tx(lang, 'Email status', 'Estado del correo')}: {status}</small>
        {entityType && reference ? <button type="button" className="email-resend-button" onClick={resend}>{tx(lang, 'Resend verification email', 'Reenviar correo de verificación')}</button> : null}
        {resendStatus ? <small role="status">{resendStatus}</small> : null}
      </div>
    </div>
  );
}

async function readVideoDuration(file) {
  if (!file) return 0;
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('The demonstration video could not be read.'));
    };
    video.src = url;
  });
}

const initialProvider = {
  full_name: '', business_name: '', phone: '', email: '', state: 'Mississippi', city: '', zip_code: '',
  max_travel_radius: 30, max_travel_hours: '', languages: ['English'], years_experience: '', specialties: [],
  vehicle_types_served: [], vehicle_types_not_served: [], services_offered: [], services_not_offered: [],
  available_days: [], availability_schedule: {}, immediate_available: false, scheduled_available: true,
  availability_start_mode: 'Now', availability_start_date: '',
  night_available: false, emergency_available: false, all_day_available: false,
  minimum_inspection_fee: '', payment_methods: [],
  no_advance_fee_acknowledged: false,
  terms_accepted: false, privacy_accepted: false, independent_provider_acknowledged: false,
  media_publicity_consent: false,
};

const createSkillEvidenceItem = () => ({
  description: '', vehicle_type: '', vehicle_year: '', vehicle_make_model: '', photos: [], videos: [], certificates: [],
});

const demoServices = ['Diagnostics', 'Mechanical repair', 'Electrical repair', 'No-start help', 'Brakes', 'Roadside assistance', 'Car dolly towing'];

const demoProvider = {
  ...initialProvider,
  full_name: '[DEMO] Alex Rivera',
  business_name: 'Rivera Mobile Auto Demo',
  phone: '2285550147',
  email: 'alex.rivera.demo@example.com',
  city: 'Gulfport',
  zip_code: '39503',
  max_travel_radius: 40,
  max_travel_hours: '1',
  languages: ['English', 'Spanish'],
  years_experience: 9,
  specialties: ['Electrical diagnostics', 'Engine', 'Air conditioning'],
  vehicle_types_served: ['Car', 'Light truck', 'Diesel truck', 'Light equipment'],
  services_offered: demoServices,
  services_not_offered: ['Other'],
  available_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  availability_schedule: {
    Monday: [{ start: '08:00', end: '17:00' }],
    Tuesday: [{ start: '08:00', end: '17:00' }],
    Wednesday: [{ start: '08:00', end: '17:00' }],
    Thursday: [{ start: '08:00', end: '17:00' }],
    Friday: [{ start: '08:00', end: '17:00' }],
    Saturday: [{ start: '09:00', end: '14:00' }],
  },
  immediate_available: true,
  scheduled_available: true,
  night_available: false,
  emergency_available: true,
  minimum_inspection_fee: '75',
  payment_methods: ['Cash', 'Zelle', 'Cash App', 'Card'],
  no_advance_fee_acknowledged: true,
  terms_accepted: true,
  privacy_accepted: true,
  independent_provider_acknowledged: true,
  media_publicity_consent: true,
};

const createDemoSkillEvidence = () => ({
  'Electrical diagnostics': { ...createSkillEvidenceItem(), vehicle_type: 'Car', vehicle_year: '2017', vehicle_make_model: 'Honda Accord', description: 'Diagnosed an intermittent no-start condition, repaired damaged wiring in the starter circuit, and verified reliable operation.' },
  Engine: { ...createSkillEvidenceItem(), vehicle_type: 'Light truck', vehicle_year: '2015', vehicle_make_model: 'Ford F-150', description: 'Performed compression and fuel-system tests, replaced the failed component, and confirmed normal engine operation.' },
  'Air conditioning': { ...createSkillEvidenceItem(), vehicle_type: 'Car', vehicle_year: '2019', vehicle_make_model: 'Toyota Camry', description: 'Found a refrigerant leak, replaced the damaged seal, evacuated and recharged the system, and verified vent temperature.' },
});

async function publicAssetFile(path, name) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Unable to load demo file: ${name}`);
  const blob = await response.blob();
  return new File([blob], name, { type: blob.type || 'image/jpeg' });
}

function createDemoVideoFile() {
  return new Promise((resolve, reject) => {
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) {
      reject(new Error('This browser cannot create the temporary demonstration video.'));
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const context = canvas.getContext('2d');
    if (!context) {
      reject(new Error('Unable to prepare the temporary demonstration video.'));
      return;
    }
    const stream = canvas.captureStream(12);
    const chunks = [];
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const startedAt = performance.now();
    const draw = () => {
      const elapsed = performance.now() - startedAt;
      context.fillStyle = '#101418';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#f5b301';
      context.fillRect(0, 0, Math.min(canvas.width, elapsed / 2), 12);
      context.fillStyle = '#ffffff';
      context.font = '700 30px Arial';
      context.fillText('CarDaddy demo evidence', 130, 165);
      context.fillStyle = '#f5b301';
      context.font = '700 20px Arial';
      context.fillText('FICTIONAL TEST VIDEO', 196, 205);
    };
    const timer = window.setInterval(draw, 80);
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    recorder.onerror = () => reject(new Error('Unable to create the temporary demonstration video.'));
    recorder.onstop = () => {
      window.clearInterval(timer);
      stream.getTracks().forEach((track) => track.stop());
      resolve(new File(chunks, 'demo-skill-evidence.webm', { type: 'video/webm' }));
    };
    draw();
    recorder.start();
    window.setTimeout(() => recorder.stop(), 1200);
  });
}

function ProviderApplicationPage({ lang, shell }) {
  const ShellComponent = shell;
  const isDemoMode = new URLSearchParams(window.location.search).get('demo') === '1';
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(() => isDemoMode ? { ...demoProvider } : { ...initialProvider });
  const [toolPhotos, setToolPhotos] = useState([]);
  const [equipmentPhotos, setEquipmentPhotos] = useState([]);
  const [skillEvidence, setSkillEvidence] = useState(isDemoMode ? createDemoSkillEvidence : () => ({}));
  const [insurance, setInsurance] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!isDemoMode) return undefined;
    let active = true;
    Promise.all([
      publicAssetFile('/media/04_final_web/diagnostics_tools.jpg', 'demo-organized-tools.jpg'),
      publicAssetFile('/media/13_ai_professional_replacements/mobile_ai.jpg', 'demo-service-vehicle.jpg'),
      publicAssetFile('/media/13_ai_professional_replacements/diagnostics_ai.jpg', 'demo-electrical-diagnosis.jpg'),
      publicAssetFile('/media/04_final_web/gas_vehicle_repair.jpg', 'demo-engine-repair.jpg'),
      publicAssetFile('/media/04_final_web/electromechanical_troubleshooting.jpg', 'demo-ac-repair.jpg'),
      publicAssetFile('/media/10_logo_perfil/profile_logo_recommended.jpg', 'demo-certification.jpg'),
      publicAssetFile('/media/09_hero_banner/hero_clean_mechanic.jpg', 'demo-insurance-proof.jpg'),
      createDemoVideoFile(),
    ]).then(([toolsFile, equipmentFile, jobOne, jobTwo, jobThree, certificationFile, insuranceFile, demoVideo]) => {
      if (!active) return;
      setToolPhotos([toolsFile]);
      setEquipmentPhotos([equipmentFile]);
      setSkillEvidence((current) => Object.fromEntries(Object.entries(current).map(([skill, evidence], index) => [skill, {
        ...evidence,
        photos: [[jobOne], [jobTwo], [jobThree]][index],
        videos: [demoVideo],
        certificates: index === 0 ? [certificationFile] : [],
      }])));
      setInsurance([insuranceFile]);
    }).catch((error) => { if (active) setMessage(error.message); });
    return () => { active = false; };
  }, [isDemoMode]);
  const set = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
  };
  const setSkillEvidenceValue = (skill, index, key, value) => {
    setSkillEvidence((current) => ({ ...current, [skill]: { ...(current[skill] || createSkillEvidenceItem()), [key]: value } }));
    setFieldErrors((current) => ({ ...current, [`skill_evidence_${index}`]: undefined, skill_evidence: undefined }));
  };
  const setSpecialties = (values) => {
    set('specialties', values);
    setSkillEvidence((current) => Object.fromEntries(values.map((skill) => [skill, current[skill] || createSkillEvidenceItem()])));
  };

  const contactError = (key, value = form[key]) => {
    if (!value) return tx(lang, 'This field is required.', 'Este campo es obligatorio.');
    if (key === 'phone' && !isValidUsPhone(value)) return tx(lang, 'Enter a 10-digit phone number.', 'Ingresa un teléfono de 10 dígitos.');
    if (key === 'email' && !isValidEmail(value)) return tx(lang, 'Enter a valid email address, such as name@example.com.', 'Ingresa un correo válido, por ejemplo nombre@ejemplo.com.');
    if (key === 'zip_code' && !isValidZipCode(value)) return tx(lang, 'Enter a 5-digit ZIP code.', 'Ingresa un código postal de 5 dígitos.');
    return '';
  };

  const validateContactField = (key) => {
    const error = contactError(key);
    setFieldErrors((current) => ({ ...current, [key]: error || undefined }));
  };

  function showErrors(errors) {
    setFieldErrors(errors);
    setMessage(tx(lang, 'Check the fields marked in red before continuing.', 'Revisa los campos marcados en rojo antes de continuar.'));
    const firstKey = Object.keys(errors)[0];
    requestAnimationFrame(() => {
      const target = document.querySelector(`[data-field="${firstKey}"]`);
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target?.querySelector('input, select, textarea, button')?.focus({ preventScroll: true });
    });
  }

  function next() {
    const required = step === 1
      ? ['full_name', 'phone', 'email', 'state', 'city', 'zip_code', 'max_travel_radius', 'years_experience', 'languages']
      : step === 2 ? ['specialties', 'vehicle_types_served', 'services_offered'] : ['available_days'];
    const errors = Object.fromEntries(required
      .filter((key) => Array.isArray(form[key]) ? !form[key].length : form[key] === '' || form[key] === null)
      .map((key) => [key, tx(lang, 'This field is required.', 'Este campo es obligatorio.')]));
    if (step === 1) {
      ['phone', 'email', 'zip_code'].forEach((key) => {
        const error = contactError(key);
        if (error) errors[key] = error;
      });
    }
    if (step === 3 && form.available_days.length && !form.all_day_available) {
      const missingHours = form.available_days.some((day) => {
        const ranges = form.availability_schedule[day] || [];
        return !ranges.length || ranges.some((range) => !range.start || !range.end);
      });
      if (missingHours) errors.availability_schedule = tx(lang, 'Add a start and end time for every selected day.', 'Agrega una hora de inicio y fin para cada día seleccionado.');
    }
    if (step === 3 && form.scheduled_available && form.availability_start_mode === 'Date' && !form.availability_start_date) {
      errors.availability_start_date = tx(lang, 'Choose the date when your availability begins.', 'Elige la fecha en que comienza tu disponibilidad.');
    }
    if (Object.keys(errors).length) {
      showErrors(errors);
      return;
    }
    setFieldErrors({});
    setMessage('');
    setStep((current) => current + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit(event) {
    event.preventDefault();
    const evidenceErrors = {};
    const evidenceIssues = validateProviderSkillEvidence({ specialties: form.specialties, evidenceBySkill: skillEvidence, toolPhotos });
    if (evidenceIssues.tools) evidenceErrors.tools = tx(lang, 'Add at least one clear photo of tools you personally own and use.', 'Agrega al menos una foto clara de las herramientas que posees y utilizas.');
    form.specialties.forEach((skill, index) => {
      const issues = evidenceIssues[skill] || [];
      if (!issues.length) return;
      const issueLabels = {
        missing_video: tx(lang, 'a work video', 'un video del trabajo'),
        missing_description: tx(lang, 'an explanation of the work', 'una explicación del trabajo'),
        missing_vehicle_type: tx(lang, 'the vehicle or equipment type', 'el tipo de vehículo o equipo'),
        missing_vehicle_details: tx(lang, 'the make and model', 'la marca y el modelo'),
      };
      evidenceErrors[`skill_evidence_${index}`] = tx(lang, `Complete ${skill}: `, `Completa ${optionLabel(lang, skill)}: `) + issues.map((issue) => issueLabels[issue]).join(', ');
    });
    if (!form.terms_accepted || !form.privacy_accepted || !form.independent_provider_acknowledged || !form.no_advance_fee_acknowledged) {
      evidenceErrors.required_consents = tx(lang, 'Accept the required terms, payment policy, and independent-provider acknowledgement.', 'Acepta los términos requeridos, la política de cobro y la confirmación de proveedor independiente.');
    }
    if (Object.keys(evidenceErrors).length) {
      showErrors(evidenceErrors);
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      for (const evidence of Object.values(skillEvidence)) {
        for (const video of evidence.videos) {
          if (await readVideoDuration(video) > 300) throw new Error(tx(lang, 'Each skill video must be five minutes or less.', 'Cada video de habilidad debe durar cinco minutos o menos.'));
        }
      }
      const folder = `provider-intake/${crypto.randomUUID()}`;
      const media = [
        ...(await uploadPrivateFiles('provider-private', toolPhotos, `${folder}/tools`, 'image')).map((item) => ({ ...item, category: 'tools' })),
        ...(await uploadPrivateFiles('provider-private', equipmentPhotos, `${folder}/equipment`, 'image')).map((item) => ({ ...item, category: 'equipment' })),
      ];
      const certificationFiles = [];
      for (let index = 0; index < form.specialties.length; index += 1) {
        const skill = form.specialties[index];
        const evidence = skillEvidence[skill];
        const evidenceDetails = {
          skill,
          description: evidence.description.trim(),
          vehicle_type: evidence.vehicle_type,
          vehicle_year: evidence.vehicle_year.trim(),
          vehicle_make_model: evidence.vehicle_make_model.trim(),
        };
        media.push(
          ...(await uploadPrivateFiles('provider-private', evidence.photos, `${folder}/skills/${index + 1}/photos`, 'image')).map((item) => ({ ...item, ...evidenceDetails, category: 'skill_evidence_photo' })),
          ...(await uploadPrivateFiles('provider-private', evidence.videos, `${folder}/skills/${index + 1}/videos`, 'video')).map((item) => ({ ...item, ...evidenceDetails, category: 'skill_evidence_video' })),
        );
        certificationFiles.push(
          ...(await uploadPrivateFiles('provider-private', evidence.certificates, `${folder}/skills/${index + 1}/certificates`, 'document')).map((item) => ({ ...item, ...evidenceDetails, category: 'skill_certificate' })),
        );
      }
      const insuranceFiles = await uploadPrivateFiles('provider-private', insurance, `${folder}/insurance`, 'document');
      const result = await submitProviderApplication({
        ...form,
        media_manifest: media,
        certifications_manifest: certificationFiles,
        commercial_insurance_manifest: insuranceFiles,
      });
      setConfirmation({ ...result, email: form.email });
      setMessage('');
    } catch (error) {
      setMessage(error.message || 'Unable to save the application.');
    } finally {
      setBusy(false);
    }
  }

  if (confirmation) return (
    <ShellComponent>
      <section className="platform-confirmation">
        <div className="confirmation-icon"><UserRoundCheck /></div>
        <p className="eyebrow">CarDaddy Network</p>
        <h1>{tx(lang, 'Application received', 'Solicitud recibida')}</h1>
        <p>{tx(lang, 'Your application is pending review. Portal access is created only after approval.', 'Tu solicitud está pendiente de revisión. El acceso al portal se crea únicamente después de la aprobación.')}</p>
        <EmailConfirmationNotice lang={lang} email={confirmation.email} status={confirmation.email_notification_status || 'Pending'} entityType="provider_application" reference={confirmation.id} />
        <a className="btn btn-primary" href={languages[lang].homePath}>{tx(lang, 'Return Home', 'Volver al Inicio')}</a>
      </section>
    </ShellComponent>
  );

  return (
    <ShellComponent>
      <PageIntro eyebrow="CarDaddy Network" title={tx(lang, 'Join the CarDaddy Network', 'Únete a la red CarDaddy')} body={tx(lang, 'Apply as an independent automotive provider. Your profile and private evidence are reviewed before approval.', 'Solicita participar como proveedor automotriz independiente. Tu perfil y evidencia privada se revisan antes de aprobarse.')} />
      {isDemoMode ? <div className="demo-mode-banner"><AlertTriangle size={20} /><div><strong>{tx(lang, 'Temporary review mode', 'Modo temporal de revisión')}</strong><span>{tx(lang, 'Every step contains fictional test data. Demo evidence loads automatically on the final step and any submitted application is clearly marked [DEMO].', 'Todos los pasos contienen datos ficticios de prueba. La evidencia demo se carga automáticamente en el último paso y cualquier solicitud enviada queda marcada claramente como [DEMO].')}</span></div></div> : null}
      <EmailDeliveryNotice lang={lang} />
      <section className={`provider-payment-policy ${form.no_advance_fee_acknowledged ? 'is-accepted' : ''}`} aria-labelledby="provider-payment-policy-title">
        <div className="provider-payment-policy-icon"><ShieldCheck size={28} /></div>
        <div className="provider-payment-policy-copy">
          <p className="eyebrow">{tx(lang, 'Required payment policy', 'Política de cobro obligatoria')}</p>
          <h2 id="provider-payment-policy-title">{tx(lang, 'No payment before you arrive', 'Ningún cobro antes de llegar')}</h2>
          <p>{tx(lang, 'CarDaddy builds trust by never asking a customer to pay a provider in advance. Do not request deposits, travel fees, mobilization fees, or any other payment before you physically arrive at the service location.', 'CarDaddy genera confianza sin pedirle al cliente pagos por adelantado. No solicites depósitos, tarifas de viaje, tarifas de movilización ni ningún otro pago antes de llegar físicamente al lugar del servicio.')}</p>
          <div className="provider-payment-sequence">
            <span><b>1</b>{tx(lang, 'Agree on the inspection fee with the customer before the visit.', 'Acuerda con el cliente la tarifa de inspección antes de la visita.')}</span>
            <span><b>2</b>{tx(lang, 'Arrive physically at the service location.', 'Llega físicamente al lugar del servicio.')}</span>
            <span><b>3</b>{tx(lang, 'Collect the agreed inspection fee before beginning the inspection.', 'Cobra la tarifa de inspección acordada antes de comenzar la inspección.')}</span>
          </div>
          <p className="provider-payment-warning">{tx(lang, 'If you are not willing to work under this payment model, please do not submit an application.', 'Si no estás dispuesto a trabajar bajo esta modalidad de cobro, por favor no llenes la solicitud.')}</p>
          <label className="provider-payment-acceptance">
            <input type="checkbox" checked={form.no_advance_fee_acknowledged} onChange={(event) => set('no_advance_fee_acknowledged', event.target.checked)} />
            <span><strong>{tx(lang, 'I understand and agree', 'Entiendo y acepto')}</strong><small>{tx(lang, 'I will follow this no-advance-payment policy for every CarDaddy request.', 'Cumpliré esta política de cero pagos por adelantado en cada solicitud de CarDaddy.')}</small></span>
          </label>
        </div>
      </section>
      {form.no_advance_fee_acknowledged ? <>
        <WizardProgress step={step} labels={tx(lang, ['Contact', 'Services', 'Availability', 'Evidence'], ['Contacto', 'Servicios', 'Disponibilidad', 'Evidencia'])} />
        <form className="platform-wizard" onSubmit={submit}>
        {step === 1 ? <div className="form-grid">
          <Field label={tx(lang, 'Full name', 'Nombre completo')} required fieldKey="full_name" invalid={Boolean(fieldErrors.full_name)} error={fieldErrors.full_name}><input value={form.full_name} onChange={(e) => set('full_name', e.target.value)} /></Field>
          <Field label={tx(lang, 'Business name, optional', 'Nombre comercial, opcional')}><input value={form.business_name} onChange={(e) => set('business_name', e.target.value)} /></Field>
          <Field label={tx(lang, 'Phone', 'Teléfono')} required hint={tx(lang, '10 digits, numbers only.', '10 dígitos, solo números.')} fieldKey="phone" invalid={Boolean(fieldErrors.phone)} error={fieldErrors.phone}><input type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="tel" maxLength="10" value={form.phone} aria-invalid={Boolean(fieldErrors.phone)} onBlur={() => validateContactField('phone')} onChange={(e) => set('phone', digitsOnly(e.target.value, 10))} /></Field>
          <Field label={tx(lang, 'Email', 'Correo')} required fieldKey="email" invalid={Boolean(fieldErrors.email)} error={fieldErrors.email}><input type="email" inputMode="email" autoComplete="email" value={form.email} aria-invalid={Boolean(fieldErrors.email)} onBlur={() => validateContactField('email')} onChange={(e) => set('email', e.target.value.trimStart())} /></Field>
          <Field label={tx(lang, 'State', 'Estado')} required fieldKey="state" invalid={Boolean(fieldErrors.state)} error={fieldErrors.state}><select value={form.state} autoComplete="address-level1" onChange={(e) => { set('state', e.target.value); set('city', ''); }}>{launchStates.map((state) => <option key={state}>{state}</option>)}</select></Field>
          <CityAutocompleteField lang={lang} state={form.state} value={form.city} onChange={(value) => set('city', value)} fieldKey="city" invalid={Boolean(fieldErrors.city)} error={fieldErrors.city} />
          <Field label={tx(lang, 'ZIP code', 'Código postal')} required hint={tx(lang, '5 digits, numbers only.', '5 dígitos, solo números.')} fieldKey="zip_code" invalid={Boolean(fieldErrors.zip_code)} error={fieldErrors.zip_code}><input inputMode="numeric" pattern="[0-9]*" autoComplete="postal-code" maxLength="5" value={form.zip_code} aria-invalid={Boolean(fieldErrors.zip_code)} onBlur={() => validateContactField('zip_code')} onChange={(e) => set('zip_code', digitsOnly(e.target.value, 5))} /></Field>
          <Field label={tx(lang, 'Maximum work radius (miles)', 'Radio máximo de trabajo (millas)')} required hint={tx(lang, 'Approximate distance you are willing to travel from your location to a mobile job.', 'Distancia aproximada que estás dispuesto a recorrer desde tu ubicación hasta un servicio móvil.')} fieldKey="max_travel_radius" invalid={Boolean(fieldErrors.max_travel_radius)} error={fieldErrors.max_travel_radius}><input type="number" inputMode="numeric" min="1" max="300" value={form.max_travel_radius} onChange={(e) => set('max_travel_radius', e.target.value)} /></Field>
          <Field label={tx(lang, 'Maximum one-way travel time (optional)', 'Tiempo máximo de viaje de ida (opcional)')} hint={tx(lang, 'Choose how long you would drive from your location to a mobile job.', 'Elige cuánto tiempo conducirías desde tu ubicación hasta un servicio móvil.')}><select value={form.max_travel_hours} onChange={(e) => set('max_travel_hours', e.target.value)}><option value="">{tx(lang, 'Not specified', 'No especificado')}</option><option value="0.5">30 {tx(lang, 'minutes', 'minutos')}</option><option value="1">1 {tx(lang, 'hour', 'hora')}</option><option value="1.5">1.5 {tx(lang, 'hours', 'horas')}</option><option value="2">2 {tx(lang, 'hours', 'horas')}</option><option value="3">3 {tx(lang, 'hours', 'horas')}</option><option value="4">4 {tx(lang, 'hours', 'horas')}</option></select></Field>
          <Field label={tx(lang, 'Years of experience (verifiable)', 'Años de experiencia (comprobables)')} required fieldKey="years_experience" invalid={Boolean(fieldErrors.years_experience)} error={fieldErrors.years_experience}><input type="number" inputMode="numeric" min="0" max="80" value={form.years_experience} onChange={(e) => set('years_experience', e.target.value)} /></Field>
          <CheckboxGroup lang={lang} label={tx(lang, 'Languages', 'Idiomas')} options={['English', 'Spanish']} values={form.languages} onChange={(value) => set('languages', value)} required fieldKey="languages" invalid={Boolean(fieldErrors.languages)} error={fieldErrors.languages} />
        </div> : null}

        {step === 2 ? <div className="form-grid">
          <CheckboxGroup lang={lang} label={tx(lang, 'Verifiable skills and specialties', 'Habilidades y especialidades comprobables')} options={specialties} values={form.specialties} onChange={setSpecialties} required fieldKey="specialties" invalid={Boolean(fieldErrors.specialties)} error={fieldErrors.specialties} />
          <CheckboxGroup lang={lang} label={tx(lang, 'Vehicle types served', 'Tipos de vehículos que atiendes')} options={vehicleTypes} values={form.vehicle_types_served} onChange={(value) => set('vehicle_types_served', value)} required fieldKey="vehicle_types_served" invalid={Boolean(fieldErrors.vehicle_types_served)} error={fieldErrors.vehicle_types_served} />
          <CheckboxGroup lang={lang} label={tx(lang, 'Services performed', 'Servicios que realizas')} options={serviceTypes} values={form.services_offered} onChange={(value) => {
            set('services_offered', value);
          }} required fieldKey="services_offered" invalid={Boolean(fieldErrors.services_offered)} error={fieldErrors.services_offered} />
          <details className="optional-form-section full">
            <summary>{tx(lang, 'Optional: services you prefer not to perform', 'Opcional: servicios que prefieres no realizar')}</summary>
            <CheckboxGroup lang={lang} label={tx(lang, 'Do not match me with these services', 'No asignarme estos servicios')} options={[...serviceTypes, 'Bodywork', 'Paint']} values={form.services_not_offered} onChange={(value) => set('services_not_offered', value)} />
          </details>
          <div className="inspection-fee-field full">
          <Field
            label={tx(lang, 'Minimum inspection fee', 'Tarifa mínima de inspección')}
            hint={tx(lang, 'Agree on this amount before the visit. It may only be collected after you physically arrive and before the inspection begins. Travel and mobilization fees are not permitted.', 'Acuerda este valor antes de la visita. Solo puede cobrarse después de que llegues físicamente y antes de comenzar la inspección. No se permiten tarifas de viaje ni de movilización.')}
          ><input type="number" min="0" step="0.01" placeholder="0.00" value={form.minimum_inspection_fee} onChange={(e) => set('minimum_inspection_fee', e.target.value)} /></Field>
          <div className="inspection-fee-reminder"><ShieldCheck size={18} /><span>{tx(lang, 'No advance payment. No travel or mobilization fee.', 'Sin pagos por adelantado. Sin tarifa de viaje ni movilización.')}</span></div>
          </div>
          <CheckboxGroup lang={lang} label={tx(lang, 'Accepted payment methods', 'Métodos de pago aceptados')} options={paymentMethods} values={form.payment_methods} onChange={(value) => set('payment_methods', value)} />
        </div> : null}

        {step === 3 ? <div className="form-grid">
          <CheckboxGroup lang={lang} label={tx(lang, 'Available days', 'Días disponibles')} options={days} values={form.available_days} onChange={(value) => set('available_days', value)} required fieldKey="available_days" invalid={Boolean(fieldErrors.available_days)} error={fieldErrors.available_days} />
          {!form.all_day_available ? <ScheduleEditor lang={lang} selectedDays={form.available_days} schedule={form.availability_schedule} onChange={(value) => set('availability_schedule', value)} invalid={Boolean(fieldErrors.availability_schedule)} error={fieldErrors.availability_schedule} /> : null}
          <div className="boolean-grid full">
            <BooleanChoice label={tx(lang, 'Available for new requests now', 'Disponible para nuevas solicitudes ahora')} description={tx(lang, 'CarDaddy may consider you for immediate requests.', 'CarDaddy puede considerarte para solicitudes inmediatas.')} checked={form.immediate_available} onChange={(value) => set('immediate_available', value)} />
            <BooleanChoice label={tx(lang, 'Accept scheduled appointments', 'Acepto citas programadas')} description={tx(lang, 'Customers can request a future date and time.', 'Los clientes pueden solicitar una fecha y hora futuras.')} checked={form.scheduled_available} onChange={(value) => set('scheduled_available', value)} />
            <BooleanChoice label={tx(lang, 'Available at night', 'Disponible por la noche')} description={tx(lang, 'You choose the exact hours above.', 'Tú eliges las horas exactas arriba.')} checked={form.night_available} onChange={(value) => set('night_available', value)} />
            <BooleanChoice label={tx(lang, 'Available for emergencies', 'Disponible para emergencias')} description={tx(lang, 'This does not require you to accept every request.', 'Esto no te obliga a aceptar todas las solicitudes.')} checked={form.emergency_available} onChange={(value) => set('emergency_available', value)} />
            <BooleanChoice label={tx(lang, 'Available all day on selected days', 'Disponible todo el día en los días seleccionados')} description={tx(lang, 'Use this only when no start or end time is needed.', 'Úsalo solo cuando no necesites una hora de inicio o fin.')} checked={form.all_day_available} onChange={(value) => set('all_day_available', value)} />
          </div>
          {form.scheduled_available ? <div className="availability-start full">
            <CalendarDays size={22} />
            <div>
              <strong>{tx(lang, 'When does this availability begin?', '¿Cuándo comienza esta disponibilidad?')}</strong>
              <div className="segmented-options">
                <label><input type="radio" name="availability-start" checked={form.availability_start_mode === 'Now'} onChange={() => { set('availability_start_mode', 'Now'); set('availability_start_date', ''); }} /> {tx(lang, 'Starting today, until I update it', 'Desde hoy, hasta que yo la cambie')}</label>
                <label><input type="radio" name="availability-start" checked={form.availability_start_mode === 'Date'} onChange={() => set('availability_start_mode', 'Date')} /> {tx(lang, 'Starting on a specific date', 'Desde una fecha específica')}</label>
              </div>
              {form.availability_start_mode === 'Date' ? <Field label={tx(lang, 'Start date', 'Fecha de inicio')} fieldKey="availability_start_date" invalid={Boolean(fieldErrors.availability_start_date)} error={fieldErrors.availability_start_date}><input type="date" value={form.availability_start_date} onChange={(event) => set('availability_start_date', event.target.value)} /></Field> : null}
            </div>
          </div> : null}
          <p className="form-help full">{tx(lang, '24/7 service is optional. Each independent provider controls their own schedule.', 'La disponibilidad 24/7 es opcional. Cada proveedor independiente controla su propio horario.')}</p>
        </div> : null}

        {step === 4 ? <div className="form-grid">
          <FilePicker label={tx(lang, 'Your own tools', 'Tus herramientas propias')} accept="image/jpeg,image/png,image/webp" onChange={setToolPhotos} files={toolPhotos} required fieldKey="tools" invalid={Boolean(fieldErrors.tools)} error={fieldErrors.tools} hint={tx(lang, 'Required: show the hand tools and diagnostic tools you personally own and use, preferably clean and organized. JPG, PNG or WebP; 12 MB each.', 'Obligatorio: muestra las herramientas manuales y de diagnóstico que posees y utilizas, preferiblemente limpias y organizadas. JPG, PNG o WebP; 12 MB cada archivo.')} />
          <FilePicker label={tx(lang, 'Service equipment and transportation', 'Equipo y transporte de servicio')} accept="image/jpeg,image/png,image/webp" onChange={setEquipmentPhotos} files={equipmentPhotos} hint={tx(lang, 'Show items such as your service vehicle, jack, compressor, generator, scanner, or other larger equipment.', 'Muestra elementos como tu vehículo de servicio, gato, compresor, generador, escáner u otro equipo de mayor tamaño.')} />
          <div className={`work-samples full ${fieldErrors.skill_evidence ? 'field-invalid' : ''}`} data-field="skill_evidence">
            <div className="work-samples-heading">
              <div><strong>{tx(lang, 'Evidence for every selected skill', 'Evidencia para cada habilidad seleccionada')}</strong><p>{tx(lang, 'Every skill requires at least one video showing work you performed. Explain the problem, what you did, and the result. Photos and certificates are optional supporting evidence.', 'Cada habilidad requiere al menos un video que muestre un trabajo realizado por ti. Explica el problema, qué hiciste y cuál fue el resultado. Las fotos y certificados son evidencia adicional opcional.')}</p></div>
            </div>
            {form.specialties.map((skill, index) => {
              const evidence = skillEvidence[skill] || createSkillEvidenceItem();
              const errorKey = `skill_evidence_${index}`;
              return <article className={`work-sample skill-evidence-card ${fieldErrors[errorKey] ? 'field-invalid' : ''}`} data-field={errorKey} key={skill}>
              <header><span>{String(index + 1).padStart(2, '0')}</span><div><small>{tx(lang, 'Skill to verify', 'Habilidad por comprobar')}</small><strong>{optionLabel(lang, skill)}</strong></div></header>
              <div className="skill-asset-grid">
                <Field label={tx(lang, 'Vehicle or equipment type', 'Tipo de vehículo o equipo')} required><select value={evidence.vehicle_type} onChange={(event) => setSkillEvidenceValue(skill, index, 'vehicle_type', event.target.value)}><option value="">{tx(lang, 'Select one', 'Selecciona uno')}</option>{vehicleTypes.map((type) => <option value={type} key={type}>{optionLabel(lang, type)}</option>)}</select></Field>
                <Field label={tx(lang, 'Year, optional', 'Año, opcional')}><input inputMode="numeric" maxLength="4" value={evidence.vehicle_year} onChange={(event) => setSkillEvidenceValue(skill, index, 'vehicle_year', digitsOnly(event.target.value, 4))} placeholder="2018" /></Field>
                <Field label={tx(lang, 'Make and model', 'Marca y modelo')} required hint={tx(lang, 'For equipment or boats, enter the brand and model.', 'Para equipos o botes, indica la marca y el modelo.')}><input value={evidence.vehicle_make_model} onChange={(event) => setSkillEvidenceValue(skill, index, 'vehicle_make_model', event.target.value)} placeholder={tx(lang, 'Example: Ford F-150', 'Ejemplo: Ford F-150')} /></Field>
              </div>
              <Field label={tx(lang, 'What did you diagnose or repair?', '¿Qué diagnosticaste o reparaste?')} required hint={tx(lang, 'Describe the original problem, your diagnosis, the work you personally performed, and the final result.', 'Describe el problema original, tu diagnóstico, el trabajo que realizaste personalmente y el resultado final.')}><textarea value={evidence.description} onChange={(event) => setSkillEvidenceValue(skill, index, 'description', event.target.value)} /></Field>
              <div className="work-sample-fields">
                <FilePicker label={tx(lang, 'Work video', 'Video del trabajo')} accept="video/mp4,video/quicktime,video/webm" onChange={(files) => setSkillEvidenceValue(skill, index, 'videos', files)} files={evidence.videos} required hint={tx(lang, 'Required. Show the work and explain what you are doing. Up to five minutes per video.', 'Obligatorio. Muestra el trabajo y explica qué estás haciendo. Máximo cinco minutos por video.')} />
                <FilePicker label={tx(lang, 'Work photos, optional', 'Fotos del trabajo, opcional')} accept="image/jpeg,image/png,image/webp" onChange={(files) => setSkillEvidenceValue(skill, index, 'photos', files)} files={evidence.photos} />
                <FilePicker label={tx(lang, 'Certificate for this skill, optional', 'Certificado de esta habilidad, opcional')} accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(files) => setSkillEvidenceValue(skill, index, 'certificates', files)} files={evidence.certificates} hint={tx(lang, 'Training, course, or technical certification supporting this specific skill.', 'Curso, capacitación o certificación técnica que respalde esta habilidad específica.')} />
              </div>
              {fieldErrors[errorKey] ? <small className="field-error" role="alert">{fieldErrors[errorKey]}</small> : null}
            </article>;
            })}
          </div>
          <FilePicker label={tx(lang, 'Commercial insurance, optional', 'Seguro comercial, opcional')} accept="application/pdf,image/jpeg,image/png,image/webp" onChange={setInsurance} files={insurance} hint={tx(lang, 'Upload proof only if you currently have commercial coverage.', 'Sube el comprobante solamente si actualmente posees cobertura comercial.')} />
          <div className={`consent-stack full ${fieldErrors.required_consents ? 'field-invalid' : ''}`} data-field="required_consents">
            <BooleanChoice label={tx(lang, 'I accept the draft network terms and privacy notice.', 'Acepto los términos preliminares de la red y el aviso de privacidad.')} checked={form.terms_accepted && form.privacy_accepted} onChange={(value) => { set('terms_accepted', value); set('privacy_accepted', value); }} />
            <BooleanChoice label={tx(lang, 'I understand that I am applying as an independent provider, not as a CarDaddy employee.', 'Entiendo que solicito participar como proveedor independiente, no como empleado de CarDaddy.')} checked={form.independent_provider_acknowledged} onChange={(value) => set('independent_provider_acknowledged', value)} />
            <div className="payment-policy-confirmed"><Check size={17} /><span>{tx(lang, 'Required no-advance-payment policy accepted.', 'Política obligatoria de cero pagos por adelantado aceptada.')}</span></div>
            <BooleanChoice label={tx(lang, 'Optional media permission', 'Permiso opcional de contenido')} description={tx(lang, 'I confirm I have the right to share the submitted media and grant CarDaddy non-exclusive permission to use selected work samples on its website and social channels. Nothing is published automatically.', 'Confirmo que tengo derecho a compartir el contenido enviado y otorgo a CarDaddy permiso no exclusivo para usar trabajos seleccionados en su sitio web y redes sociales. Nada se publica automáticamente.')} checked={form.media_publicity_consent} onChange={(value) => set('media_publicity_consent', value)} />
            {fieldErrors.required_consents ? <small className="field-error" role="alert">{fieldErrors.required_consents}</small> : null}
          </div>
          <div className="private-file-note full"><LockKeyhole size={20} /><span>{tx(lang, 'Evidence remains private unless separate media permission is granted and CarDaddy selects it for publication. Final wording requires legal review.', 'La evidencia permanece privada salvo que se otorgue el permiso de contenido y CarDaddy la seleccione para publicación. La redacción final requiere revisión legal.')}</span></div>
        </div> : null}

        {message ? <p className="status-message">{message}</p> : null}
        <WizardActions step={step} total={4} back={() => setStep((current) => current - 1)} next={next} submitLabel={tx(lang, 'Submit Application', 'Enviar Solicitud')} busy={busy} lang={lang} />
        </form>
      </> : null}
    </ShellComponent>
  );
}

const initialCase = {
  customer_name: '', phone: '', email: '', state: 'Mississippi', city: '', zip_code: '',
  vehicle_year: '', vehicle_make: '', vehicle_model: '', vin: '', vehicle_type: 'Car', fuel_type: '',
  problem_description: '', vehicle_starts: '', vehicle_moves: '', service_requested: 'Diagnostics',
  specialty_needed: 'General automotive mechanics', urgency: 'Immediate', preferred_date: '', preferred_time: '',
  preferred_language: 'English', share_consent: false, platform_notice_acknowledged: false,
  no_advance_payment_acknowledged: false, source: '', campaign: '',
};

function ServiceRequestPage({ lang, shell }) {
  const ShellComponent = shell;
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      ...initialCase,
      preferred_language: lang === 'es' ? 'Spanish' : 'English',
      source: params.get('source') || '',
      campaign: params.get('campaign') || '',
    };
  });
  const [photos, setPhotos] = useState([]);
  const [videos, setVideos] = useState([]);
  const [message, setMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [confirmation, setConfirmation] = useState(null);
  const [busy, setBusy] = useState(false);
  const [catalogModels, setCatalogModels] = useState([]);
  const [catalogStatus, setCatalogStatus] = useState('idle');
  const set = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
  };
  const setVehicleField = (key, value) => {
    setForm((current) => {
      const next = { ...current, [key]: value };
      return { ...next, vehicle_type: inferVehicleType(next) };
    });
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
  };

  useEffect(() => {
    const year = form.vehicle_year.trim();
    const make = form.vehicle_make.trim();
    setCatalogModels([]);
    if (!/^\d{4}$/.test(year) || make.length < 2) {
      setCatalogStatus('idle');
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setCatalogStatus('loading');
      try {
        const models = await fetchVehicleModels(year, make, { signal: controller.signal });
        setCatalogModels(models);
        setCatalogStatus(models.length ? 'ready' : 'empty');
      } catch (error) {
        if (error.name !== 'AbortError') setCatalogStatus('fallback');
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [form.vehicle_make, form.vehicle_year]);

  function showCaseErrors(errors) {
    setFieldErrors(errors);
    setMessage(tx(lang, 'Check the fields marked in red before continuing.', 'Revisa los campos marcados en rojo antes de continuar.'));
    const firstKey = Object.keys(errors)[0];
    requestAnimationFrame(() => {
      const target = document.querySelector(`[data-field="${firstKey}"]`);
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target?.querySelector('input, select, textarea')?.focus({ preventScroll: true });
    });
  }

  function next() {
    const requiredKeys = step === 1
      ? ['customer_name', 'phone', 'email', 'state', 'city', 'zip_code']
      : ['vehicle_year', 'vehicle_make', 'vehicle_model', 'fuel_type', 'vehicle_starts', 'vehicle_moves'];
    const errors = Object.fromEntries(requiredKeys.filter((key) => !form[key]).map((key) => [key, tx(lang, 'This field is required.', 'Este campo es obligatorio.')]));
    if (step === 1 && form.phone && !isValidUsPhone(form.phone)) errors.phone = tx(lang, 'Enter a 10-digit phone number.', 'Ingresa un teléfono de 10 dígitos.');
    if (step === 1 && form.email && !isValidEmail(form.email)) errors.email = tx(lang, 'Enter a valid email address, such as name@example.com.', 'Ingresa un correo válido, por ejemplo nombre@ejemplo.com.');
    if (step === 1 && form.zip_code && !isValidZipCode(form.zip_code)) errors.zip_code = tx(lang, 'Enter a 5-digit ZIP code.', 'Ingresa un código postal de 5 dígitos.');
    if (step === 2 && form.vehicle_year && (!/^\d{4}$/.test(form.vehicle_year) || Number(form.vehicle_year) < 1900 || Number(form.vehicle_year) > new Date().getFullYear() + 2)) errors.vehicle_year = tx(lang, 'Enter a valid 4-digit model year.', 'Ingresa un año válido de 4 dígitos.');
    if (Object.keys(errors).length) {
      showCaseErrors(errors);
      return;
    }
    setFieldErrors({});
    setMessage('');
    const nextStep = step + 1;
    setStep(nextStep);
    scrollToWizardProgress();
  }

  async function submit(event) {
    event.preventDefault();
    if (!form.share_consent || !form.platform_notice_acknowledged || !form.no_advance_payment_acknowledged) {
      setMessage(tx(lang, 'Accept every required acknowledgement.', 'Acepta todas las autorizaciones requeridas.'));
      return;
    }
    setBusy(true);
    try {
      const folder = `case-intake/${crypto.randomUUID()}`;
      const media = [
        ...(await uploadPrivateFiles('case-private', photos, `${folder}/photos`, 'image')).map((item) => ({ ...item, category: 'customer_photo' })),
        ...(await uploadPrivateFiles('case-private', videos, `${folder}/videos`, 'video')).map((item) => ({ ...item, category: 'customer_video' })),
      ];
      const result = await submitServiceCase({ ...form, vehicle_type: inferVehicleType(form), media_manifest: media });
      setConfirmation(result);
      setMessage('');
    } catch (error) {
      setMessage(error.message || 'Unable to submit the request.');
    } finally {
      setBusy(false);
    }
  }

  if (confirmation) return (
    <ShellComponent>
      <section className="platform-confirmation">
        <div className="confirmation-icon"><FileCheck2 /></div>
        <p className="eyebrow">CarDaddy</p>
        <h1>{tx(lang, 'Request received', 'Solicitud recibida')}</h1>
        <p>{tx(lang, 'Keep this case number. CarDaddy will look for a compatible independent provider without promising availability until one accepts.', 'Guarda este número de caso. CarDaddy buscará un proveedor independiente compatible sin prometer disponibilidad hasta que uno acepte.')}</p>
        <strong className="case-number">{confirmation.case_number}</strong>
        <p>{tx(lang, 'Initial status:', 'Estado inicial:')} {confirmation.status}</p>
        <EmailConfirmationNotice lang={lang} email={form.email} status={confirmation.email_notification_status || 'Pending'} entityType="service_case" reference={confirmation.case_number} />
        <a className="btn btn-primary" href={languages[lang].homePath}>{tx(lang, 'Return Home', 'Volver al Inicio')}</a>
      </section>
    </ShellComponent>
  );

  return (
    <ShellComponent>
      <PageIntro eyebrow="CarDaddy" title={tx(lang, 'Request Service', 'Solicitar servicio')} body={tx(lang, 'Tell us what happened. A complete request helps us identify compatible independent providers.', 'Cuéntanos qué ocurrió. Una solicitud completa nos ayuda a identificar proveedores independientes compatibles.')} />
      <section className={`provider-payment-policy customer-payment-policy ${form.no_advance_payment_acknowledged ? 'is-accepted' : ''}`} aria-labelledby="customer-payment-policy-title">
        <div className="provider-payment-policy-icon"><ShieldCheck size={28} /></div>
        <div className="provider-payment-policy-copy">
          <p className="eyebrow">{tx(lang, 'Your payment protection', 'Tu protección de pago')}</p>
          <h2 id="customer-payment-policy-title">{tx(lang, 'Do not pay anything until the mechanic is in front of your vehicle', 'No pagues nada hasta que el mecánico esté frente a tu vehículo')}</h2>
          <p>{tx(lang, 'CarDaddy does not request advance payments. Do not pay deposits, reservations, travel or mobilization fees, or send money through Cash App, Zelle, or another method before the provider physically arrives.', 'CarDaddy no solicita pagos por adelantado. No pagues depósitos, reservas, tarifas de viaje o movilización ni envíes dinero por Cash App, Zelle u otro medio antes de que el proveedor llegue físicamente.')}</p>
          <p className="provider-payment-warning">{tx(lang, 'After arrival, you may pay the inspection fee agreed in advance before inspection or repair begins.', 'Después de su llegada, podrás pagar la tarifa de inspección acordada previamente antes de que comience la inspección o reparación.')}</p>
          <label className="provider-payment-acceptance">
            <input type="checkbox" checked={form.no_advance_payment_acknowledged} onChange={(event) => set('no_advance_payment_acknowledged', event.target.checked)} />
            <span><strong>{tx(lang, 'I understand and agree', 'Entiendo y acepto')}</strong><small>{tx(lang, 'I will not pay anything before the provider physically arrives. Once present, I may pay the agreed inspection fee before service begins.', 'No pagaré nada antes de que el proveedor llegue físicamente. Una vez presente, podré pagar la tarifa de inspección acordada antes de comenzar el servicio.')}</small></span>
          </label>
        </div>
      </section>
      {form.no_advance_payment_acknowledged ? <>
        <EmailDeliveryNotice lang={lang} />
        <WizardProgress step={step} labels={tx(lang, ['Contact', 'Vehicle', 'Schedule & consent'], ['Contacto', 'Vehículo', 'Horario y autorización'])} />
        <form className="platform-wizard" onSubmit={submit}>
        {step === 1 ? <div className="form-grid" data-wizard-step="1">
          <Field label={tx(lang, 'Name', 'Nombre')} required fieldKey="customer_name" invalid={Boolean(fieldErrors.customer_name)} error={fieldErrors.customer_name}><input value={form.customer_name} onChange={(e) => set('customer_name', e.target.value)} /></Field>
          <Field label={tx(lang, 'Phone', 'Teléfono')} required hint={tx(lang, '10 digits, numbers only. Used only when a provider has accepted.', '10 dígitos, solo números. Se usa únicamente cuando un proveedor haya aceptado.')} fieldKey="phone" invalid={Boolean(fieldErrors.phone)} error={fieldErrors.phone}><input type="text" inputMode="numeric" pattern="[0-9]*" maxLength="10" value={form.phone} onChange={(e) => set('phone', digitsOnly(e.target.value, 10))} /></Field>
          <Field label={tx(lang, 'Email', 'Correo')} required hint={tx(lang, 'Required for verification and all beta communications.', 'Obligatorio para verificación y todas las comunicaciones de la beta.')} fieldKey="email" invalid={Boolean(fieldErrors.email)} error={fieldErrors.email}><input type="email" inputMode="email" autoComplete="email" value={form.email} onChange={(e) => set('email', e.target.value.trimStart())} /></Field>
          <Field label={tx(lang, 'State', 'Estado')} required fieldKey="state" invalid={Boolean(fieldErrors.state)} error={fieldErrors.state}><select autoComplete="address-level1" value={form.state} onChange={(e) => { set('state', e.target.value); set('city', ''); }}>{launchStates.map((state) => <option key={state}>{state}</option>)}</select></Field>
          <CityAutocompleteField lang={lang} state={form.state} value={form.city} onChange={(value) => set('city', value)} fieldKey="city" invalid={Boolean(fieldErrors.city)} error={fieldErrors.city} />
          <Field label={tx(lang, 'ZIP code', 'Código postal')} required hint={tx(lang, '5 digits, numbers only.', '5 dígitos, solo números.')} fieldKey="zip_code" invalid={Boolean(fieldErrors.zip_code)} error={fieldErrors.zip_code}><input inputMode="numeric" pattern="[0-9]*" autoComplete="postal-code" maxLength="5" value={form.zip_code} onChange={(e) => set('zip_code', digitsOnly(e.target.value, 5))} /></Field>
          <p className="address-coordination-note full"><LockKeyhole size={16} /><span>{tx(lang, 'For privacy, you do not need to enter the street address here. You will coordinate the exact service location directly with the assigned mechanic after contact is established.', 'Por privacidad, no necesitas ingresar la calle o dirección exacta aquí. Coordinarás la ubicación exacta del servicio directamente con el mecánico asignado cuando se pongan en contacto.')}</span></p>
        </div> : null}

        {step === 2 ? <div className="form-grid" data-wizard-step="2">
          <Field label={tx(lang, 'Year', 'Año')} required hint={tx(lang, 'Enter the 4-digit model year.', 'Ingresa el año del modelo con 4 dígitos.')} fieldKey="vehicle_year" invalid={Boolean(fieldErrors.vehicle_year)} error={fieldErrors.vehicle_year}><input inputMode="numeric" pattern="[0-9]*" maxLength="4" value={form.vehicle_year} onChange={(e) => setVehicleField('vehicle_year', digitsOnly(e.target.value, 4))} /></Field>
          <CompactAutocompleteField label={tx(lang, 'Make', 'Marca')} value={form.vehicle_make} onChange={(value) => { setVehicleField('vehicle_make', value); setVehicleField('vehicle_model', ''); }} suggestions={getVehicleMakeSuggestions(form.vehicle_make)} hint={tx(lang, 'Type to see matching makes. You can also enter another make.', 'Escribe para ver marcas coincidentes. También puedes ingresar otra marca.')} suggestionLabel={tx(lang, 'Vehicle make suggestions', 'Sugerencias de marcas')} fieldKey="vehicle_make" required invalid={Boolean(fieldErrors.vehicle_make)} error={fieldErrors.vehicle_make} />
          <CompactAutocompleteField label={tx(lang, 'Model', 'Modelo')} value={form.vehicle_model} onChange={(value) => setVehicleField('vehicle_model', value)} suggestions={getVehicleModelSuggestions(form.vehicle_make, form.vehicle_model, 4, catalogModels)} hint={catalogStatus === 'loading' ? tx(lang, `Loading ${form.vehicle_year} ${form.vehicle_make} models...`, `Cargando modelos ${form.vehicle_year} de ${form.vehicle_make}...`) : catalogStatus === 'ready' ? tx(lang, `Search ${catalogModels.length} models reported to NHTSA for this year.`, `Busca entre ${catalogModels.length} modelos reportados a NHTSA para este año.`) : catalogStatus === 'fallback' ? tx(lang, 'The live catalog is unavailable. You can still type the model manually.', 'El catálogo en línea no está disponible. Aún puedes escribir el modelo manualmente.') : tx(lang, 'Enter year and make, then type to search matching US models.', 'Ingresa el año y la marca; luego escribe para buscar modelos correspondientes en EE. UU.')} suggestionLabel={tx(lang, 'Vehicle model suggestions', 'Sugerencias de modelos')} fieldKey="vehicle_model" required invalid={Boolean(fieldErrors.vehicle_model)} error={fieldErrors.vehicle_model} />
          <Field label={tx(lang, 'VIN, optional', 'VIN, opcional')}><input autoCapitalize="characters" maxLength="17" value={form.vin} onChange={(e) => set('vin', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 17))} /></Field>
          <Field label={tx(lang, 'Fuel type', 'Tipo de combustible')} required fieldKey="fuel_type" invalid={Boolean(fieldErrors.fuel_type)} error={fieldErrors.fuel_type}><select value={form.fuel_type} onChange={(e) => setVehicleField('fuel_type', e.target.value)}><option value="">{tx(lang, 'Select fuel type', 'Selecciona el combustible')}</option>{['Gasoline', 'Diesel', 'Hybrid', 'Electric', 'Other'].map((value) => <option key={value} value={value}>{optionLabel(lang, value)}</option>)}</select></Field>
          <Field label={tx(lang, 'Does the vehicle start?', '¿El vehículo enciende?')} required fieldKey="vehicle_starts" invalid={Boolean(fieldErrors.vehicle_starts)} error={fieldErrors.vehicle_starts}><select value={form.vehicle_starts} onChange={(e) => set('vehicle_starts', e.target.value)}><option value="">{tx(lang, 'Select Yes or No', 'Selecciona Sí o No')}</option>{['Yes', 'No'].map((value) => <option key={value} value={value}>{optionLabel(lang, value)}</option>)}</select></Field>
          <Field label={tx(lang, 'Can the vehicle move?', '¿El vehículo se mueve?')} required fieldKey="vehicle_moves" invalid={Boolean(fieldErrors.vehicle_moves)} error={fieldErrors.vehicle_moves}><select value={form.vehicle_moves} onChange={(e) => set('vehicle_moves', e.target.value)}><option value="">{tx(lang, 'Select Yes or No', 'Selecciona Sí o No')}</option>{['Yes', 'No'].map((value) => <option key={value} value={value}>{optionLabel(lang, value)}</option>)}</select></Field>
          <Field className="full" label={tx(lang, 'Problem description, optional', 'Descripción del problema, opcional')} hint={tx(lang, 'Briefly describe the symptom, sound, warning light, leak, or when the problem occurs.', 'Describe brevemente el síntoma, sonido, luz de advertencia, fuga o cuándo ocurre el problema.')}><textarea value={form.problem_description} onChange={(e) => set('problem_description', e.target.value)} /></Field>
          <FilePicker label={tx(lang, 'Photos of the problem, optional', 'Fotos del problema, opcional')} hint={tx(lang, 'Upload clear, close photos of the affected area, warning lights, leaks, damage, or relevant component. Avoid unrelated exterior photos.', 'Sube fotos claras y cercanas del área afectada, luces de advertencia, fugas, daños o componente relacionado. Evita fotos exteriores que no muestren el problema.')} accept="image/jpeg,image/png,image/webp" onChange={setPhotos} files={photos} />
          <FilePicker label={tx(lang, 'Videos of the problem, optional', 'Videos del problema, opcional')} hint={tx(lang, 'Upload a short video showing the symptom, sound, movement, smoke, leak, dashboard warning, or affected component.', 'Sube un video corto que muestre el síntoma, sonido, movimiento, humo, fuga, aviso del tablero o componente afectado.')} accept="video/mp4,video/quicktime,video/webm" onChange={setVideos} files={videos} />
        </div> : null}

        {step === 3 ? <div className="form-grid" data-wizard-step="3">
          <Field label={tx(lang, 'Requested service', 'Servicio solicitado')} required><select value={form.service_requested} onChange={(e) => set('service_requested', e.target.value)}>{serviceTypes.map((value) => <option key={value} value={value}>{optionLabel(lang, value)}</option>)}</select></Field>
          <Field label={tx(lang, 'Likely specialty', 'Especialidad probable')}><select value={form.specialty_needed} onChange={(e) => set('specialty_needed', e.target.value)}>{specialties.map((value) => <option key={value} value={value}>{optionLabel(lang, value)}</option>)}</select></Field>
          <Field label={tx(lang, 'Timing', 'Atención')} required><select value={form.urgency} onChange={(e) => set('urgency', e.target.value)}>{['Immediate', 'Scheduled'].map((value) => <option key={value} value={value}>{optionLabel(lang, value)}</option>)}</select></Field>
          <Field label={tx(lang, 'Preferred language', 'Idioma preferido')} required><select value={form.preferred_language} onChange={(e) => set('preferred_language', e.target.value)}>{['English', 'Spanish'].map((value) => <option key={value} value={value}>{optionLabel(lang, value)}</option>)}</select></Field>
          <Field label={tx(lang, 'Preferred date', 'Fecha preferida')}><input type="date" value={form.preferred_date} onChange={(e) => set('preferred_date', e.target.value)} /></Field>
          <Field label={tx(lang, 'Preferred time', 'Horario preferido')}><input value={form.preferred_time} placeholder="Example: 2:00 PM - 4:00 PM" onChange={(e) => set('preferred_time', e.target.value)} /></Field>
          <div className="full"><PlatformNotice lang={lang} /></div>
          <div className="consent-stack full">
            <BooleanChoice label={tx(lang, 'I authorize CarDaddy to share this request and my contact information with a selected compatible independent provider.', 'Autorizo a CarDaddy a compartir esta solicitud y mis datos de contacto con un proveedor independiente compatible seleccionado.')} checked={form.share_consent} onChange={(value) => set('share_consent', value)} />
            <BooleanChoice label={tx(lang, 'I understand the platform notice, including direct pricing, payment, repair, and warranty arrangements with the provider.', 'Entiendo el aviso de plataforma, incluyendo los acuerdos directos de precio, pago, reparación y garantía con el proveedor.')} checked={form.platform_notice_acknowledged} onChange={(value) => set('platform_notice_acknowledged', value)} />
            <div className="payment-policy-confirmed"><Check size={17} /><span>{tx(lang, 'No-advance-payment protection accepted.', 'Protección contra pagos adelantados aceptada.')}</span></div>
          </div>
        </div> : null}
        {message ? <p className="status-message">{message}</p> : null}
        <WizardActions step={step} total={3} back={() => { setStep(step - 1); scrollToWizardProgress(); }} next={next} submitLabel={tx(lang, 'Create Service Case', 'Crear Caso de Servicio')} busy={busy} lang={lang} />
        </form>
      </> : null}
    </ShellComponent>
  );
}

function ReportProblemPage({ lang, shell }) {
  const ShellComponent = shell;
  const [identity, setIdentity] = useState({ caseNumber: '', phone: '', email: '' });
  const [verified, setVerified] = useState(false);
  const [form, setForm] = useState({ incident_type: 'Late communication', description: '', requested_resolution: '' });
  const [photos, setPhotos] = useState([]);
  const [videos, setVideos] = useState([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isPlatformMockMode) seedPlatformMockData();
  }, []);

  async function verify(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const valid = await verifyCaseIdentity(identity);
      setVerified(valid);
      setMessage(valid ? '' : tx(lang, 'We could not verify those case details.', 'No pudimos verificar esos datos del caso.'));
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    if (!form.description) {
      setMessage(tx(lang, 'Describe what happened before submitting.', 'Describe lo ocurrido antes de enviar.'));
      return;
    }
    setBusy(true);
    try {
      const folder = `complaint-intake/${crypto.randomUUID()}`;
      const media = [
        ...(await uploadPrivateFiles('case-private', photos, `${folder}/photos`, 'image')).map((item) => ({ ...item, category: 'complaint_photo' })),
        ...(await uploadPrivateFiles('case-private', videos, `${folder}/videos`, 'video')).map((item) => ({ ...item, category: 'complaint_video' })),
      ];
      await submitComplaint(identity, { ...form, media_manifest: media });
      setMessage(tx(lang, 'Your report was received for private review.', 'Tu reporte fue recibido para revisión privada.'));
      setVerified(false);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ShellComponent>
      <PageIntro eyebrow={tx(lang, 'Customer support', 'Soporte al cliente')} title={tx(lang, 'Report a Problem', 'Reportar un problema')} body={tx(lang, 'Verify your case before submitting a private incident report.', 'Verifica tu caso antes de enviar un reporte privado de incidente.')} />
      {isPlatformMockMode ? <p className="mock-banner">Local test: CD-20260802-DEMO1 / 5550102201 / customer@example.test</p> : null}
      {!verified ? <form className="platform-wizard compact-wizard" onSubmit={verify}>
        <div className="form-grid">
          <Field label={tx(lang, 'Case number', 'Número de caso')} required><input value={identity.caseNumber} onChange={(e) => setIdentity((current) => ({ ...current, caseNumber: e.target.value }))} /></Field>
          <Field label={tx(lang, 'Phone', 'Teléfono')} required><input type="tel" value={identity.phone} onChange={(e) => setIdentity((current) => ({ ...current, phone: e.target.value }))} /></Field>
          <Field label={tx(lang, 'Email used on the request', 'Correo usado en la solicitud')}><input type="email" value={identity.email} onChange={(e) => setIdentity((current) => ({ ...current, email: e.target.value }))} /></Field>
        </div>
        <button className="btn btn-primary" disabled={busy}><UserRoundCheck size={18} /> {tx(lang, 'Verify Case', 'Verificar Caso')}</button>
        {message ? <p className="status-message">{message}</p> : null}
      </form> : <form className="platform-wizard compact-wizard" onSubmit={submit}>
        <div className="verified-banner"><Check size={18} /> {tx(lang, 'Case verified', 'Caso verificado')}: {identity.caseNumber}</div>
        <div className="form-grid">
          <Field label={tx(lang, 'Incident type', 'Tipo de incidente')} required><select value={form.incident_type} onChange={(e) => setForm((current) => ({ ...current, incident_type: e.target.value }))}>{incidentTypes.map((type) => <option key={type} value={type}>{optionLabel(lang, type)}</option>)}</select></Field>
          <label className="field full"><span>{tx(lang, 'Description', 'Descripción')} *</span><textarea value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} /></label>
          <label className="field full"><span>{tx(lang, 'Requested resolution', 'Solución solicitada')}</span><textarea value={form.requested_resolution} onChange={(e) => setForm((current) => ({ ...current, requested_resolution: e.target.value }))} /></label>
          <FilePicker label={tx(lang, 'Photos, optional', 'Fotos, opcional')} accept="image/jpeg,image/png,image/webp" onChange={setPhotos} />
          <FilePicker label={tx(lang, 'Videos, optional', 'Videos, opcional')} accept="video/mp4,video/quicktime,video/webm" onChange={setVideos} />
        </div>
        <button className="btn btn-primary" disabled={busy}><AlertTriangle size={18} /> {tx(lang, 'Submit Private Report', 'Enviar Reporte Privado')}</button>
        {message ? <p className="status-message">{message}</p> : null}
      </form>}
    </ShellComponent>
  );
}

function PortalPage({ lang, shell }) {
  const ShellComponent = shell;
  return (
    <ShellComponent>
      <section className="portal-gateway">
        <Network size={44} />
        <p className="eyebrow">CarDaddy Network</p>
        <h1>{tx(lang, 'Choose your access', 'Elige tu acceso')}</h1>
        <p>{tx(lang, 'Provider accounts and CarDaddy administration are separate for privacy and security.', 'Las cuentas de proveedores y la administración de CarDaddy están separadas por privacidad y seguridad.')}</p>
        <div className="portal-paths">
          <article>
            <Network size={28} />
            <h2>{tx(lang, 'Independent provider', 'Proveedor independiente')}</h2>
            <p>{tx(lang, 'New providers can apply now. Approved-provider accounts and opportunity tools arrive in Phase 2.', 'Los proveedores nuevos pueden solicitar ingreso ahora. Las cuentas aprobadas y las herramientas de oportunidades llegarán en la Fase 2.')}</p>
            <a className="btn btn-primary" href={`${languages[lang].homePath === '/' ? '' : languages[lang].homePath}/unete-a-la-red`}>{tx(lang, 'Apply to the Network', 'Solicitar ingreso a la red')}</a>
          </article>
          <article className="owner-access">
            <ShieldCheck size={28} />
            <h2>{tx(lang, 'CarDaddy owner', 'Propietario de CarDaddy')}</h2>
            <p>{tx(lang, 'Review applications, cases, assignments, evidence, and complaints from the private administration area.', 'Revisa solicitudes, casos, asignaciones, evidencias y quejas desde el área administrativa privada.')}</p>
            <a className="btn btn-primary" href="/admin"><LockKeyhole size={18} /> {tx(lang, 'Open Administration', 'Abrir administración')}</a>
          </article>
        </div>
        <div className="private-file-note"><MailCheck size={20} /><span>{tx(lang, 'Beta communications use email and portal notifications only. SMS and paid messaging remain disabled.', 'Las comunicaciones de la beta usan únicamente correo y notificaciones del portal. Los SMS y la mensajería de pago permanecen desactivados.')}</span></div>
      </section>
    </ShellComponent>
  );
}

function VerifyEmailPage({ lang, shell }) {
  const ShellComponent = shell;
  const [result, setResult] = useState({ status: 'Checking' });
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token') || '';
    if (!token) {
      setResult({ status: 'Invalid' });
      return;
    }
    verifyEmailToken(token)
      .then(setResult)
      .catch(() => setResult({ status: 'Invalid' }));
  }, []);
  const verified = result.status === 'Verified';
  const expired = result.status === 'Expired';
  return (
    <ShellComponent>
      <section className="platform-confirmation">
        <div className="confirmation-icon">{verified ? <MailCheck /> : <AlertTriangle />}</div>
        <p className="eyebrow">CarDaddy</p>
        <h1>{result.status === 'Checking'
          ? tx(lang, 'Verifying your email...', 'Verificando tu correo...')
          : verified ? tx(lang, 'Email verified', 'Correo verificado')
            : expired ? tx(lang, 'Verification link expired', 'El enlace de verificación venció')
              : tx(lang, 'Invalid verification link', 'Enlace de verificación inválido')}</h1>
        <p>{verified
          ? tx(lang, 'Your email is ready for CarDaddy communications. Keep the sender in your contacts and continue checking Spam or Junk if a future message is missing.', 'Tu correo está listo para las comunicaciones de CarDaddy. Mantén al remitente en tus contactos y sigue revisando Spam o Correo no deseado si falta algún mensaje futuro.')
          : expired
            ? tx(lang, 'For your protection, verification links expire after 24 hours. Request a new message from the application or case confirmation.', 'Para tu protección, los enlaces vencen después de 24 horas. Solicita un nuevo mensaje desde la confirmación de la solicitud o del caso.')
            : tx(lang, 'This link is incomplete, invalid, or has already been replaced. Do not share verification links with anyone.', 'Este enlace está incompleto, es inválido o ya fue reemplazado. No compartas enlaces de verificación con nadie.')}</p>
        <a className="btn btn-primary" href={languages[lang].homePath}>{tx(lang, 'Return Home', 'Volver al Inicio')}</a>
      </section>
    </ShellComponent>
  );
}

export function getPlatformRoute(pathname) {
  const clean = pathname.replace(/^\/es(?=\/)/, '').replace(/\/$/, '') || '/';
  if (clean === '/solicitar-servicio') return 'request';
  if (clean === '/unete-a-la-red') return 'provider';
  if (clean === '/reportar-problema') return 'complaint';
  if (clean === '/verificar-correo') return 'verify-email';
  if (clean === '/portal') return 'portal';
  return null;
}

export function PlatformPage({ route, lang, setLang, header, footer }) {
  const HeaderComponent = header;
  const FooterComponent = footer;
  const t = languages[lang];
  function Shell({ children }) {
    useEffect(() => {
      document.title = `${business.name} | ${route}`;
    }, []);
    return (
      <>
        <HeaderComponent lang={lang} setLang={setLang} t={t} page="platform" />
        <main className="platform-page">{children}</main>
        <FooterComponent t={t} lang={lang} setLang={setLang} />
      </>
    );
  }
  if (route === 'provider') return <ProviderApplicationPage lang={lang} shell={Shell} />;
  if (route === 'complaint') return <ReportProblemPage lang={lang} shell={Shell} />;
  if (route === 'verify-email') return <VerifyEmailPage lang={lang} shell={Shell} />;
  if (route === 'portal') return <PortalPage lang={lang} shell={Shell} />;
  return <ServiceRequestPage lang={lang} shell={Shell} />;
}
