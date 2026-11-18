import mongoose, { Document, Model, Schema } from 'mongoose';
import { ShiftStatus } from '@cevicheria/shared';

export interface IShift {
  date: string;
  label: string;
  status: ShiftStatus;
  openedBy: mongoose.Types.ObjectId;
  openedAt: Date;
  closedBy?: mongoose.Types.ObjectId | null;
  closedAt?: Date | null;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IShiftDocument extends IShift, Document {}

const ShiftSchema = new Schema<IShiftDocument>(
  {
    date: {
      type: String,
      required: true,
      trim: true,
      match: /^\d{4}-\d{2}-\d{2}$/
    },
    label: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['ABIERTO', 'CERRADO'],
      default: 'ABIERTO',
      required: true
    },
    openedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    openedAt: {
      type: Date,
      default: Date.now,
      required: true
    },
    closedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    closedAt: {
      type: Date,
      default: null
    },
    notes: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: any) => {
        delete ret.__v;
        ret.id = ret._id ? ret._id.toString() : ret.id;
        return ret;
      }
    }
  }
);

// Índices canónicos según data-model.md §3.3
ShiftSchema.index({ status: 1, date: 1 });
ShiftSchema.index({ date: 1, label: 1 }, { unique: true });

export const Shift: Model<IShiftDocument> =
  mongoose.models.Shift || mongoose.model<IShiftDocument>('Shift', ShiftSchema);

export default Shift;
