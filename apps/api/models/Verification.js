'use strict';
// Profile verification requests (feature expansion A1). Files live under
// PRIVATE_UPLOADS_DIR/verification and are referenced by BASENAME only; the
// admin file route resolves them inside that directory (never under uploads/).
const mongoose = require('mongoose');

const STATUSES = ['pending', 'approved', 'rejected'];

const verificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    documentType: { type: String, required: true, trim: true, maxlength: 60 },
    documentFiles: { type: [String], default: [] }, // basenames, 1-2
    selfieFile: { type: String, default: null }, // basename
    status: { type: String, enum: STATUSES, default: 'pending' },
    reason: { type: String, default: null, maxlength: 500 },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    filesPurgedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// One open request per member
verificationSchema.index({ user: 1 }, { unique: true, partialFilterExpression: { status: 'pending' } });
verificationSchema.index({ user: 1, createdAt: -1 });
verificationSchema.index({ status: 1, createdAt: -1 });
verificationSchema.index({ reviewedAt: 1, filesPurgedAt: 1 });

verificationSchema.statics.STATUSES = STATUSES;

module.exports = mongoose.model('Verification', verificationSchema);
