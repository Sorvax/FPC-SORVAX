import React, { useState, useRef } from 'react';
import { X, Upload, ShieldCheck, FileText, CheckCircle2, Fingerprint, Loader2, AlertTriangle, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../api/client.js';

const sampleEvidenceOptions = [
  { label: 'server-auth.log', type: 'logs', description: 'Authentication service access log', source: '/var/log/auth/service.log', content: 'Aug 30 10:42:01 server01 sshd[1234]: login attempt from 192.168.1.100\nAug 30 10:42:05 server01 sshd[1235]: SQL injection detected in /api/auth/login' },
  { label: 'security-scan-result.json', type: 'scan', description: 'Automated security vulnerability scan output', source: '/tmp/scan-output.json', content: '{"scan":"DAST","vulnerabilities":[{"type":"SQL_INJECTION","severity":"HIGH","confidence":0.94}]}' },
  { label: 'USB_Device_01.txt', type: 'file', description: 'USB device forensic image metadata', source: '/forensics/usb-image.txt', content: 'USB Device: Kingston 32GB\nSerial: KST-20260830\nFile System: NTFS\nHash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' },
  { label: 'network-capture.pcap', type: 'network', description: 'Network traffic packet capture', source: '/captures/network.pcap', content: 'POST /api/auth/login HTTP/1.1\nHost: server01.example.com\nContent-Type: application/x-www-form-urlencoded\nusername=admin%27+OR+%271%27%3D%271%27+--&password=x' },
];

const evidenceTypes = ['Log', 'File', 'USB Image', 'Scan Result', 'Network Capture', 'Other'];
const severityOptions = ['low', 'medium', 'high', 'critical'];
const departmentOptions = ['Cyber Operations', 'Forensics', 'Network Security', 'Incident Response', 'Digital Intelligence', 'General'];

export const AddEvidenceModal = ({ isOpen, onClose, defaultCaseId, onAdded }) => {
  const { cases, addCase, addEvidenceToCase, showToast } = useApp();
  const fileInputRef = useRef(null);

  const [step, setStep] = useState('form'); // form | loading | success
  const [addedItem, setAddedItem] = useState(null);

  // Case selection state
  const [selectedCaseId, setSelectedCaseId] = useState(defaultCaseId || '');
  const [showNewCaseForm, setShowNewCaseForm] = useState(false);

  // New case form
  const [newCase, setNewCase] = useState({
    title: '',
    description: '',
    severity: 'medium',
    source: 'Cyber Operations',
    reportedBy: 'Officer Martinez',
  });

  // Evidence form
  const [form, setForm] = useState({
    type: 'Log',
    name: '',
    source: '',
    description: '',
    collectedBy: 'Officer Martinez',
  });

  // File upload state
  const [uploadedFile, setUploadedFile] = useState(null);
  const [useDemoEvidence, setUseDemoEvidence] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState({});

  // Error messages
  const [submitError, setSubmitError] = useState('');

  const updateForm = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const updateNewCase = (field, value) => setNewCase(prev => ({ ...prev, [field]: value }));

  const validateForm = () => {
    const newErrors = {};

    if (!showNewCaseForm && !selectedCaseId) {
      newErrors.case = 'Please select a case';
    }

    if (showNewCaseForm) {
      if (!newCase.title.trim()) {
        newErrors.caseTitle = 'Case title is required';
      }
    }

    if (!form.name.trim()) {
      newErrors.evidenceName = 'Evidence name is required';
    }

    if (!useDemoEvidence && !uploadedFile) {
      // No file and no demo - that's OK, content will be generated from metadata
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'text/plain', 'application/json', 'text/csv', 'text/xml',
      'application/pdf', 'image/jpeg', 'image/png', 'application/zip',
      'application/octet-stream', 'text/log', 'application/x-log',
    ];
    const allowedExtensions = ['.log', '.txt', '.json', '.csv', '.xml', '.pdf', '.jpg', '.jpeg', '.png', '.zip'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(ext)) {
      setErrors(prev => ({ ...prev, file: 'Unsupported file type. Allowed: .log, .txt, .json, .csv, .xml, .pdf, .jpg, .png, .zip' }));
      return;
    }

    setUploadedFile(file);
    setUseDemoEvidence(false);
    setErrors(prev => { const { file: _, ...rest } = prev; return rest; });

    // Auto-fill form fields from filename
    if (!form.name) {
      updateForm('name', file.name.replace(/\.[^.]+$/, ''));
    }
    if (!form.description) {
      updateForm('description', `Uploaded file: ${file.name}`);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processEvidence = async (evidenceData) => {
    setStep('loading');
    setSubmitError('');

    try {
      let result;

      if (evidenceData.file) {
        // Real file upload - send base64 to backend for SHA-256
        result = await api.uploadEvidenceFile(evidenceData.caseId, evidenceData.file, {
          name: evidenceData.name,
          type: evidenceData.type,
          source: evidenceData.source,
          collectedBy: evidenceData.collectedBy,
          description: evidenceData.description,
        });
      } else {
        // Text/demo content
        result = await api.registerEvidence(evidenceData.caseId, {
          name: evidenceData.name,
          type: evidenceData.type,
          source: evidenceData.source,
          collectedBy: evidenceData.collectedBy,
          content: evidenceData.content || `${evidenceData.name}|${evidenceData.description || ''}`,
          description: evidenceData.description,
        });
      }

      // Update local state
      addEvidenceToCase(evidenceData.caseId, {
        id: result.evidence_id,
        caseId: result.case_id,
        type: result.type,
        label: result.label,
        name: result.name,
        description: result.description,
        source: result.source,
        collectedAt: result.collected_at,
        collectedBy: result.collected_by,
        verified: result.verified,
        fingerprint: result.evidence_hash,
        evidenceHash: result.evidence_hash,
        recordHash: result.record_hash,
        integrityMessage: result.integrity_message,
      });

      setAddedItem({
        id: result.evidence_id,
        caseId: result.case_id,
        caseTitle: evidenceData.caseTitle || '',
        evidenceName: result.name,
        fingerprint: result.evidence_hash,
        recordHash: result.record_hash,
      });
      setStep('success');
      onAdded?.(result);
    } catch (err) {
      console.error('Failed to register evidence:', err);
      const msg = err.message || 'Unknown error';
      if (msg.includes('hash') || msg.includes('fingerprint')) {
        setSubmitError('Evidence could not be fingerprinted. Please try again.');
      } else {
        setSubmitError('Unable to register evidence. Please check your input and try again.');
      }
      setStep('form');
    }
  };

  const handleAddSample = (sample) => {
    const caseId = selectedCaseId;
    if (!caseId) return;

    const caseData = cases.find(c => c.id === caseId);
    processEvidence({
      ...sample,
      caseId,
      caseTitle: caseData ? `${caseId} — ${caseData.title}` : caseId,
      collectedBy: form.collectedBy,
    });
  };

  const handleCreateCaseAndEvidence = async () => {
    if (!validateForm()) return;
    setSubmitError('');

    try {
      let caseId = selectedCaseId;
      let caseTitle = '';

      if (showNewCaseForm) {
        // Create new case first
        const newCaseResult = await api.createCase({
          title: newCase.title.trim(),
          description: newCase.description.trim(),
          severity: newCase.severity,
          system: newCase.source,
          assignedTo: newCase.reportedBy,
        });

        caseId = newCaseResult.id;
        caseTitle = `${caseId} — ${newCaseResult.title}`;

        // Update local state
        addCase(newCaseResult);
      } else {
        const caseData = cases.find(c => c.id === caseId);
        caseTitle = caseData ? `${caseId} — ${caseData.title}` : caseId;
      }

      // Register evidence
      if (uploadedFile) {
        // Real file upload
        processEvidence({
          caseId,
          caseTitle,
          name: form.name.trim(),
          type: form.type.toLowerCase().replace(' ', '_'),
          description: form.description.trim() || `${form.type} evidence collected by ${form.collectedBy}`,
          source: form.source.trim() || 'Not specified',
          collectedBy: form.collectedBy,
          file: uploadedFile,
        });
      } else if (useDemoEvidence) {
        // No case needed for demo if none selected, but we require one
        handleAddSample({
          ...sampleEvidenceOptions.find(s => s.label === form.name) || sampleEvidenceOptions[0],
          label: form.name || 'Demo Evidence',
          name: form.name || 'Demo Evidence',
        });
      } else {
        // Text content from form fields
        processEvidence({
          caseId,
          caseTitle,
          name: form.name.trim(),
          type: form.type.toLowerCase().replace(' ', '_'),
          description: form.description.trim() || `${form.type} evidence collected by ${form.collectedBy}`,
          source: form.source.trim() || 'Not specified',
          collectedBy: form.collectedBy,
          content: `${form.name}|${form.description || ''}|${form.source || ''}`,
        });
      }
    } catch (err) {
      console.error('Failed to create case:', err);
      setSubmitError('Unable to create case. Please try again.');
      setStep('form');
    }
  };

  const handleSubmit = () => {
    handleCreateCaseAndEvidence();
  };

  const handleClose = () => {
    setStep('form');
    setAddedItem(null);
    setSelectedCaseId(defaultCaseId || '');
    setShowNewCaseForm(false);
    setNewCase({
      title: '',
      description: '',
      severity: 'medium',
      source: 'Cyber Operations',
      reportedBy: 'Officer Martinez',
    });
    setForm({
      type: 'Log',
      name: '',
      source: '',
      description: '',
      collectedBy: 'Officer Martinez',
    });
    setUploadedFile(null);
    setUseDemoEvidence(false);
    setErrors({});
    setSubmitError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto animate-fade-in">

        {step === 'form' && (
          <>
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Add Evidence</h2>
                <p className="text-sm text-slate-500 mt-1">Collect and register new evidence for the case</p>
              </div>
              <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Error message */}
              {submitError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {submitError}
                </div>
              )}

              {/* Case Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Case *</label>
                {!showNewCaseForm ? (
                  <>
                    <select
                      value={selectedCaseId}
                      onChange={(e) => {
                        if (e.target.value === '__CREATE_NEW__') {
                          setShowNewCaseForm(true);
                          setSelectedCaseId('');
                        } else {
                          setSelectedCaseId(e.target.value);
                        }
                      }}
                      className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                        errors.case ? 'border-rose-300 bg-rose-50' : 'border-slate-300'
                      }`}
                    >
                      <option value="">Select existing case</option>
                      {cases.map(c => (
                        <option key={c.id} value={c.id}>{c.id} — {c.title}</option>
                      ))}
                      <option value="__CREATE_NEW__">+ Create New Case</option>
                    </select>
                    {errors.case && <p className="text-xs text-rose-600 mt-1">{errors.case}</p>}
                  </>
                ) : (
                  <div className="space-y-3 border border-indigo-200 rounded-lg p-4 bg-indigo-50/30">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-indigo-800">Create New Case</span>
                      <button
                        onClick={() => { setShowNewCaseForm(false); setSelectedCaseId(''); }}
                        className="text-xs text-indigo-600 hover:text-indigo-800 underline"
                      >
                        Select existing case instead
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Case Title *</label>
                      <input
                        type="text"
                        value={newCase.title}
                        onChange={(e) => updateNewCase('title', e.target.value)}
                        placeholder="e.g. Suspicious USB Activity"
                        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          errors.caseTitle ? 'border-rose-300 bg-rose-50' : 'border-slate-300'
                        }`}
                      />
                      {errors.caseTitle && <p className="text-xs text-rose-600 mt-1">{errors.caseTitle}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                      <textarea
                        value={newCase.description}
                        onChange={(e) => updateNewCase('description', e.target.value)}
                        rows={2}
                        placeholder="Brief description of the case"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Severity</label>
                        <select
                          value={newCase.severity}
                          onChange={(e) => updateNewCase('severity', e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {severityOptions.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Department</label>
                        <select
                          value={newCase.source}
                          onChange={(e) => updateNewCase('source', e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {departmentOptions.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Reported By</label>
                        <input
                          type="text"
                          value={newCase.reportedBy}
                          onChange={(e) => updateNewCase('reportedBy', e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Evidence Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Evidence Type</label>
                <select
                  value={form.type}
                  onChange={(e) => updateForm('type', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {evidenceTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Evidence Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Evidence Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateForm('name', e.target.value)}
                  placeholder="e.g. USB Image — Device 01"
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.evidenceName ? 'border-rose-300 bg-rose-50' : 'border-slate-300'
                  }`}
                />
                {errors.evidenceName && <p className="text-xs text-rose-600 mt-1">{errors.evidenceName}</p>}
              </div>

              {/* Source */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Source</label>
                <input
                  type="text"
                  value={form.source}
                  onChange={(e) => updateForm('source', e.target.value)}
                  placeholder="e.g. Evidence Room / Device 01"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateForm('description', e.target.value)}
                  rows={3}
                  placeholder="Brief description of the evidence"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Collection Time & Collected By */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Collection Time</label>
                  <input
                    type="text"
                    value={new Date().toLocaleString()}
                    readOnly
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-slate-50 text-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Collected By</label>
                  <input
                    type="text"
                    value={form.collectedBy}
                    onChange={(e) => updateForm('collectedBy', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Upload Evidence File</label>
                {uploadedFile ? (
                  <div className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <FileText className="w-5 h-5 text-indigo-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{uploadedFile.name}</p>
                      <p className="text-xs text-slate-500">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button
                      onClick={handleRemoveFile}
                      className="text-xs text-rose-600 hover:text-rose-800 underline shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors cursor-pointer"
                  >
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">Drag and drop or click to browse</p>
                    <p className="text-xs text-slate-400 mt-1">.log .txt .json .csv .xml .pdf .jpg .png .zip</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  accept=".log,.txt,.json,.csv,.xml,.pdf,.jpg,.jpeg,.png,.zip"
                  className="hidden"
                />
                {errors.file && <p className="text-xs text-rose-600 mt-1">{errors.file}</p>}
              </div>

              {/* Demo Evidence Toggle */}
              <div className="border-t border-slate-200 pt-4">
                <button
                  onClick={() => setUseDemoEvidence(!useDemoEvidence)}
                  className="text-xs text-slate-500 hover:text-indigo-600 font-medium uppercase tracking-wider mb-3 flex items-center gap-1"
                >
                  {useDemoEvidence ? '▼' : '▶'} Or add sample evidence for demo
                </button>
                {useDemoEvidence && (
                  <div className="grid grid-cols-2 gap-2 animate-fade-in">
                    {sampleEvidenceOptions.map(sample => (
                      <button
                        key={sample.label}
                        onClick={() => {
                          updateForm('name', sample.label);
                          updateForm('description', sample.description);
                          updateForm('source', sample.source);
                          handleAddSample(sample);
                        }}
                        disabled={!selectedCaseId && !showNewCaseForm}
                        className="text-left p-3 border border-slate-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FileText className="w-4 h-4 text-slate-400 mb-1" />
                        <p className="text-xs font-medium text-slate-700 truncate">{sample.label}</p>
                        <p className="text-xs text-slate-400">{sample.type}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
              <button
                onClick={handleClose}
                className="px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.name.trim() || (!selectedCaseId && !showNewCaseForm) || (showNewCaseForm && !newCase.title.trim())}
                className="px-6 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                Register Evidence
              </button>
            </div>
          </>
        )}

        {step === 'loading' && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Generating Evidence Fingerprint...</h2>
            <div className="space-y-2 mt-4 text-sm text-slate-500">
              {showNewCaseForm && (
                <p className="flex items-center justify-center gap-2">
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
                  Creating case
                </p>
              )}
              <p className="flex items-center justify-center gap-2">
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
                Processing evidence
              </p>
              <p className="flex items-center justify-center gap-2">
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }} />
                Computing SHA-256 hash
              </p>
              <p className="flex items-center justify-center gap-2">
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: '0.9s' }} />
                Creating provenance record
              </p>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">✓ Evidence Registered</h2>
            <p className="text-sm text-slate-500 mb-6">Evidence fingerprint generated and integrity verified</p>

            <div className="bg-slate-50 rounded-xl p-6 text-left space-y-3 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Case</span>
                <span className="text-sm font-medium text-slate-900">{addedItem?.caseId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Evidence</span>
                <span className="text-sm font-medium text-slate-900">{addedItem?.evidenceName || addedItem?.id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Evidence ID</span>
                <span className="font-mono text-sm font-semibold text-slate-900">{addedItem?.id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Integrity</span>
                <span className="text-sm font-medium text-emerald-600 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" /> ✓ Fingerprinted
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Provenance</span>
                <span className="text-sm font-medium text-emerald-600 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" /> ✓ Recorded
                </span>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-left mb-6">
              <h4 className="text-sm font-semibold text-emerald-900 mb-3">Evidence Lifecycle</h4>
              <div className="space-y-2">
                {[
                  '✓ Evidence received',
                  '✓ SHA-256 fingerprint generated',
                  '✓ Evidence registered',
                  '✓ Provenance event created',
                  '✓ Integrity verification ready'
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-emerald-700">
                    {step}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleClose}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
