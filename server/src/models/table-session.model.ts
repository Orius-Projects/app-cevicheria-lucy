import mongoose, { Document, Model, Schema } from 'mongoose';
import { TableSessionStatus } from '@cevicheria/shared';

export interface ITableSession {
  tableId: mongoose.Types.ObjectId;
  tableCode: string;
  shiftId: mongoose.Types.ObjectId;
  status: TableSessionStatus;
  openedBy: mongoose.Types.ObjectId;
  openedAt: Date;
  closedBy?: mongoose.Types.ObjectId | null;
  closedAt?: Date | null;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITableSessionDocument extends ITableSession, Document {}

const TableSessionSchema = new Schema<ITableSessionDocument>(
  {
    tableId: {
      type: Schema.Types.ObjectId,
      ref: 'Table',
      required: true
    },
    tableCode: {
      type: String,
      required: true,
      trim: true
    },
    shiftId: {
      type: Schema.Types.ObjectId,
      ref: 'Shift',
      required: true
    },
    status: {
      type: String,
      enum: ['ABIERTA', 'CERRADA'],
      default: 'ABIERTA',
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

// Índices canónicos según data-model.md §3.4
TableSessionSchema.index({ tableId: 1, status: 1 });
TableSessionSchema.index({ shiftId: 1, status: 1 });
// Índice parcial único para impedir dos sesiones abiertas en la misma mesa
TableSessionSchema.index(
  { tableId: 1 },
  { unique: true, partialFilterExpression: { status: 'ABIERTA' } }
);

export const TableSession: Model<ITableSessionDocument> =
  mongoose.models.TableSession ||
  mongoose.model<ITableSessionDocument>('TableSession', TableSessionSchema);

export default TableSession;
