import React, { useEffect, useMemo, useState } from 'react';
import { Check, ExternalLink, RefreshCw, Search, ShieldAlert, Trash2, UserRoundCheck } from 'lucide-react';
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

function PrivateFiles({ manifest = [] }) {
  const [links, setLinks] = useState({});
  async function openFile(item, index) {
    if (item.path?.startsWith('mock://')) return;
    const url = await getPrivateFileUrl(item.bucket, item.path);
    setLinks((current) => ({ ...current, [index]: url }));
  }
  if (!manifest.length) return <span className="muted-text">None</span>;
  return (
    <div className="private-files">
      {manifest.map((item, index) => links[index] ? (
        <a key={`${item.path}-${index}`} href={links[index]} target="_blank" rel="noreferrer">{item.name} <ExternalLink size={13} /></a>
      ) : (
        <button key={`${item.path}-${index}`} type="button" onClick={() => openFile(item, index)} disabled={item.path?.startsWith('mock://')}>{item.name}</button>
      ))}
    </div>
  );
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
    <section className="admin-table">
      <div className="admin-section-title"><div><p className="eyebrow">Network quality</p><h2>Provider Reviews</h2></div><SearchField value={filter} onChange={setFilter} /></div>
      <div className="table-scroll"><table>
        <thead><tr><th>Provider</th><th>Coverage</th><th>Services</th><th>Availability</th><th>Private evidence</th><th>Review</th></tr></thead>
        <tbody>{visible.map((provider) => <tr key={provider.id}>
          <td><strong>{provider.full_name}</strong><br />{provider.business_name}<br /><small>{provider.email}<br />{provider.phone}<br />Retain until: {provider.retention_until ? new Date(provider.retention_until).toLocaleDateString() : '90 days from submission'}</small></td>
          <td>{provider.city}, {provider.state} {provider.zip_code}<br />{provider.max_travel_radius} miles{provider.max_travel_hours ? ` / ${provider.max_travel_hours} hr one way` : ''}<br />{provider.languages?.join(', ')}</td>
          <td>{provider.specialties?.join(', ')}<br /><small>Not offered: {provider.services_not_offered?.join(', ') || 'None listed'}</small></td>
          <td>{provider.available_days?.join(', ') || 'Not listed'}<br /><small>{provider.emergency_available ? 'Emergency' : 'No emergency'} / {provider.all_day_available ? '24-hour days' : 'Set hours'}</small></td>
          <td><PrivateFiles manifest={[...(provider.media_manifest || []), ...(provider.certifications_manifest || []), ...(provider.commercial_insurance_manifest || [])]} /></td>
          <td>
            <select aria-label={`Status for ${provider.full_name}`} value={provider.application_status} onChange={(event) => review(provider, event.target.value)}>{providerStatuses.map((status) => <option key={status}>{status}</option>)}</select>
            <textarea aria-label={`Private note for ${provider.full_name}`} placeholder="Private review note" value={notes[provider.id] ?? provider.internal_notes ?? ''} onChange={(event) => setNotes((current) => ({ ...current, [provider.id]: event.target.value }))} />
            <button type="button" className="btn btn-small btn-muted" onClick={() => review(provider, provider.application_status)}><Check size={15} /> Save note</button>
            {['Rejected', 'Not eligible'].includes(provider.application_status) ? deleteConfirmId === provider.id ? (
              <div className="delete-confirmation">
                <strong>Delete application and every uploaded file?</strong>
                <span>This cannot be undone.</span>
                <div><button type="button" className="btn btn-small btn-danger" onClick={() => remove(provider)}><Trash2 size={15} /> Delete permanently</button><button type="button" className="btn btn-small btn-muted" onClick={() => setDeleteConfirmId(null)}>Cancel</button></div>
              </div>
            ) : <button type="button" className="btn btn-small btn-danger-outline" onClick={() => setDeleteConfirmId(provider.id)}><Trash2 size={15} /> Delete application</button> : null}
          </td>
        </tr>)}</tbody>
      </table></div>
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
