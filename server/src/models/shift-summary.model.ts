import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ISoldDishSummary {
  dishId: mongoose.Types.ObjectId;
  dishName: string;
  quantity: number;
  amountCents: number;
}

export interface IRemainingRationSummary {
  dishId: mongoose.Types.ObjectId;
  dishName: string;
  remainingRations: number;
}

export interface ISoldOutDishSummary {
  dishId: mongoose.Types.ObjectId;
  dishName: string;
  reason: string;
}

export interface ICancellationSummary {
  orderNumber: number;
  reason: string;
  cancelledBy: string;
}

export interface IManualRecordSummaryItem {
  name: string;
  quantity: number;
  amountCents: number;
}

export interface IManualRecordSummary {
  id?: string;
  tableCode: string;
  items: IManualRecordSummaryItem[];
  totalCents: number;
  notes?: string;
  source?: string;
  createdBy?: any;
  createdAt?: Date;
}

export interface IShiftSummary {
  shiftId: mongoose.Types.ObjectId;
  generatedAt: Date;
  generatedBy: mongoose.Types.ObjectId;
  soldDishes: ISoldDishSummary[];
  remainingRations: IRemainingRationSummary[];
  soldOutDishes: ISoldOutDishSummary[];
  cancellations: ICancellationSummary[];
  manualRecords?: IManualRecordSummary[];
  manualTotalCents?: number;
  totalAmountCents: number;
  observations?: string;
  closedAt: Date;
}

export interface IShiftSummaryDocument extends IShiftSummary, Document {}

const ShiftSummarySchema = new Schema<IShiftSummaryDocument>(
  {
    shiftId: {
      type: Schema.Types.ObjectId,
      ref: 'Shift',
      required: true,
      unique: true
    },
    generatedAt: {
      type: Date,
      default: Date.now,
      required: true
    },
    generatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    soldDishes: {
      type: [
        {
          dishId: { type: Schema.Types.ObjectId, ref: 'Dish', required: true },
          dishName: { type: String, required: true },
          quantity: { type: Number, required: true },
          amountCents: { type: Number, required: true }
        }
      ],
      default: []
    },
    remainingRations: {
      type: [
        {
          dishId: { type: Schema.Types.ObjectId, ref: 'Dish', required: true },
          dishName: { type: String, required: true },
          remainingRations: { type: Number, required: true }
        }
      ],
      default: []
    },
    soldOutDishes: {
      type: [
        {
          dishId: { type: Schema.Types.ObjectId, ref: 'Dish', required: true },
          dishName: { type: String, required: true },
          reason: { type: String, required: true }
        }
      ],
      default: []
    },
    cancellations: {
      type: [
        {
          orderNumber: { type: Number, required: true },
          reason: { type: String, required: true },
          cancelledBy: { type: String, required: true }
        }
      ],
      default: []
    },
    manualRecords: {
      type: [
        {
          id: { type: String },
          tableCode: { type: String, required: true },
          items: [
            {
              name: { type: String, required: true },
              quantity: { type: Number, required: true },
              amountCents: { type: Number, required: true }
            }
          ],
          totalCents: { type: Number, required: true },
          notes: { type: String, default: '' },
          source: { type: String, default: 'PAPER' },
          createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
          createdAt: { type: Date }
        }
      ],
      default: []
    },
    manualTotalCents: {
      type: Number,
      required: true,
      default: 0
    },
    totalAmountCents: {
      type: Number,
      required: true,
      default: 0
    },
    observations: {
      type: String,
      default: ''
    },
    closedAt: {
      type: Date,
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

// shiftId único según data-model.md §3.13
// El índice único se define en el campo shiftId

export const ShiftSummary: Model<IShiftSummaryDocument> =
  mongoose.models.ShiftSummary ||
  mongoose.model<IShiftSummaryDocument>('ShiftSummary', ShiftSummarySchema);

export default ShiftSummary;
