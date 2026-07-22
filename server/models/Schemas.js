import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  email: { type: String },
  phone: { type: String },
  role: { type: String, default: 'member' },
  avatar: { type: String },
  defaultMeet: { type: String }
});

const FileSchema = new mongoose.Schema({
  name: { type: String },
  type: { type: String },
  url: { type: String },
  size: { type: String }
});

const MeetingSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  duration: { type: Number, required: true },
  locationType: { type: String, default: 'online' },
  locationDetail: { type: String },
  hostName: { type: String },
  hostPhone: { type: String },
  note: { type: String },
  preparationContent: { type: String },
  files: [FileSchema],
  createdBy: { type: String },
  createdAt: { type: String },
  status: { type: String, default: 'active' }, // active | canceled | completed
  completedAt: { type: String }
});

const NoteSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  meetingId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  content: { type: String, required: true },
  updatedAt: { type: String, required: true }
});

const PollOptionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  text: { type: String, required: true }
});

const PollAnswerSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  optionId: { type: String, required: true }
});

const PollSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  meetingId: { type: String, required: true, index: true },
  question: { type: String, required: true },
  pollType: { type: String, default: 'single' },
  isActive: { type: Boolean, default: true },
  options: [PollOptionSchema],
  answers: [PollAnswerSchema]
});

const ReportSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  meetingId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  summaryContent: { type: String, required: true },
  status: { type: String, default: 'published' },
  createdBy: { type: String },
  createdAt: { type: String }
});

const NotifConfigSchema = new mongoose.Schema({
  zaloOaLinked: { type: Boolean, default: false },
  zaloAppId: { type: String },
  smsProvider: { type: String },
  smsApiKey: { type: String },
  notifEnabled: { type: Boolean, default: false }
});

export const User = mongoose.model('User', UserSchema);
export const Meeting = mongoose.model('Meeting', MeetingSchema);
export const Note = mongoose.model('Note', NoteSchema);
export const Poll = mongoose.model('Poll', PollSchema);
export const Report = mongoose.model('Report', ReportSchema);
export const NotifConfig = mongoose.model('NotifConfig', NotifConfigSchema);
