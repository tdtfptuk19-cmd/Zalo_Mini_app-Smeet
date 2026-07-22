import React, { useState, useEffect } from 'react';
import { AlertCircle, Upload, Plus, Trash2, X, Check } from 'lucide-react';
import { Storage } from '../utils/storage';
import { formatExternalUrl } from '../utils/calendarHelper';

const generateRandomMeetLink = () => {
  const randStr = (len) => {
    let s = '';
    for (let i = 0; i < len; i++) {
      s += String.fromCharCode(97 + Math.floor(Math.random() * 26));
    }
    return s;
  };
  return `https://meet.google.com/${randStr(3)}-${randStr(4)}-${randStr(3)}`;
};

export const MeetingFormModal = React.memo(({
  isOpen,
  onClose,
  editingMeeting,
  currentUser,
  users,
  onSaveMeeting,
  onDeleteMeeting
}) => {

  // Wizard step state
  const [step, setStep] = useState(1);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formStartTime, setFormStartTime] = useState('14:00');
  const [formEndTime, setFormEndTime] = useState('15:00');
  const [formLocationType, setFormLocationType] = useState('online');
  const [formLocationDetail, setFormLocationDetail] = useState('');
  const [formHostName, setFormHostName] = useState(currentUser?.name || '');
  const [formHostPhone, setFormHostPhone] = useState(currentUser?.phone || '');
  const [formNote, setFormNote] = useState('');
  const [formPreparation, setFormPreparation] = useState('');
  const [formFiles, setFormFiles] = useState([]);
  const [formInvitedMembers, setFormInvitedMembers] = useState([]);
  const [formInvitedPhones, setFormInvitedPhones] = useState([]);
  const [newInvitedPhone, setNewInvitedPhone] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Autocomplete member search
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);

  // Load existing data if editing
  useEffect(() => {
    if (editingMeeting) {
      setFormTitle(editingMeeting.title);
      setFormDate(editingMeeting.startTime.split('T')[0]);
      
      const startHourMin = new Date(editingMeeting.startTime).toLocaleTimeString('en-US', { hour12: false }).substring(0, 5);
      const endHourMin = new Date(editingMeeting.endTime).toLocaleTimeString('en-US', { hour12: false }).substring(0, 5);
      
      setFormStartTime(startHourMin);
      setFormEndTime(endHourMin);
      setFormLocationType(editingMeeting.locationType);
      setFormLocationDetail(editingMeeting.locationDetail);
      setFormHostName(editingMeeting.hostName);
      setFormHostPhone(editingMeeting.hostPhone);
      setFormNote(editingMeeting.note);
      setFormPreparation(editingMeeting.preparationContent);
      setFormFiles(editingMeeting.files || []);
      setFormInvitedMembers(editingMeeting.members || []);
      setFormInvitedPhones(editingMeeting.memberPhones || []);
    } else {
      // Set defaults for new meeting (use a dynamically generated random link)
      setFormLocationDetail(generateRandomMeetLink());
    }
  }, [editingMeeting, currentUser, users]);

  // Real-time EndTime validation on StartTime / EndTime change
  const validateTimes = (startVal, endVal) => {
    if (startVal && endVal) {
      const [sh, sm] = startVal.split(':').map(Number);
      const [eh, em] = endVal.split(':').map(Number);
      const startTotal = sh * 60 + sm;
      const endTotal = eh * 60 + em;
      
      if (endTotal <= startTotal) {
        setFormError('Thời gian kết thúc phải sau thời gian bắt đầu!');
        return false;
      }
    }
    setFormError('');
    return true;
  };

  // Step 1 Validation
  const validateStep1 = () => {
    if (!formHostName.trim()) {
      setFormError('Vui lòng nhập tên người chủ trì!');
      return false;
    }
    if (!formHostPhone.trim()) {
      setFormError('Vui lòng nhập số điện thoại người chủ trì!');
      return false;
    }
    setFormError('');
    return true;
  };

  // Step 2 Validation
  const validateStep2 = () => {
    if (!formDate) {
      setFormError('Vui lòng chọn ngày họp!');
      return false;
    }
    if (!validateTimes(formStartTime, formEndTime)) {
      return false;
    }
    if (!formLocationDetail.trim()) {
      setFormError(formLocationType === 'online' ? 'Vui lòng nhập link Google Meet!' : 'Vui lòng nhập địa điểm phòng họp!');
      return false;
    }
    setFormError('');
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
    setFormError('');
  };

  // Actual Local File Upload handler
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const type = file.name.endsWith('.ppt') || file.name.endsWith('.pptx') ? 'ppt' : 
                 file.name.endsWith('.pdf') ? 'pdf' : 
                 file.name.endsWith('.mp4') || file.name.endsWith('.avi') ? 'video' : 'other';

    // Read file metadata and create object URL to simulate actual download link
    const newFile = {
      name: file.name,
      type,
      url: URL.createObjectURL(file), // Actual local blob URL!
      size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`
    };

    setTimeout(() => {
      setFormFiles((prev) => [...prev, newFile]);
      setIsUploading(false);
    }, 800);
  };

  const removeFile = (idx) => {
    setFormFiles(formFiles.filter((_, i) => i !== idx));
  };

  // Autocomplete suggestions filter
  const suggestedMembers = users.filter(u => {
    if (u.id === currentUser?.id) return false;
    if (formInvitedMembers.includes(u.id)) return false;
    
    const query = memberSearchQuery.toLowerCase().trim();
    if (!query) return false;

    return u.name.toLowerCase().includes(query) || u.phone.includes(query);
  });

  const selectSuggestedMember = (userId) => {
    setFormInvitedMembers((prev) => [...prev, userId]);
    setMemberSearchQuery('');
    setIsSearchDropdownOpen(false);
  };

  const removeInvitedMember = (userId) => {
    setFormInvitedMembers((prev) => prev.filter(id => id !== userId));
  };

  // Custom SĐT invitation adder
  const addInvitePhone = () => {
    const sanitized = newInvitedPhone.trim();
    if (!sanitized || sanitized.length < 10) {
      setFormError('Số điện thoại không hợp lệ! Vui lòng nhập ít nhất 10 chữ số.');
      return;
    }
    
    // Only accept registered phone numbers
    const isRegistered = users.some(u => u.phone === sanitized);
    if (!isRegistered) {
      setFormError('Số điện thoại này chưa đăng ký tài khoản trong hệ thống! Không thể mời.');
      return;
    }
    
    if (formInvitedPhones.includes(sanitized)) {
      setFormError('Số điện thoại này đã được thêm!');
      return;
    }

    setFormError('');
    setFormInvitedPhones((prev) => [...prev, sanitized]);
    setNewInvitedPhone('');
  };

  const removeInvitePhone = (phone) => {
    setFormInvitedPhones((prev) => prev.filter(p => p !== phone));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep1() || !validateStep2()) return;

    setIsSubmitting(true);
    setFormError('');

    const startDateTime = new Date(`${formDate}T${formStartTime}:00`);
    const endDateTime = new Date(`${formDate}T${formEndTime}:00`);
    const duration = Math.round((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60));

    const finalLocationDetail = formLocationType === 'online' 
      ? formatExternalUrl(formLocationDetail) 
      : formLocationDetail.trim();

    const meetingData = {
      title: formTitle.trim() || 'Họp Không Tiêu Đề',
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      duration,
      locationType: formLocationType,
      locationDetail: finalLocationDetail,
      hostName: formHostName.trim(),
      hostPhone: formHostPhone.trim(),
      note: formNote.trim(),
      preparationContent: formPreparation.trim(),
      files: formFiles,
      members: formInvitedMembers,
      memberPhones: formInvitedPhones,
      createdBy: currentUser?.id
    };

    if (editingMeeting) {
      meetingData.id = editingMeeting.id;
      meetingData.createdAt = editingMeeting.createdAt;
      meetingData.onlineConfig = editingMeeting.onlineConfig;
    }

    // Check overlap collision locally before calling API for premium UX
    const conflict = await Storage.checkConflict(meetingData);
    if (conflict) {
      const conflictTime = `${new Date(conflict.startTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})} - ${new Date(conflict.endTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}`;
      setFormError(`Trùng lịch họp với cuộc họp: "${conflict.title}" (${conflictTime})`);
      setIsSubmitting(false);
      setStep(2); // Jump back to calendar/time step to fix conflicts
      return;
    }

    try {
      await onSaveMeeting(meetingData);
      setIsSubmitting(false);
      onClose();
    } catch (err) {
      setIsSubmitting(false);
      setFormError(err.message || 'Có lỗi xảy ra khi lưu cuộc họp.');
    }
  };

  const handleDeleteClick = () => {
    if (editingMeeting) {
      onDeleteMeeting(editingMeeting.id);
    }
  };

  if (!isOpen) return null;

  // Phân quyền: member chỉ xem/edit nếu họ là host; không được tạo mới
  const isAdminOrDelegated = currentUser?.role === 'admin' || currentUser?.role === 'delegated';
  const isMemberCreatingNew = !editingMeeting && !isAdminOrDelegated;
  if (isMemberCreatingNew) {
    return (
      <div className="modal-overlay">
        <div className="modal-content" style={{ maxWidth: 360, textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔒</div>
          <h3 style={{ marginBottom: '0.5rem' }}>Không có quyền</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Chỉ <strong>Quản lý</strong> hoặc <strong>Người được ủy quyền</strong> mới được tạo cuộc họp mới.
            Vui lòng liên hệ admin để được phân quyền.
          </p>
          <button onClick={onClose} className="btn btn-primary">Đóng</button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content form-wizard-modal">
        <div className="modal-header">
          <h3>{editingMeeting ? 'Chỉnh sửa cuộc họp' : 'Đặt lịch họp mới'}</h3>
          <button type="button" onClick={onClose} className="modal-close-btn" aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        {/* Step progress bar */}
        <div className="wizard-progress-bar">
          <div className={`wizard-step ${step >= 1 ? 'active' : ''}`}>
            <span className="step-num">1</span>
            <span className="step-label">Thông tin chung</span>
          </div>
          <div className={`wizard-line ${step >= 2 ? 'active' : ''}`} />
          <div className={`wizard-step ${step >= 2 ? 'active' : ''}`}>
            <span className="step-num">2</span>
            <span className="step-label">Thời gian</span>
          </div>
          <div className={`wizard-line ${step >= 3 ? 'active' : ''}`} />
          <div className={`wizard-step ${step >= 3 ? 'active' : ''}`}>
            <span className="step-num">3</span>
            <span className="step-label">Mời nhóm</span>
          </div>
        </div>

        {formError && (
          <div className="alert-box wizard-alert">
            <AlertCircle size={16} />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-body wizard-form-body">
          
          {/* STEP 1: GENERAL INFO */}
          {step === 1 && (
            <div className="wizard-step-content">
              <div className="form-group">
                <label htmlFor="form-title">Tiêu đề cuộc họp</label>
                <input 
                  id="form-title"
                  type="text" 
                  value={formTitle} 
                  onChange={(e) => setFormTitle(e.target.value)} 
                  className="input-text"
                  placeholder="Ví dụ: Họp kỹ thuật, Thảo luận thiết kế..."
                />
              </div>

              <div className="form-group-row">
                <div className="form-group">
                  <label htmlFor="form-hostname">Người chủ trì (Host)</label>
                  <input 
                    id="form-hostname"
                    type="text" 
                    value={formHostName} 
                    onChange={(e) => setFormHostName(e.target.value)} 
                    className="input-text"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="form-hostphone">SĐT người chủ trì</label>
                  <input 
                    id="form-hostphone"
                    type="tel" 
                    value={formHostPhone} 
                    onChange={(e) => setFormHostPhone(e.target.value)} 
                    className="input-text"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="form-note">Lưu ý / Mô tả nhanh</label>
                <input 
                  id="form-note"
                  type="text" 
                  value={formNote} 
                  onChange={(e) => setFormNote(e.target.value)} 
                  className="input-text"
                  placeholder="Lưu ý đi đúng giờ..."
                />
              </div>
            </div>
          )}

          {/* STEP 2: TIME & LOCATION */}
          {step === 2 && (
            <div className="wizard-step-content">
              <div className="form-group">
                <label htmlFor="form-date">Ngày họp</label>
                <input 
                  id="form-date"
                  type="date" 
                  value={formDate} 
                  onChange={(e) => setFormDate(e.target.value)} 
                  className="input-text"
                  required
                />
              </div>

              <div className="form-group-row">
                <div className="form-group">
                  <label htmlFor="form-start">Giờ bắt đầu</label>
                  <input 
                    id="form-start"
                    type="time" 
                    value={formStartTime} 
                    onChange={(e) => {
                      setFormStartTime(e.target.value);
                      validateTimes(e.target.value, formEndTime);
                    }} 
                    className="input-text"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="form-end">Giờ kết thúc</label>
                  <input 
                    id="form-end"
                    type="time" 
                    value={formEndTime} 
                    onChange={(e) => {
                      setFormEndTime(e.target.value);
                      validateTimes(formStartTime, e.target.value);
                    }} 
                    className="input-text"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="form-location-type">Hình thức địa điểm</label>
                <select 
                  id="form-location-type"
                  value={formLocationType} 
                  onChange={(e) => {
                    setFormLocationType(e.target.value);
                    setFormLocationDetail(e.target.value === 'online' ? generateRandomMeetLink() : '');
                  }} 
                  className="select-input"
                >
                  <option value="online">Họp trực tuyến (Google Meet)</option>
                  <option value="offline">Họp trực tiếp (Tại văn phòng/Địa điểm)</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="form-location-detail">
                  {formLocationType === 'online' ? 'Đường dẫn phòng họp online (URL)' : 'Địa chỉ/Phòng họp cụ thể'}
                </label>
                <input 
                  id="form-location-detail"
                  type="text" 
                  value={formLocationDetail} 
                  onChange={(e) => setFormLocationDetail(e.target.value)} 
                  className="input-text"
                  placeholder={formLocationType === 'online' ? 'https://meet.google.com/...' : 'Tầng 4, Phòng họp lớn...'}
                  required
                />
              </div>
            </div>
          )}

          {/* STEP 3: MEMBERS & ATTACHMENTS */}
          {step === 3 && (
            <div className="wizard-step-content">
              
              {/* Preparation Documents */}
              <div className="form-group">
                <label htmlFor="form-preparation">Nội dung cần chuẩn bị trước</label>
                <textarea 
                  id="form-preparation"
                  value={formPreparation} 
                  onChange={(e) => setFormPreparation(e.target.value)} 
                  className="textarea-input"
                  placeholder="Xem kỹ file slide, tài liệu đính kèm bên dưới..."
                />
              </div>

              {/* Real Local File Upload */}
              <div className="form-group">
                <label>Đính kèm tài liệu thực tế (PDF, PPT, Word...)</label>
                <div className="file-uploader-box">
                  <input 
                    type="file" 
                    id="wizard-file-upload" 
                    onChange={handleFileUpload} 
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="wizard-file-upload" className="btn btn-secondary file-upload-btn-label">
                    <Upload size={16} />
                    <span>Chọn tài liệu từ máy tính...</span>
                  </label>
                  {isUploading && (
                    <div className="file-uploading-indicator">
                      <span className="spinner-mini" />
                      <span>Đang xử lý tệp tin...</span>
                    </div>
                  )}
                </div>

                {formFiles.length > 0 && (
                  <div className="form-files-list">
                    {formFiles.map((file, idx) => (
                      <div key={idx} className="file-attachment-item">
                        <span className="file-info">
                          <span className={`file-type-icon ${file.type === 'pdf' ? 'red' : ''}`}>
                            {file.type.toUpperCase()}
                          </span>
                          <span className="file-name-span">{file.name} ({file.size})</span>
                        </span>
                        <button 
                          type="button" 
                          onClick={() => removeFile(idx)}
                          className="btn-remove-attachment"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Autocomplete Member Selection */}
              <div className="form-group autocomplete-form-group">
                <label>Mời thành viên nhóm (Tìm kiếm & Chọn)</label>
                
                <div className="autocomplete-input-container">
                  <input
                    type="text"
                    value={memberSearchQuery}
                    onChange={(e) => {
                      setMemberSearchQuery(e.target.value);
                      setIsSearchDropdownOpen(true);
                    }}
                    onFocus={() => setIsSearchDropdownOpen(true)}
                    placeholder="Gõ tìm tên hoặc số điện thoại thành viên..."
                    className="input-text autocomplete-search-input"
                  />
                  
                  {isSearchDropdownOpen && suggestedMembers.length > 0 && (
                    <div className="autocomplete-dropdown-list">
                      {suggestedMembers.map(u => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => selectSuggestedMember(u.id)}
                          className="autocomplete-dropdown-item"
                        >
                          <img src={u.avatar} alt={u.name} className="autocomplete-avatar" />
                          <div className="autocomplete-user-info">
                            <span className="user-name">{u.name}</span>
                            <span className="user-phone">{u.phone} ({u.role === 'admin' ? 'Host' : 'Thành viên'})</span>
                          </div>
                          <Plus size={14} color="var(--primary-color)" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected members tags */}
                {formInvitedMembers.length > 0 && (
                  <div className="selected-members-chips">
                    {formInvitedMembers.map(id => {
                      const u = users.find(user => user.id === id);
                      if (!u) return null;
                      return (
                        <span key={id} className="member-chip-tag">
                          <img src={u.avatar} alt={u.name} className="chip-avatar" />
                          <span>{u.name}</span>
                          <button type="button" onClick={() => removeInvitedMember(id)} className="btn-chip-remove">
                            <X size={12} />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Invite by specific registered phones */}
              <div className="form-group">
                <label>Mời qua SĐT ngoài (Yêu cầu SĐT đã đăng ký)</label>
                <div className="custom-phone-invite-row">
                  <input 
                    type="tel"
                    value={newInvitedPhone}
                    onChange={(e) => setNewInvitedPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="Ví dụ: 0987654321..."
                    className="input-text"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={addInvitePhone}
                    className="btn btn-primary"
                    style={{ width: 'auto', padding: '10px 16px' }}
                  >
                    Thêm
                  </button>
                </div>

                {formInvitedPhones.length > 0 && (
                  <div className="selected-phones-chips">
                    {formInvitedPhones.map(phone => (
                      <span key={phone} className="phone-chip-tag">
                        <span>{phone}</span>
                        <button type="button" onClick={() => removeInvitePhone(phone)} className="btn-chip-remove">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="wizard-modal-footer">
            <div className="wizard-navigation-buttons">
              {step > 1 && (
                <button type="button" onClick={handleBack} className="btn btn-secondary">
                  Quay lại
                </button>
              )}
              {step < 3 ? (
                <button type="button" onClick={handleNext} className="btn btn-primary">
                  Tiếp theo
                </button>
              ) : (
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  <Check size={16} />
                  <span>{isSubmitting ? 'Đang lưu cuộc họp...' : editingMeeting ? 'Lưu chỉnh sửa' : 'Lên lịch họp'}</span>
                </button>
              )}
            </div>

            {editingMeeting && step === 1 && (
              <button 
                type="button" 
                onClick={handleDeleteClick} 
                className="btn btn-danger btn-delete-meeting-wizard"
              >
                <Trash2 size={16} />
                <span>Xóa cuộc họp</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
});

MeetingFormModal.displayName = 'MeetingFormModal';
