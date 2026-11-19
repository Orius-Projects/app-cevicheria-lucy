import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IManualRecordItem {
  name: string;
  quantity: number;
  amountCents: number;
}

export interface IManualRecord {
  shiftId: mongoose.Types.ObjectId;
  tableCode: string;
  items: IManualRecordItem[];
  totalCents: number;
  notes?: string;
  source: 'PAPER';
  createdBy: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IManualRecordDocument extends IManualRecord, Document {}

const ManualRecordSchema = new Schema<IManualRecordDocument>(
  {
    shiftId: {
      type: Schema.Types.ObjectId,
      ref: 'Shift',
      required: true,
      index: true
    },
    tableCode: {
      type: String,
      required: true,
      trim: true
    },
    items: {
      type: [
        {
          name: { type: String, required: true, trim: true },
          quantity: { type: Number, required: true, min: 1 },
          amountCents: { type: Number, required: true, min: 0 }
        }
      ],
      required: true,
      validate: {
        validator: (v: any[]) => Array.isArray(v) && v.length > 0,
        message: 'Debe incluir al menos un ítem'
      }
    },
    totalCents: {
      type: Number,
      required: true,
      min: 0
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    source: {
      type: String,
      enum: ['PAPER'],
      default: 'PAPER',
      required: true
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
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

ManualRecordSchema.index({ shiftId: 1, createdAt: 1 });

export const ManualRecord: Model<IManualRecordDocument> =
  mongoose.models.ManualRecord ||
  mongoose.model<IManualRecordDocument>('ManualRecord', ManualRecordSchema);

export default ManualRecord;
