import mongoose, { Document, Model, Schema } from 'mongoose';
import { ActorRole, RationAdjustmentType } from '@cevicheria/shared';

export interface IRationAdjustment {
  menuItemId: mongoose.Types.ObjectId;
  dishId: mongoose.Types.ObjectId;
  menuDayId: mongoose.Types.ObjectId;
  shiftId?: mongoose.Types.ObjectId | null;
  orderId?: mongoose.Types.ObjectId | null;
  type: RationAdjustmentType;
  previousRemaining?: number | null;
  newRemaining?: number | null;
  reason: string;
  actorId: mongoose.Types.ObjectId;
  actorRole: ActorRole;
  at: Date;
}

export interface IRationAdjustmentDocument extends IRationAdjustment, Document {}

const RationAdjustmentSchema = new Schema<IRationAdjustmentDocument>(
  {
    menuItemId: {
      type: Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true
    },
    dishId: {
      type: Schema.Types.ObjectId,
      ref: 'Dish',
      required: true
    },
    menuDayId: {
      type: Schema.Types.ObjectId,
      ref: 'MenuDay',
      required: true
    },
    shiftId: {
      type: Schema.Types.ObjectId,
      ref: 'Shift',
      default: null
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      default: null
    },
    type: {
      type: String,
      enum: ['REPLENISH', 'ADJUSTMENT', 'CANCELLATION_REVERSAL'],
      required: true
    },
    previousRemaining: {
      type: Number,
      default: null
    },
    newRemaining: {
      type: Number,
      default: null
    },
    reason: {
      type: String,
      required: true,
      trim: true
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    actorRole: {
      type: String,
      enum: ['ENCARGADO', 'MOZO', 'SISTEMA'],
      required: true
    },
    at: {
      type: Date,
      default: Date.now,
      required: true
    }
  },
  {
    timestamps: false,
    toJSON: {
      transform: (_doc, ret: any) => {
        delete ret.__v;
        ret.id = ret._id ? ret._id.toString() : ret.id;
        return ret;
      }
    }
  }
);

// Índices canónicos según data-model.md §3.9
RationAdjustmentSchema.index({ menuItemId: 1, at: -1 });
RationAdjustmentSchema.index({ orderId: 1 });

export const RationAdjustment: Model<IRationAdjustmentDocument> =
  mongoose.models.RationAdjustment ||
  mongoose.model<IRationAdjustmentDocument>('RationAdjustment', RationAdjustmentSchema);

export default RationAdjustment;
