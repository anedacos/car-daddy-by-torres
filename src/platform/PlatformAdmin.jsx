import React, { useEffect, useMemo, useState } from 'react';
import {
  BatteryCharging,
  CalendarClock,
  CarFront,
  Check,
  CircleGauge,
  Clock3,
  Cpu,
  ExternalLink,
  FileCheck2,
  FileText,
  Languages,
  Mail,
  MapPin,
  Phone,
  Play,
  RefreshCw,
  Route,
  Search,
  ShieldAlert,
  Snowflake,
  Trash2,
  Truck,
  UserRound,
  UserRoundCheck,
  Wrench,
  Zap,
} from 'lucide-react';
import {
  caseStatuses,
  providerStatuses,
  rankCompatibleProviders,
} from './domain';
import {
  addAdminNote,
  assignCase,
  deleteProviderApplication,
  getPrivateFileUrl,
  isPlatformMockMode,
  listPlatformRecords,
  reviewProviderApplication,
  seedPlatformMockData,
} from './storage';

export const platformAdminNav = [
  ['operations', 'Operations Dashboard'],
  ['cases', 'Service Cases'],
  ['providers', 'Provider Reviews'],
  ['complaints', 'Complaints'],
];

function Metric({ label, value, alert = false }) {
  return <article className={alert ? 'metric-alert' : ''}><strong>{value}</strong><span>{label}</span></article>;
}

const categoryLabels = {
  tools: 'Tools and diagnostic equipment',
  equipment: 'Service equipment and transportation',
  certifications: 'Certifications',
  insurance: 'Commercial insurance',
};

function formatPhone(value = '') {
  const digits = value.replace(/\D/g, '');
  return digits.length === 10 ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}` : value;
}

function formatTime(value) {
  if (!value) return '';
  const [hour, minute = '00'] = value.split(':').map(Number);
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })
    .format(new Date(2000, 0, 1, hour, minute));
}

function serviceIcon(label = '') {
  const value = label.toLowerCase();
  if (value.includes('electric') || value.includes('electromechan')) return Zap;
  if (value.includes('diagnostic') || value.includes('computer')) return Cpu;
  if (value.includes('battery') || value.includes('alternator') || value.includes('starter')) return BatteryCharging;
  if (value.includes('air conditioning')) return Snowflake;
  if (value.includes('diesel') || value.includes('truck') || value.includes('heavy')) return Truck;
  if (value.includes('vehicle') || value.includes('car')) return CarFront;
  if (value.includes('engine') || value.includes('transmission')) return CircleGauge;
  return Wrench;
}

function LabeledValue({ label, children, icon: Icon = null }) {
  if (children === undefined || children === null || children === '') return null;
  return <div className="provider-fact">{Icon ? <Icon size={17} /> : null}<div><span>{label}</span><strong>{children}</strong></div></div>;
}

function ServiceTags({ items = [] }) {
  if (!items.length) return <span className="muted-text">Not listed</span>;
  return <div className="service-tags">{items.map((item) => {
    const Icon = serviceIcon(item);
    return <span key={item}><Icon size={15} />{item}</span>;
  })}</div>;
}

function PrivateMedia({ item }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const isMock = item.path?.startsWith('mock://');
  useEffect(() => {
    let active = true;
    if (isMock) return undefined;
    getPrivateFileUrl(item.bucket, item.path)
      .then((signedUrl) => { if (active) setUrl(signedUrl); })
      .catch(() => { if (active) setError('Preview unavailable'); });
    return () => { active = false; };
  }, [isMock, item.bucket, item.path]);

  const isImage = item.type?.startsWith('image/');
  const isVideo = item.type?.startsWith('video/');
  return <article className="evidence-item">
    <div className="evidence-preview">
      {!url && !error && !isMock ? <span className="evidence-loading">Loading preview...</span> : null}
      {url && isImage ? <img src={url} alt={item.name || 'Provider evidence'} loading="lazy" /> : null}
      {url && isVideo ? <video src={url} controls preload="metadata" aria-label={item.name || 'Provider evidence video'} /> : null}
      {url && !isImage && !isVideo ? <FileText size={34} /> : null}
      {error || isMock ? <span className="evidence-loading">{error || 'Local sample file'}</span> : null}
    </div>
    <div className="evidence-file-info"><span title={item.name}>{item.name || 'Evidence file'}</span>{url ? <a href={url} target="_blank" rel="noreferrer" aria-label={`Open ${item.name || 'evidence'} in a new tab`}><ExternalLink size={15} /></a> : null}</div>
  </article>;
}

function PrivateFiles({ manifest = [] }) {
  const [links, setLinks] = useState({});
  async function openFile(item, index) {
    if (item.path?.startsWith('mock://')) return;
    const url = await getPrivateFileUrl(item.bucket, item.path);
    setLinks((current) => ({ ...current, [index]: url }));
  }
  if (!manifest.length) return <span className="muted-text">None</span>;
  return <div className="private-files">{manifest.map((item, index) => links[index] ? (
    <a key={`${item.path}-${index}`} href={links[index]} target="_blank" rel="noreferrer">{item.name} <ExternalLink size={13} /></a>
  ) : (
    <button key={`${item.path}-${index}`} type="button" onClick={() => openFile(item, index)} disabled={item.path?.startsWith('mock://')}>{item.name}</button>
  ))}</div>;
}

function EvidenceGroup({ title, items, description, services }) {
  if (!items.length) return null;
  return <section className="evidence-group">
    <header><div><strong>{title}</strong>{description ? <p>{description}</p> : null}</div><span>{items.length} file{items.length === 1 ? '' : 's'}</span></header>
    {services?.length ? <div className="evidence-support"><FileCheck2 size={16} /><span>Supports:</span>{services.map((service) => <b key={service}>{service}</b>)}</div> : null}
    {!description && title.startsWith('Previous job') ? <p className="evidence-warning">This earlier submission did not capture a job description or linked services.</p> : null}
    <div className="evidence-grid">{items.map((item, index) => <PrivateMedia item={item} key={`${item.path}-${index}`} />)}</div>
  </section>;
}

function ProviderEvidence({ provider }) {
  const media = provider.media_manifest || [];
  const baseGroups = ['tools', 'equipment'].map((category) => ({
    key: category,
    title: categoryLabels[category],
    items: media.filter((item) => item.category === category),
  }));
  const workGroups = [1, 2, 3].map((number) => {
    const items = media.filter((item) => item.category?.startsWith(`work_sample_${number}_`));
    return {
      key: `work-${number}`,
      title: `Previous job ${number}`,
      items,
      description: items.find((item) => item.description)?.description,
      services: [...new Set(items.flatMap((item) => item.services || []))],
    };
  });
  const documentGroups = [
    { key: 'certifications', title: categoryLabels.certifications, items: provider.certifications_manifest || [] },
    { key: 'insurance', title: categoryLabels.insurance, items: provider.commercial_insurance_manifest || [] },
  ];
  const groups = [...baseGroups, ...workGroups, ...documentGroups].filter((group) => group.items.length);
  if (!groups.length) return <p className="admin-empty">No private evidence was uploaded.</p>;
  return <div className="provider-evidence-groups">{groups.map((group) => <EvidenceGroup {...group} key={group.key} />)}</div>;
}

function AvailabilityReview({ provider }) {
  const days = provider.available_days || [];
  return <div className="availability-review">
    <div className="availability-flags">
      {provider.immediate_available ? <span>Available immediately</span> : null}
      {provider.emergency_available ? <span>Emergency calls</span> : null}
      {provider.night_available ? <span>Night work</span> : null}
      {provider.scheduled_available ? <span>Scheduled work</span> : null}
    </div>
    {provider.availability_start_date ? <p><CalendarClock size={16} /> Schedule begins {new Date(`${provider.availability_start_date}T12:00:00`).toLocaleDateString()}</p> : null}
    <div className="schedule-review-list">
      {days.map((day) => {
        const ranges = provider.availability_schedule?.[day] || [];
        return <div key={day}><strong>{day}</strong><span>{provider.all_day_available ? 'All day' : ranges.length ? ranges.map((range) => `${formatTime(range.start)} - ${formatTime(range.end)}`).join(', ') : 'Hours not provided'}</span></div>;
      })}
    </div>
    {!days.length ? <span className="muted-text">No availability provided</span> : null}
  </div>;
}

function ProviderReviews({ providers, reload }) {
  const [notes, setNotes] = useState({});
  const [filter, setFilter] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [message, setMessage] = useState('');
  const visible = providers.filter((provider) => [provider.full_name, provider.business_name, provider.city, provider.zip_code, provider.application_status]
    .join(' ').toLowerCase().includes(filter.toLowerCase()));
  async function review(provider, status) {
    try {
      await reviewProviderApplication(provider.id, status, notes[provider.id] || provider.internal_notes || '');
      setMessage('Review saved.');
      reload();
    } catch (error) {
      setMessage(error.message || 'Unable to save the review.');
    }
  }
  async function remove(provider) {
    try {
      await deleteProviderApplication(provider);
      setDeleteConfirmId(null);
      setMessage('Application and private evidence permanently deleted.');
      reload();
    } catch (error) {
      setMessage(error.message || 'Unable to delete the application.');
    }
  }
  return (
    <section className="admin-table provider-reviews">
      <div className="admin-section-title"><div><p className="eyebrow">Network quality</p><h2>Provider Reviews</h2></div><SearchField value={filter} onChange={setFilter} /></div>
      <div className="provider-review-list">{visible.map((provider) => {
        const draftNote = notes[provider.id] ?? provider.internal_notes ?? '';
        return <article className="provider-review-card" key={provider.id}>
          <header className="provider-review-header">
            <div className="provider-title"><div className="provider-avatar"><UserRound size={25} /></div><div><span>Provider applicant</span><h3>{provider.full_name}</h3>{provider.business_name ? <p>{provider.business_name}</p> : null}</div></div>
            <div className="provider-header-meta"><span className={`review-status status-${provider.application_status.toLowerCase().replaceAll(' ', '-')}`}>{provider.application_status}</span><small>Submitted {new Date(provider.created_at).toLocaleDateString()}</small></div>
          </header>

          <div className="provider-review-body">
            <div className="provider-review-content">
              <section className="review-section">
                <header><UserRound size={20} /><div><h4>Provider details</h4><p>Contact and applicant information</p></div></header>
                <div className="provider-facts">
                  <LabeledValue label="Provider name" icon={UserRound}>{provider.full_name}</LabeledValue>
                  {provider.business_name ? <LabeledValue label="Business" icon={Wrench}>{provider.business_name}</LabeledValue> : null}
                  <LabeledValue label="Email" icon={Mail}><a href={`mailto:${provider.email}`}>{provider.email}</a></LabeledValue>
                  <LabeledValue label="Phone" icon={Phone}><a href={`tel:${provider.phone}`}>{formatPhone(provider.phone)}</a></LabeledValue>
                  <LabeledValue label="Verifiable experience" icon={FileCheck2}>{provider.years_experience} year{Number(provider.years_experience) === 1 ? '' : 's'}</LabeledValue>
                </div>
              </section>

              <section className="review-section">
                <header><MapPin size={20} /><div><h4>Service area</h4><p>Where this provider is willing to work</p></div></header>
                <div className="coverage-summary"><MapPin size={21} /><p>Based in <strong>{provider.city}, {provider.state} {provider.zip_code}</strong> and willing to travel up to <strong>{provider.max_travel_radius} miles</strong> for mobile service.</p></div>
                <div className="provider-facts compact-facts">
                  {provider.max_travel_hours ? <LabeledValue label="Maximum one-way travel" icon={Clock3}>{provider.max_travel_hours} hour{Number(provider.max_travel_hours) === 1 ? '' : 's'}</LabeledValue> : null}
                  <LabeledValue label="Languages" icon={Languages}>{provider.languages?.join(', ')}</LabeledValue>
                </div>
              </section>

              <section className="review-section">
                <header><Wrench size={20} /><div><h4>Services and capabilities</h4><p>Review these against the linked work evidence below</p></div></header>
                <div className="service-group"><strong>Specialties</strong><ServiceTags items={provider.specialties} /></div>
                {provider.services_offered?.length ? <div className="service-group"><strong>Services performed</strong><ServiceTags items={provider.services_offered} /></div> : null}
                <div className="service-group"><strong>Vehicle types served</strong><ServiceTags items={provider.vehicle_types_served} /></div>
                <div className={`payment-policy-review ${provider.no_advance_fee_acknowledged ? 'accepted' : 'legacy'}`}>
                  {provider.no_advance_fee_acknowledged ? <Check size={18} /> : <ShieldAlert size={18} />}
                  <div><strong>{provider.no_advance_fee_acknowledged ? 'No-advance-payment policy accepted' : 'Payment policy acknowledgment not captured'}</strong><span>{provider.no_advance_fee_acknowledged ? 'Inspection fee may be collected only after arrival. No travel or mobilization fee is permitted.' : 'This application predates the required payment-policy acknowledgment. Confirm the policy directly before approval.'}</span></div>
                </div>
              </section>

              <section className="review-section">
                <header><CalendarClock size={20} /><div><h4>Availability</h4><p>Days and exact working hours supplied by the provider</p></div></header>
                <AvailabilityReview provider={provider} />
              </section>

              <section className="review-section evidence-section">
                <header><Play size={20} /><div><h4>Private evidence</h4><p>Photos, playable videos, and supporting documents stay private</p></div></header>
                <ProviderEvidence provider={provider} />
                <div className="retention-note"><ShieldAlert size={17} /><span><strong>Evidence retention:</strong> stored through {provider.retention_until ? new Date(provider.retention_until).toLocaleDateString() : '90 days after submission'}. Rejected or ineligible applications can be deleted permanently sooner.</span></div>
              </section>
            </div>

            <div className="provider-review-actions">
              <div><span>Decision</span><h4>Review application</h4></div>
              <label>Status<select aria-label={`Status for ${provider.full_name}`} value={provider.application_status} onChange={(event) => review(provider, event.target.value)}>{providerStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
              <label>Private review notes<textarea aria-label={`Private note for ${provider.full_name}`} placeholder="Record missing evidence, concerns, or approval notes" value={draftNote} onChange={(event) => setNotes((current) => ({ ...current, [provider.id]: event.target.value }))} /></label>
              <button type="button" className="btn btn-small btn-primary" onClick={() => review(provider, provider.application_status)}><Check size={15} /> Save review</button>
              <a className="btn btn-small btn-muted" href={`mailto:${provider.email}?subject=${encodeURIComponent('CarDaddy provider application follow-up')}&body=${encodeURIComponent(draftNote || `Hello ${provider.full_name},\n\nWe are reviewing your CarDaddy provider application and need some additional information.\n\nThank you.`)}`}><Mail size={15} /> Email provider</a>
              {['Rejected', 'Not eligible'].includes(provider.application_status) ? deleteConfirmId === provider.id ? (
                <div className="delete-confirmation">
                  <strong>Delete application and every uploaded file?</strong>
                  <span>This cannot be undone.</span>
                  <div><button type="button" className="btn btn-small btn-danger" onClick={() => remove(provider)}><Trash2 size={15} /> Delete permanently</button><button type="button" className="btn btn-small btn-muted" onClick={() => setDeleteConfirmId(null)}>Cancel</button></div>
                </div>
              ) : <button type="button" className="btn btn-small btn-danger-outline" onClick={() => setDeleteConfirmId(provider.id)}><Trash2 size={15} /> Delete application</button> : null}
            </div>
          </div>
        </article>;
      })}</div>
      {message ? <p className="status-message">{message}</p> : null}
      {!visible.length ? <p className="admin-empty">No provider applications match this filter.</p> : null}
    </section>
  );
}

function CaseManagement({ cases, providers, events, reload }) {
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState({});
  const [notes, setNotes] = useState({});
  const approvedProviders = providers.filter((provider) => provider.account_status === 'Active');
  const visible = cases.filter((serviceCase) => [serviceCase.case_number, serviceCase.customer_name, serviceCase.city, serviceCase.zip_code, serviceCase.status]
    .join(' ').toLowerCase().includes(filter.toLowerCase()));

  async function changeStatus(serviceCase, status) {
    await addAdminNote('service_cases', serviceCase.id, notes[serviceCase.id] || serviceCase.internal_notes || '', status);
    reload();
  }

  async function assign(serviceCase) {
    const providerId = selected[serviceCase.id];
    if (!providerId) return;
    await assignCase(serviceCase.id, providerId, notes[serviceCase.id] || 'Manual assignment from admin.');
    reload();
  }

  return (
    <section className="admin-table">
      <div className="admin-section-title"><div><p className="eyebrow">Manual assignment</p><h2>Service Cases</h2></div><SearchField value={filter} onChange={setFilter} /></div>
      <div className="case-admin-list">
        {visible.map((serviceCase) => {
          const compatible = rankCompatibleProviders(serviceCase, approvedProviders);
          const caseEvents = events.filter((event) => event.case_id === serviceCase.id);
          return <article className="case-admin-row" key={serviceCase.id}>
            <header><div><strong>{serviceCase.case_number}</strong><span>{serviceCase.status}</span></div><small>{new Date(serviceCase.created_at).toLocaleString()}</small></header>
            <div className="case-admin-grid">
              <div><b>Customer</b><p>{serviceCase.customer_name}<br />{serviceCase.phone}<br />{serviceCase.email}</p></div>
              <div><b>Location / vehicle</b><p>{serviceCase.city}, {serviceCase.state} {serviceCase.zip_code}<br />{serviceCase.vehicle_year} {serviceCase.vehicle_make} {serviceCase.vehicle_model}</p></div>
              <div><b>Request</b><p>{serviceCase.service_requested}<br />{serviceCase.specialty_needed}<br />{serviceCase.urgency}</p></div>
              <div><b>Evidence</b><PrivateFiles manifest={serviceCase.media_manifest || []} /></div>
            </div>
            <p className="case-problem">{serviceCase.problem_description}</p>
            <div className="case-admin-actions">
              <select aria-label={`Case status for ${serviceCase.case_number}`} value={serviceCase.status} onChange={(event) => changeStatus(serviceCase, event.target.value)}>{caseStatuses.map((status) => <option key={status}>{status}</option>)}</select>
              <select aria-label={`Provider for ${serviceCase.case_number}`} value={selected[serviceCase.id] || ''} onChange={(event) => setSelected((current) => ({ ...current, [serviceCase.id]: event.target.value }))}>
                <option value="">Select compatible provider</option>
                {compatible.map((provider) => <option value={provider.id} key={provider.id}>{provider.full_name} - score {provider.compatibility_score}</option>)}
              </select>
              <input aria-label={`Case note for ${serviceCase.case_number}`} placeholder="Private assignment note" value={notes[serviceCase.id] || ''} onChange={(event) => setNotes((current) => ({ ...current, [serviceCase.id]: event.target.value }))} />
              <button type="button" className="btn btn-small btn-primary" onClick={() => assign(serviceCase)} disabled={!selected[serviceCase.id]}><UserRoundCheck size={16} /> Assign</button>
            </div>
            <details className="case-history"><summary>Case history ({caseEvents.length})</summary>{caseEvents.map((event) => <p key={event.id}><strong>{event.event_type}</strong> {event.notes}<small>{new Date(event.occurred_at || event.created_at).toLocaleString()}</small></p>)}</details>
          </article>;
        })}
      </div>
      {!visible.length ? <p className="admin-empty">No service cases match this filter.</p> : null}
    </section>
  );
}

function Complaints({ complaints, reload }) {
  const [notes, setNotes] = useState({});
  async function update(complaint, status) {
    await addAdminNote('complaints', complaint.id, notes[complaint.id] || complaint.internal_notes || '', status);
    reload();
  }
  return (
    <section className="admin-table">
      <div className="admin-section-title"><div><p className="eyebrow">Private review</p><h2>Complaints & Incidents</h2></div></div>
      <div className="table-scroll"><table><thead><tr><th>Case</th><th>Incident</th><th>Description</th><th>Evidence</th><th>Review</th></tr></thead><tbody>
        {complaints.map((complaint) => <tr key={complaint.id} className={complaint.severity === 'Serious' ? 'serious-row' : ''}>
          <td>{complaint.case_number}<br /><small>{new Date(complaint.created_at).toLocaleString()}</small></td>
          <td><strong>{complaint.incident_type}</strong><br />{complaint.severity}</td>
          <td>{complaint.description}<br /><small>Requested: {complaint.requested_resolution || 'Not specified'}</small></td>
          <td><PrivateFiles manifest={complaint.media_manifest || []} /></td>
          <td><select value={complaint.status} onChange={(event) => update(complaint, event.target.value)}><option>Open</option><option>Under review</option><option>Awaiting evidence</option><option>Resolved</option><option>Closed</option></select><textarea placeholder="Private incident note" value={notes[complaint.id] ?? complaint.internal_notes ?? ''} onChange={(event) => setNotes((current) => ({ ...current, [complaint.id]: event.target.value }))} /><button type="button" className="btn btn-small btn-muted" onClick={() => update(complaint, complaint.status)}>Save note</button></td>
        </tr>)}
      </tbody></table></div>
    </section>
  );
}

function SearchField({ value, onChange }) {
  return <label className="admin-search"><Search size={17} /><input placeholder="Search" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

export function PlatformAdmin({ active }) {
  const [data, setData] = useState({ providers: [], networkProviders: [], cases: [], complaints: [], events: [] });
  const [loading, setLoading] = useState(true);
  const reload = async () => {
    setLoading(true);
    if (isPlatformMockMode) await seedPlatformMockData();
    const [providers, networkProviders, cases, complaints, events] = await Promise.all([
      listPlatformRecords('provider_applications'),
      listPlatformRecords('provider_profiles'),
      listPlatformRecords('service_cases'),
      listPlatformRecords('complaints'),
      listPlatformRecords('case_events'),
    ]);
    setData({ providers, networkProviders, cases, complaints, events });
    setLoading(false);
  };
  useEffect(() => { reload(); }, []);

  const metrics = useMemo(() => ({
    pendingProviders: data.providers.filter((provider) => ['Pending', 'Under review', 'More information requested'].includes(provider.application_status)).length,
    approvedProviders: data.providers.filter((provider) => provider.application_status === 'Approved').length,
    suspendedProviders: data.providers.filter((provider) => ['Suspended', 'Not eligible'].includes(provider.application_status)).length,
    unassignedCases: data.cases.filter((serviceCase) => !serviceCase.assigned_provider_id && !['Completed', 'Canceled'].includes(serviceCase.status)).length,
    activeCases: data.cases.filter((serviceCase) => ['Provider assigned', 'Customer contacted', 'Visit scheduled', 'In progress'].includes(serviceCase.status)).length,
    completedCases: data.cases.filter((serviceCase) => serviceCase.status === 'Completed').length,
    openComplaints: data.complaints.filter((complaint) => !['Resolved', 'Closed'].includes(complaint.status)).length,
    seriousIncidents: data.complaints.filter((complaint) => ['Serious', 'Critical'].includes(complaint.severity) && !['Resolved', 'Closed'].includes(complaint.status)).length,
  }), [data]);

  if (loading) return <section className="admin-table"><p>Loading operational data...</p></section>;
  if (active === 'providers') return <ProviderReviews providers={data.providers} reload={reload} />;
  if (active === 'cases') return <CaseManagement cases={data.cases} providers={data.networkProviders} events={data.events} reload={reload} />;
  if (active === 'complaints') return <Complaints complaints={data.complaints} reload={reload} />;
  return (
    <>
      {isPlatformMockMode ? <p className="mock-banner">Local mock data only. No customer messages, provider notifications, or payments are being sent.</p> : null}
      <div className="admin-section-title"><div><p className="eyebrow">CarDaddy operations</p><h2>Operations Dashboard</h2></div><button type="button" className="btn btn-small btn-muted" onClick={reload}><RefreshCw size={16} /> Refresh</button></div>
      <div className="dashboard-grid operations-metrics">
        <Metric label="Pending providers" value={metrics.pendingProviders} />
        <Metric label="Approved providers" value={metrics.approvedProviders} />
        <Metric label="Suspended / ineligible" value={metrics.suspendedProviders} alert={metrics.suspendedProviders > 0} />
        <Metric label="Unassigned cases" value={metrics.unassignedCases} alert={metrics.unassignedCases > 0} />
        <Metric label="Active cases" value={metrics.activeCases} />
        <Metric label="Completed cases" value={metrics.completedCases} />
        <Metric label="Open complaints" value={metrics.openComplaints} alert={metrics.openComplaints > 0} />
        <Metric label="Serious incidents" value={metrics.seriousIncidents} alert={metrics.seriousIncidents > 0} />
        <article><ShieldAlert size={28} /><strong>--</strong><span>Average assignment time</span><small>Starts after production event data exists.</small></article>
      </div>
    </>
  );
}
